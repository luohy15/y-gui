import { BotConfig, Chat, ChatRepository, Message } from '../../../shared/types';
import { McpManager } from '../mcp/mcp-manager';
import { BaseProvider } from 'src/providers/provider-interface';
import { getSystemPrompt } from '../utils/system-prompt';
import { createMessage, extractContentText } from '../utils/message';
import { containsToolUse, splitContent, extractMcpToolUse } from '../utils/tool-parser';

export class ChatService {
  private chat: Chat;
  private systemPrompt: string;

  constructor(
    private storage: ChatRepository,
    private provider: BaseProvider,
    private mcpManager: McpManager,
    private chatId: string,
    private botConfig: BotConfig,
  ) {
    this.chat = {} as Chat;
    this.systemPrompt = '';
  }

  async initializeChat(writer?: WritableStreamDefaultWriter) {
    this.chat = await this.storage.getOrCreateChat(this.chatId);
    this.systemPrompt = await getSystemPrompt(this.mcpManager, this.botConfig.mcp_servers, writer);
  }

  /**
   * Build a message path by traversing parent_id relationships
   * @param userMessageId ID of the user message to start from
   * @returns Array of messages forming the conversation path
   */
  private buildMessagePath(userMessageId: string): Message[] {
    const messagePath: Message[] = [];
    
    const userMessage = this.chat.messages.find(msg => msg.id === userMessageId);
    if (!userMessage) return messagePath;
    
    // Add the user message to the path
    messagePath.push(userMessage);
    
    const messagesById = new Map<string, Message>();
    this.chat.messages.forEach(msg => {
      if (msg.id) {
        messagesById.set(msg.id, msg);
      }
    });
    
    let currentId = userMessage.parent_id;
    while (currentId) {
      const parentMessage = messagesById.get(currentId);
      if (!parentMessage) break;
      
      // Add the parent message to the beginning of the path
      messagePath.unshift(parentMessage);
      
      currentId = parentMessage.parent_id;
    }
    
    return messagePath;
  }

  async processUserMessage(userMessage: Message, writer: WritableStreamDefaultWriter, userMessageId?: string) {
    const encoder = new TextEncoder();
    try {
      let messagesToUse: Message[];
      
      if (userMessageId) {
        messagesToUse = this.buildMessagePath(userMessageId);
        // Add the current user message to the path if it's not already included
        if (!messagesToUse.includes(userMessage)) {
          messagesToUse.push(userMessage);
        }
      } else {
        // Add the user message to the chat
        this.chat.messages.push(userMessage);
        messagesToUse = [...this.chat.messages];
      }
      
      const providerResponseGenerator = await this.provider.callChatCompletions(messagesToUse, this.systemPrompt);
      let accumulatedContent = '';
      let model = '';
      let provider = '';
      
      for await (const chunk of providerResponseGenerator) {
        accumulatedContent += chunk.content;
        const responseChunk = {
          choices: [{
            delta: {
              content: chunk.content,
            }
          }],
          model: chunk.model,
          provider: chunk.provider
        };
        if (chunk.model) {
          model = chunk.model;
        }
        if (chunk.provider) {
          provider = chunk.provider;
        }
        await writer.write(encoder.encode(`data: ${JSON.stringify(responseChunk)}\n\n`));
      }

      // Check if any content was received before proceeding
      if (!accumulatedContent.trim()) {
        const errorResponse = {
          error: {
            message: 'No response content received from provider',
            type: 'empty_response',
            status: 500
          }
        };
        await writer.write(encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
        
        // Create error assistant message
        const errorContent = `Error: No response content received from provider`;
        const assistantErrorMessage: Message = createMessage('assistant', errorContent, {
          model: 'error',
          provider: 'system'
        });
        this.chat.messages.push(assistantErrorMessage);
        await this.storage.saveChat(this.chat);
        return;
      }

      const assistantMessage: Message = createMessage('assistant', accumulatedContent, { 
        model, 
        provider,
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        parent_id: userMessage.id
      });
      await this.processAssistantMessage(assistantMessage, writer);
      await this.storage.saveChat(this.chat);
    } catch (error: unknown) {
      console.error('Error in processUserMessage:', error);
      
      // Get error message
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      const errorType = (error as any)?.type || 'unknown_error';
      const errorStatus = (error as any)?.status || 500;
      
      // Format error response
      const errorResponse = {
        error: {
          message: errorMessage,
          type: errorType,
          status: errorStatus
        }
      };
      
      // Create error content string
      const errorContent = `Error: ${errorMessage}`;
      
      // Create error assistant message with standard metadata
      // Using only properties that are known to be supported
      const assistantErrorMessage: Message = createMessage('assistant', errorContent, {
        // Store error details in the message metadata if they need to be preserved
        model: 'error',
        provider: 'system'
      });
      
      // Add the error message to chat
      this.chat.messages.push(assistantErrorMessage);
      
      // Save the chat with the error
      await this.storage.saveChat(this.chat);
      
      // Write error to response stream
      await writer.write(encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
    } 
    // No longer closing the writer here - letting the caller handle it
  }

  async processAssistantMessage(assistantMessage: Message, writer: WritableStreamDefaultWriter) {
    const content = extractContentText(assistantMessage.content);

    if (!containsToolUse(content)) {
      this.chat.messages.push(assistantMessage);
      return;
    }

    // Split content into plain text and tool parts
    const [plainContent, toolContent] = splitContent(content);

    // Update the assistant message with only the plain text part
    // If plainContent is blank, use default text
    assistantMessage.content = plainContent.trim() ? plainContent : "I'll execute this operation for you.";

    // Reuse the existing mcpManager instance for tool execution
    const mcpTool = extractMcpToolUse(toolContent!);

    if (mcpTool) {
      const [serverName, toolName, args] = mcpTool;
      // Update the assistant message with the tool info
      assistantMessage.server = serverName;
      assistantMessage.tool = toolName;
      assistantMessage.arguments = args;

      const confirmationRequest = {
        plainContent: plainContent,
        server: serverName,
        tool: toolName,
        arguments: args
      };
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(`data: ${JSON.stringify(confirmationRequest)}\n\n`));
    }

    // Add assistant message to chat
    this.chat.messages.push(assistantMessage);
  }
}
