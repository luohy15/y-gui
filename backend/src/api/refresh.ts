import { Chat, Message } from '../../../shared/types';
import { ChatR2Repository } from '../repository/chat-repository';
import { BotR2Repository } from '../repository/bot-r2-repository';
import { corsHeaders } from '../middleware/cors';
import { ProviderFactory } from '../providers/provider-factory';
import { McpManager } from '../mcp/mcp-manager';
import { ChatService } from '../serivce/chat';
import { createMessage } from '../utils/message';
import { McpServerR2Repository } from '../repository/mcp-server-repository';
import { IntegrationR2Repository } from '../repository/integration-r2-repository';
import { Env } from '../worker-configuration';

/**
 * Handle the refresh endpoint
 * This function generates a new response for an existing user message
 */
export async function handleRefresh(request: Request, env: Env, userPrefix?: string): Promise<Response> {
  interface RefreshRequest {
    userMessageId: string;
    botName: string;
    chatId: string;
    server?: string;
  }
  const refreshData = await request.json() as RefreshRequest;
  const { userMessageId, botName, chatId } = refreshData;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    try {
      console.log('User prefix:', userPrefix);
      const chatRepository = new ChatR2Repository(env.CHAT_R2, userPrefix);
      const chat = await chatRepository.getChat(chatId);
      
      if (!chat) {
        await writer.write(encoder.encode(`data: {"error": "Chat not found"}\n\n`));
        await writer.close();
        return;
      }

      const userMessage = chat.messages.find(msg => msg.id === userMessageId && msg.role === 'user');
      if (!userMessage) {
        await writer.write(encoder.encode(`data: {"error": "User message not found"}\n\n`));
        await writer.close();
        return;
      }

      const botRepository = new BotR2Repository(env.CHAT_R2, userPrefix);
      const mcpServerRepository = new McpServerR2Repository(env.CHAT_R2, env, userPrefix);
      const integrationRepository = new IntegrationR2Repository(env.CHAT_R2, userPrefix);
      const bots = await botRepository.getBots();
      const botConfig = bots.find(bot => bot.name === botName);
      if (!botConfig) {
        await writer.write(encoder.encode(`data: {"error": "Bot not found"}\n\n`));
        await writer.close();
        return;
      }
      
      let resultBotConfig = botConfig;
      if (!resultBotConfig.api_key || !resultBotConfig.base_url) {
        resultBotConfig.api_key = env.OPENROUTER_FREE_KEY;
        resultBotConfig.base_url = env.OPENROUTER_BASE_URL;
      }

      const provider = ProviderFactory.createProvider(resultBotConfig);

      const mcpManager = new McpManager(mcpServerRepository, integrationRepository);

      const tempChat: Chat = {
        ...chat,
        messages: chat.messages.filter(msg => {
          const msgTimestamp = msg.unix_timestamp;
          const userMsgTimestamp = userMessage.unix_timestamp;
          return msgTimestamp <= userMsgTimestamp;
        })
      };

      const chatService = new ChatService(chatRepository, provider, mcpManager, chatId, resultBotConfig);
      await chatService.initializeChat(writer);

      await chatService.processUserMessage(userMessage, writer);
      
      await writer.write(encoder.encode(`data: [DONE]\n\n`));
      await writer.close();
    } catch (error: unknown) {
      console.error('Error processing refresh:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      await writer.write(encoder.encode(`data: {"error": "${errorMessage}"}\n\n`));
      await writer.close();
    }
  })();
  
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...corsHeaders
    }
  });
}
