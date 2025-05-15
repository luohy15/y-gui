import { ChatD1Repository } from '../repository/d1/chat-d1-repository';
import { corsHeaders } from '../middleware/cors';
import { Env } from 'worker-configuration';
import { ShareService } from '../serivce/share';

interface ShareRequestBody {
  messageId?: string;
}

export async function handleShareRequest(request: Request, env: Env, userPrefix?: string): Promise<Response> {
  const chatRepository = new ChatD1Repository(env.CHAT_DB, userPrefix);
  const publicChatRepository = new ChatD1Repository(env.CHAT_DB);
  const shareService = new ShareService(chatRepository, publicChatRepository);
  
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // Create a share for a chat
    if (path.startsWith('/api/share/') && request.method === 'POST') {
      const chatId = path.split('/').pop(); // Extract chat ID from path
      if (!chatId) {
        return new Response('Invalid chat ID', { 
          status: 400,
          headers: corsHeaders
        });
      }

      // Parse request body to get messageId if provided
      let requestBody: ShareRequestBody = {};
      try {
        if (request.body) {
          requestBody = await request.json() as ShareRequestBody;
        }
      } catch (e) {
        console.error('Failed to parse request body:', e);
        // Continue even if body parsing fails
      }

      try {
        // Use ShareService to create a shared chat
        const shareId = await shareService.createShare(chatId, requestBody.messageId);
        
        return new Response(JSON.stringify({ shareId }), {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      } catch (error: any) {
        console.error('Error creating share:', error);
        return new Response(error.message || 'Failed to create share', { 
          status: 404,
          headers: corsHeaders
        });
      }
    }
    
    // Get a shared chat (public endpoint, no authentication required)
    if (path.startsWith('/api/share/')  && request.method === 'GET') {
      const shareId = path.split('/').pop();
      if (!shareId) {
        return new Response('Invalid share ID', { 
          status: 400,
          headers: corsHeaders
        });
      }

      // Use ShareService to get a shared chat
      const chat = await shareService.getSharedChat(shareId);
      
      if (!chat) {
        return new Response('Shared chat not found', { 
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
    
    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error handling share request:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
