import { corsHeaders } from '../middleware/cors';
import { McpManager } from '../mcp/mcp-manager';
import { BotR2Repository } from '../repository/bot-r2-repository';
import { McpServerR2Repository } from 'src/repository/mcp-server-repository';
import { IntegrationR2Repository } from '../repository/integration-r2-repository';
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
      const mcpServerRepository = new McpServerR2Repository(env.CHAT_R2, env, userPrefix);
      const integrationRepository = new IntegrationR2Repository(env.CHAT_R2, userPrefix);
      const mcpManager = new McpManager(mcpServerRepository, integrationRepository);
      
      // Get the bot config
      const botRepository = new BotR2Repository(env.CHAT_R2, userPrefix);
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
