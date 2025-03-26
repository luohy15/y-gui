import { BotConfig, Chat, Message } from '../../../shared/types';
import { ChatKVR2Repository } from '../repository/chat-kv-r2-repository';
import { McpManager } from '../mcp/mcp-manager';
import { BaseProvider } from 'src/providers/provider-interface';
import { getSystemPrompt } from '../utils/system-prompt';
import { createMessage, extractContentText } from '../utils/message';
import { containsToolUse, splitContent, extractMcpToolUse } from '../utils/tool-parser';

export class ChatService {
  private chat: Chat;
  private systemPrompt: string;

  constructor(
    private storage: ChatKVR2Repository,
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
    await this.mcpManager.initMcpServersForBot(this.botConfig, writer);
    this.systemPrompt = await getSystemPrompt(this.mcpManager, writer);
  }

  async processUserMessage(userMessage: Message, writer: WritableStreamDefaultWriter) {
    const encoder = new TextEncoder();
    try {
      this.chat.messages.push(userMessage);
      const providerResponseGenerator = await this.provider.callChatCompletions(this.chat, this.systemPrompt);
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

      const assistantMessage: Message = createMessage('assistant', accumulatedContent, { model, provider });
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
    assistantMessage.content = plainContent;

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
