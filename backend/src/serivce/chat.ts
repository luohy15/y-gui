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

  async initializeChat() {
    this.chat = await this.storage.getOrCreateChat(this.chatId);
    await this.mcpManager.initMcpServersForBot(this.botConfig);
    this.systemPrompt = await getSystemPrompt(this.mcpManager);
  }

  async processUserMessage(userMessage: Message, writer: WritableStreamDefaultWriter) {
    const encoder = new TextEncoder();
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