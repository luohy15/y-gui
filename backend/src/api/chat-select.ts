import { Chat } from '../../../shared/types';
import { ChatR2Repository } from '../repository/chat-repository';
import { corsHeaders } from '../middleware/cors';
import { Env } from 'worker-configuration';

/**
 * Finds the leaf node by traversing down from a message ID
 * A leaf node is a message that has no children
 */
function findLeafMessageId(chat: Chat, messageId: string): string {
  // Start with the provided message ID
  let currentId = messageId;
  
  while (true) {
    // Find all children of the current message
    const childMessages = chat.messages.filter(msg => msg.parent_id === currentId);
    
    // If no children found, we've reached a leaf node
    if (childMessages.length === 0) {
      return currentId;
    }
    
    // If multiple children, find the most recent one by timestamp
    if (childMessages.length > 1) {
      let mostRecentChild = childMessages[0];
      
      childMessages.forEach(childMsg => {
        if (childMsg.unix_timestamp > mostRecentChild.unix_timestamp) {
          mostRecentChild = childMsg;
        }
      });
      
      currentId = mostRecentChild.id!;
    } else {
      // Only one child, continue with it
      currentId = childMessages[0].id!;
    }
  }
}

export async function handleSelectResponse(request: Request, env: Env, userPrefix?: string): Promise<Response> {
  const chatRepository = new ChatR2Repository(env.CHAT_R2, userPrefix);
  
  try {
    const { chatId, messageId } = await request.json() as { chatId: string, messageId: string };
    
    if (!chatId || !messageId) {
      return new Response(JSON.stringify({ error: 'Missing chatId or messageId' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    const chat = await chatRepository.getChat(chatId);
    if (!chat) {
      return new Response(JSON.stringify({ error: 'Chat not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Find the leaf message ID by traversing down from the selected message
    const leafMessageId = findLeafMessageId(chat, messageId);
    
    // Set the selected_message_id to the leaf message
    chat.selected_message_id = leafMessageId;
    
    await chatRepository.saveChat(chat);
    
    return new Response(JSON.stringify({ success: true, selected_message_id: leafMessageId }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error handling select response:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
