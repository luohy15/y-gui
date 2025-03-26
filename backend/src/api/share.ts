import { Chat } from '../../../shared/types';
import { ChatKVR2Repository } from '../repository/chat-kv-r2-repository';
import { corsHeaders } from '../middleware/cors';
import { v4 as uuidv4 } from 'uuid';
import { Env } from 'worker-configuration';

// Function to generate MD5 hash of chat messages
async function generateChatContentHash(chat: Chat): Promise<string> {
  // Only hash the messages array as per requirements
  const messagesString = JSON.stringify(chat.messages);
  
  // Use Web Crypto API to generate MD5 hash
  const msgUint8 = new TextEncoder().encode(messagesString);
  const hashBuffer = await crypto.subtle.digest('MD5', msgUint8);
  
  // Convert hash to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

export async function handleShareRequest(request: Request, env: Env, userPrefix?: string): Promise<Response> {
  const chatRepository = new ChatKVR2Repository(env.CHAT_KV, env.CHAT_R2, userPrefix);
  const publicChatRepository = new ChatKVR2Repository(env.CHAT_KV, env.CHAT_R2);
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

      // Get the chat
      const chat = await chatRepository.getChat(chatId);
      if (!chat) {
        return new Response('Chat not found', { 
          status: 404,
          headers: corsHeaders
        });
      }

      // Generate MD5 hash of the current chat content
      const current_content_hash = await generateChatContentHash(chat);
      
      // Check if this chat has been shared before and the content hasn't changed
      if (chat.content_hash === current_content_hash && chat.share_id) {
        // Content hasn't changed, return the existing share ID
        return new Response(JSON.stringify({ shareId: chat.share_id }), {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Content has changed or hasn't been shared before, generate a new share ID
      const share_id = uuidv4().substring(0, 8);
      
      // Store the hash and share_id in the original chat
      chat.content_hash = current_content_hash;
      chat.share_id = share_id;
      
      // Save the updated original chat with hash and share_id
      await chatRepository.saveChat(chat);
      
      // Create a copy for public sharing
      const sharedChat = { ...chat };
      sharedChat.id = share_id; // Update the chat ID to the share ID
      
      // Save the shared chat copy
      await publicChatRepository.saveChat(sharedChat);
      
      return new Response(JSON.stringify({ shareId: share_id }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Get a shared chat (public endpoint, no authentication required)
    if (path.startsWith('/api/share/')  && request.method === 'GET') {
      const share_id = path.split('/').pop();
      if (!share_id) {
        return new Response('Invalid share ID', { 
          status: 400,
          headers: corsHeaders
        });
      }

      // Find the chat with the matching share_id
      const chat = await publicChatRepository.getChat(share_id);
      
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
