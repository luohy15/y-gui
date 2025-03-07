import { corsHeaders } from '../middleware/cors';
import { validateAuth } from '../utils/auth';
import { ConfigR2Repository } from '../repository/config-r2-repository';

interface Env {
  CHAT_R2: R2Bucket;
  SECRET_KEY: string;
}

export async function handleConfigRequest(request: Request, env: Env): Promise<Response> {
  // Validate authentication
  const isAuthenticated = await validateAuth(request, env.SECRET_KEY);
  if (!isAuthenticated) {
    return new Response('Unauthorized', { 
      status: 401,
      headers: corsHeaders
    });
  }

  const configRepo = new ConfigR2Repository(env.CHAT_R2);
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // Get bot configurations
    if (path === '/api/config/bots' && request.method === 'GET') {
      const bots = await configRepo.getBots();
      return new Response(JSON.stringify(bots), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Get MCP server configurations
    if (path === '/api/config/mcp-servers' && request.method === 'GET') {
      const mcpServers = await configRepo.getMcpServers();
      return new Response(JSON.stringify(mcpServers), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error handling config request:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
