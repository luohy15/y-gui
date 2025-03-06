import { Chat } from '../../../shared/types';
import { KVStorageRepository } from '../repository/KVStorageRepository';
import { corsHeaders } from '../middleware/cors';
import { validateAuth } from '../utils/auth';

interface Env {
  CHAT_KV: KVNamespace;
  CHAT_R2: R2Bucket;
  SECRET_KEY: string;
}

export async function handleChatsRequest(request: Request, env: Env): Promise<Response> {
  // Validate authentication for all chat endpoints
  const isAuthenticated = await validateAuth(request, env.SECRET_KEY);
  if (!isAuthenticated) {
    return new Response('Unauthorized', { 
      status: 401,
      headers: corsHeaders
    });
  }

  const storage = new KVStorageRepository(env.CHAT_KV, env.CHAT_R2);
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // List chats
    if (path === '/api/chats' && request.method === 'GET') {
      const searchParams = new URL(request.url).searchParams;
      const options = {
        search: searchParams.get('search') || undefined,
        page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
      };
      
      const result = await storage.listChats(options);
      return new Response(JSON.stringify(result), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Get single chat
    if (path.startsWith('/api/chats/') && request.method === 'GET') {
      const id = path.split('/').pop();
      if (!id) {
        return new Response('Invalid chat ID', { 
          status: 400,
          headers: corsHeaders
        });
      }

      const chat = await storage.getChat(id);
      if (!chat) {
        return new Response('Chat not found', { 
          status: 404,
          headers: corsHeaders
        });
      }

      return new Response(JSON.stringify(chat), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Create chat
    if (path === '/api/chats' && request.method === 'POST') {
      const chatData = await request.json() as Chat;
      await storage.saveChat(chatData);
      return new Response(JSON.stringify(chatData), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Delete chat
    if (path.startsWith('/api/chats/') && request.method === 'DELETE') {
      const id = path.split('/').pop();
      if (!id) {
        return new Response('Invalid chat ID', { 
          status: 400,
          headers: corsHeaders
        });
      }

      await storage.deleteChat(id);
      return new Response(null, { 
        status: 204,
        headers: corsHeaders
      });
    }

    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error handling chats request:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
