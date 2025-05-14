import { corsHeaders } from '../middleware/cors';
import { McpManager } from '../mcp/mcp-manager';
import { BotD1Repository } from '../repository/d1/bot-d1-repository';
import { McpServerD1Repository } from 'src/repository/d1/mcp-server-d1-repository';
import { IntegrationD1Repository } from '../repository/d1/integration-d1-repository';
import { Message } from '../../../shared/types';
import { createMessage } from 'src/utils/message';
import { Env } from 'worker-configuration';

/**
 * Handle tool execution confirmation
 * This endpoint allows clients to confirm or cancel tool execution
 * and directly executes the tool if confirmed
 */
export async function handleToolConfirmation(request: Request, env: Env, userPrefix?: string): Promise<Response> {
  // Parse request body
  interface ConfirmationRequest {
    botName: string;
    server: string;
    tool: string;
    args: any;
  }
  
  const confirmationData = await request.json() as ConfirmationRequest;
  const { botName, server, tool, args } = confirmationData;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  
  (async () => {
    try {
      // Initialize repositories and MCP manager
      const mcpServerRepository = new McpServerD1Repository(env.CHAT_DB, env, userPrefix);
      const integrationRepository = new IntegrationD1Repository(env.CHAT_DB, userPrefix);
      const mcpManager = new McpManager(mcpServerRepository, integrationRepository);
      
      // Get the bot config
      const botRepository = new BotD1Repository(env.CHAT_DB, env, userPrefix);
      const bots = await botRepository.getBots();
      const botConfig = bots.find(bot => bot.name === botName);
      if (!botConfig) {
        return new Response('Bot not found', { status: 404, headers: corsHeaders });
      }

      // Execute the tool directly
      // We've already checked that server, tool, and args are not undefined
      const toolResult = await mcpManager.executeTool(
        server as string,
        tool as string,
        args
      );

      // Create a new user message with the tool result
      const userMessage: Message = createMessage('user', toolResult, {server, tool, arguments: args});

      await writer.write(encoder.encode(`data: ${JSON.stringify(userMessage)}\n\n`));
      
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
