import { corsHeaders } from '../middleware/cors';
import { validateAuth } from '../utils/auth';
import { McpManager } from '../mcp/mcp-manager';
import { ConfigR2Repository } from '../repository/config-r2-repository';
import { Message } from '../../../shared/types';
import { createMessage } from 'src/utils/message';
import { ProviderFactory } from '../providers/provider-factory';
import { ChatKVR2Repository } from '../repository/chat-kv-r2-repository';
import { ChatService } from '../serivce/chat';

interface Env {
  CHAT_KV: KVNamespace;
  CHAT_R2: R2Bucket;
  SECRET_KEY: string;
}

/**
 * Handle tool execution confirmation
 * This endpoint allows clients to confirm or cancel tool execution
 * and directly executes the tool if confirmed
 */
export async function handleToolConfirmation(request: Request, env: Env): Promise<Response> {
  // Parse request body
  interface ConfirmationRequest {
    chatId: string;
    botName: string;
    server: string;
    tool: string;
    args: any;
  }
  
  const confirmationData = await request.json() as ConfirmationRequest;
  const { chatId, botName, server, tool, args } = confirmationData;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  
  (async () => {
    try {
      // Initialize repositories and MCP manager
      const configRepo = new ConfigR2Repository(env.CHAT_R2);
      const mcpManager = new McpManager(configRepo);
      
      // Get or create the chat
      const storage = new ChatKVR2Repository(env.CHAT_KV, env.CHAT_R2);

      // Get the bot config
      const configStorage = new ConfigR2Repository(env.CHAT_R2);
      const bots = await configStorage.getBots();
      const botConfig = bots.find(bot => bot.name === botName);
      if (!botConfig) {
        return new Response('Bot not found', { status: 404, headers: corsHeaders });
      }

      const provider = ProviderFactory.createProvider(botConfig);

      // Create the chat service
      const chatService = new ChatService(storage, provider, mcpManager, chatId, botConfig);

      // Execute the tool directly
      // We've already checked that server, tool, and args are not undefined
      const toolResult = await mcpManager.executeTool(
        server as string,
        tool as string,
        args
      );

      // Create a new user message with the tool result
      const userMessage: Message = createMessage('user', toolResult);
      userMessage.tool = tool;
      userMessage.server = server;
      userMessage.arguments = args;

      await writer.write(encoder.encode(`data: ${JSON.stringify(userMessage)}\n\n`));
      
      await chatService.initializeChat();

      // Process the user message
      await chatService.processUserMessage(userMessage, writer);
      
      // Close the writer
      await writer.write(encoder.encode(`data: [DONE]\n\n`));
      await writer.close();
    } catch (error) {
      console.error('Error processing stream:', error);
      writer.abort(error);
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