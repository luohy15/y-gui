import { handleCors } from './middleware/cors';
import { handleAuthRequest } from './api/auth';
import { handleChatsRequest } from './api/chats';

interface Env {
  CHAT_KV: KVNamespace;
  CHAT_R2: R2Bucket;
  SECRET_KEY: string;
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

        // Handle chat endpoints
        if (path.startsWith('/api/chats')) {
          return handleChatsRequest(request, env);
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
