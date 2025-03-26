import { Chat, Message } from '../../../shared/types';
import { ChatKVR2Repository } from '../repository/chat-kv-r2-repository';
import { BotR2Repository } from '../repository/bot-r2-repository';
import { corsHeaders } from '../middleware/cors';
import { ProviderFactory } from '../providers/provider-factory';
import { McpManager } from '../mcp/mcp-manager';
import { ChatService } from '../serivce/chat';
import { createMessage } from 'src/utils/message';
import { McpServerR2Repository } from 'src/repository/mcp-server-repository';

interface Env {
  CHAT_KV: KVNamespace;
  CHAT_R2: R2Bucket;
  OPENROUTER_BASE_URL: string;
  OPENROUTER_FREE_KEY: string;
}

/**
 * Handle the chat completions endpoint
 * This function processes requests to send messages to a chat and get AI responses
 */
export async function handleChatCompletions(request: Request, env: Env, userPrefix?: string): Promise<Response> {
  // Get message data from request
  interface CompletionRequest {
    content: string;
    botName: string;
    chatId: string;
    server?: string;
  }
  const completionData = await request.json() as CompletionRequest;
  const { content, botName, chatId } = completionData;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    try {
      console.log('User prefix:', userPrefix);
      // Get or create the chat
      const chatRepository = new ChatKVR2Repository(env.CHAT_KV, env.CHAT_R2, userPrefix);

      // Get the bot config
      const botRepository = new BotR2Repository(env.CHAT_R2, userPrefix);
      const mcpServerRepository = new McpServerR2Repository(env.CHAT_R2, userPrefix);
      const bots = await botRepository.getBots();
      const botConfig = bots.find(bot => bot.name === botName);
      if (!botConfig) {
        return new Response('Bot not found', { status: 404, headers: corsHeaders });
      }
      let resultBotConfig = botConfig;
      if (!resultBotConfig.api_key || !resultBotConfig.base_url) {
        resultBotConfig.api_key = env.OPENROUTER_FREE_KEY;
        resultBotConfig.base_url = env.OPENROUTER_BASE_URL;
      }
      console.log('Bot config:', resultBotConfig);

      // Get the provider
      const provider = ProviderFactory.createProvider(resultBotConfig);

      // Get the MCP manager
      const mcpManager = new McpManager(mcpServerRepository);

      // Create the chat service
      const chatService = new ChatService(chatRepository, provider, mcpManager, chatId, resultBotConfig);

      await chatService.initializeChat();

      // Create the user message
      const userMessage: Message = createMessage('user', content, { server: completionData.server });

      // Process the user message
      await chatService.processUserMessage(userMessage, writer);
      
      // Close the writer
      await writer.write(encoder.encode(`data: [DONE]\n\n`));
      await writer.close();
    } catch (error: unknown) {
      console.error('Error processing stream:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      await writer.write(encoder.encode(`data: {"error": "${errorMessage}"}\n\n`));
      await writer.close();
    }
  })();
  
  // Return the streaming response
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...corsHeaders
    }
  });
}
