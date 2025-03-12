import { handleCors } from './middleware/cors';
import { handleAuthRequest } from './api/auth';
import { handleChatsRequest } from './api/chat';
import { handleConfigRequest } from './api/config';
import { handleToolConfirmation } from './api/tool';
import { validateAuth, extractUserInfo } from './utils/auth';
import { corsHeaders } from './middleware/cors';

interface Env {
  CHAT_KV: KVNamespace;
  CHAT_R2: R2Bucket;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
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

      // Handle API routes
      if (path.startsWith('/api/')) {
        // Handle auth endpoints
        if (path.startsWith('/api/auth/')) {
          return handleAuthRequest(request, env);
        }

        const isAuthenticated = await validateAuth(request);
        if (!isAuthenticated) {
          return new Response('Unauthorized', {
            status: 401,
            headers: corsHeaders
          });
        }

        // Extract user email from Auth0 token
        let userEmail: string | undefined;
        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
          try {
            const token = authHeader.slice(7);
            const userInfo = extractUserInfo(token);
            userEmail = userInfo.email;
            console.log('User email extracted:', userEmail);
          } catch (error) {
            console.error('Error extracting user email:', error);
          }
        }

        // Add user email to request object for API handlers
        const requestWithUser = new Request(request);
        // @ts-ignore - Adding custom property to Request
        requestWithUser.userEmail = userEmail;

        // Handle chat endpoints
        if (path.startsWith('/api/chats') || path.startsWith('/api/chat/')) {
          return handleChatsRequest(requestWithUser, env);
        }

        // Handle config endpoints
        if (path.startsWith('/api/config')) {
          return handleConfigRequest(requestWithUser, env);
        }

        // Handle tool confirmation endpoint
        if (path === '/api/tool/confirm' && request.method === 'POST') {
          return handleToolConfirmation(requestWithUser, env);
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
