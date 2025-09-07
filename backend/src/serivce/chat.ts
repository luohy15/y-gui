import { BotConfig, Chat, ChatRepository, Message } from '../../../shared/types';
import { McpManager } from '../mcp/mcp-manager';
import { BaseProvider } from 'src/providers/provider-interface';
import { getSystemPrompt } from '../utils/system-prompt';
import { createMessage, extractContentText } from '../utils/message';
import { containsToolUse, splitContent, extractMcpToolUse } from '../utils/tool-parser';
import { buildMessagePath } from '../utils/chat';

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
    this.systemPrompt = await getSystemPrompt(this.mcpManager, writer);
  }


  /**
   * Handle error cases by creating an error response and assistant error message
   * @param error The error object or message
   * @param userMessage The user message that triggered the error
   * @param writer The writer to send the error response to
   * @param customMessage Optional custom error message
   */
  private async handleError(
    error: unknown, 
    userMessage: Message, 
    writer: WritableStreamDefaultWriter,
    customMessage?: string
  ) {
    const encoder = new TextEncoder();
    
    // Get error message and details
    const errorMessage = customMessage || (error instanceof Error ? error.message : 'An unknown error occurred');
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
    
    // Create error assistant message
    const assistantErrorMessage: Message = createMessage('assistant', errorContent, {
      model: 'error',
      provider: 'system',
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      parent_id: userMessage.id
    });
    
    // Add the error message to chat
    this.chat.messages.push(assistantErrorMessage);
    
    // Set this error message as the selected message
    if (assistantErrorMessage.id) {
      this.chat.selected_message_id = assistantErrorMessage.id;
    }
    
    // Save the chat with the error
    await this.storage.saveChat(this.chat);
    
    // Write error to response stream
    await writer.write(encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
  }

  async processUserMessage(userMessage: Message, writer: WritableStreamDefaultWriter, userMessageId?: string) {
    const encoder = new TextEncoder();
    try {
      let messagesToUse: Message[];
      
      if (userMessageId) {
        messagesToUse = buildMessagePath(this.chat.messages, userMessageId);
      } else {
        // Set parent_id based on currently selected message
        if (this.chat.selected_message_id) {
          userMessage.parent_id = this.chat.selected_message_id;
        }
        
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
        await this.handleError(
          { type: 'empty_response', status: 500 },
          userMessage,
          writer,
          'No response content received from provider'
        );
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
      await this.handleError(error, userMessage, writer);
    } 
    // No longer closing the writer here - letting the caller handle it
  }

  async processAssistantMessage(assistantMessage: Message, writer: WritableStreamDefaultWriter) {
    const content = extractContentText(assistantMessage.content);

    if (!containsToolUse(content)) {
      this.chat.messages.push(assistantMessage);
      
      // Set this message as the selected message
      if (assistantMessage.id) {
        this.chat.selected_message_id = assistantMessage.id;
      }
      
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
    
    // Set this message as the selected message
    if (assistantMessage.id) {
      this.chat.selected_message_id = assistantMessage.id;
    }
  }
}
