import { Chat } from '../../../shared/types';
import { ChatKVR2Repository } from '../repository/chat-kv-r2-repository';
import { corsHeaders } from '../middleware/cors';
import { handleChatCompletions } from './chat-completions';
import { v4 as uuidv4 } from 'uuid';
import { Env } from 'worker-configuration';

export async function handleChatsRequest(request: Request, env: Env, userPrefix?: string): Promise<Response> {
  const chatRepository = new ChatKVR2Repository(env.CHAT_KV, env.CHAT_R2, userPrefix);
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
      
      const result = await chatRepository.listChats(options);
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

      const chat = await chatRepository.getOrCreateChat(id);

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
      const resultChat = await chatRepository.saveChat(chatData);
      return new Response(JSON.stringify(resultChat), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Get a new unique chat ID
    if (path === '/api/chat/id' && request.method === 'GET') {
      // Generate a new ID
      let newId = '';
      let exists = true;
      
      // Keep generating IDs until we find one that doesn't exist
      while (exists) {
        newId = Array.from(crypto.getRandomValues(new Uint8Array(3)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .substring(0, 6);
        
        // Check if this ID already exists
        const chat = await chatRepository.getChat(newId);
        exists = chat !== null;
      }
      
      return new Response(JSON.stringify({ id: newId }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Send message to chat (completions endpoint)
    if (path === '/api/chat/completions' && request.method === 'POST') {
      return handleChatCompletions(request, env, userPrefix);
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
