import { handleCors } from './middleware/cors';
import { handleChatsRequest } from './api/chat';
import { handleToolConfirmation } from './api/tool';
import { handleBotRequest } from './api/bot';
import { handleMcpServerRequest } from './api/mcp-server';
import { handleApiDocs } from './openapi';
import { handleShareRequest } from './api/share';
import { validateAuth, extractUserInfo, UserInfo } from './utils/auth';
import { corsHeaders } from './middleware/cors';
import { calculateUserPrefix } from './utils/user';

interface Env {
  CHAT_KV: KVNamespace;
  CHAT_R2: R2Bucket;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  OPENROUTER_BASE_URL: string;
  OPENROUTER_FREE_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleCors(request) as Response;
    }

    try {
      console.log('Handling request:', request.method, path);
      
      if (path.startsWith('/api/share/') && request.method === 'GET') {
        return handleShareRequest(request, env);
      }

      // Handle API routes
      if (path.startsWith('/api/')) {
        const isAuthenticated = await validateAuth(request);
        if (!isAuthenticated) {
          return new Response('Unauthorized', {
            status: 401,
            headers: corsHeaders
          });
        }

        // Extract user email from Auth0 token
        let userInfo: UserInfo = { sub: '', email: '', picture: '', name: '' };
        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
          try {
            const token = authHeader.slice(7);
            userInfo = extractUserInfo(token);
          } catch (error) {
            console.error('Error extracting user info:', error);
          }
        }

        const userPrefix = await calculateUserPrefix(userInfo.email);

        // Handle API documentation routes and public share routes - no authentication required
        if (path.startsWith('/api/docs')) {
          return handleApiDocs(request);
        }
        
        if (path.startsWith('/api/share/')) {
          return handleShareRequest(request, env, userPrefix);
        }

        // Handle userinfo endpoints
        if (url.pathname === '/api/auth/userinfo' && request.method === 'GET') {
          return new Response(JSON.stringify({
            ...userInfo,
            userPrefix
          }), {
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        // Handle chat endpoints
        if (path.startsWith('/api/chats') || path.startsWith('/api/chat/')) {
          return handleChatsRequest(request, env, userPrefix);
        }

        // Handle tool confirmation endpoint
        if (path === '/api/tool/confirm' && request.method === 'POST') {
          return handleToolConfirmation(request, env, userPrefix);
        }

        // Handle bot endpoints
        if (path.startsWith('/api/bot')) {
          return handleBotRequest(request, env, userPrefix);
        }
        
        // Handle MCP server endpoints
        if (path.startsWith('/api/mcp-server')) {
          return handleMcpServerRequest(request, env, userPrefix);
        }

        return new Response('Not Found', {
          status: 404,
          headers: handleCors(request) as Headers
        });
      }

      // For non-API routes, serve static assets using ASSETS binding
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error('Error handling request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
      return new Response(errorMessage, {
        status: 500,
        headers: handleCors(request) as Headers
      });
    }
  }
};
