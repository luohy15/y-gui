import { Message } from '../../../shared/types';

/**
 * Utility functions for chat-related operations
 */

/**
 * Generates a unique chat ID that doesn't conflict with existing IDs
 * @param existsCheck A function that checks if an ID already exists
 * @returns A unique ID
 */
export async function generateUniqueId(
  existsCheck: (id: string) => Promise<boolean>
): Promise<string> {
  let newId = '';
  let exists = true;

  while (exists) {
    // Generate a new 6-character hex ID
    newId = Array.from(crypto.getRandomValues(new Uint8Array(3)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 6);

    // Check if this ID already exists
    exists = await existsCheck(newId);
  }

  return newId;
}

/**
 * Build a message path by traversing parent_id relationships
 * @param messages All messages in the chat
 * @param userMessageId ID of the user message to start from
 * @returns Array of messages forming the conversation path
 */
export function buildMessagePath(messages: Message[], userMessageId: string): Message[] {
  const messagePath: Message[] = [];
  
  const userMessage = messages.find(msg => msg.id === userMessageId);
  if (!userMessage) return messagePath;
  
  // Add the user message to the path
  messagePath.push(userMessage);
  
  const messagesById = new Map<string, Message>();
  messages.forEach(msg => {
    if (msg.id) {
      messagesById.set(msg.id, msg);
    }
  });
  
  let currentId = userMessage.parent_id;
  while (currentId) {
    const parentMessage = messagesById.get(currentId);
    if (!parentMessage) break;
    
    // Add the parent message to the beginning of the path
    messagePath.unshift(parentMessage);
    
    currentId = parentMessage.parent_id;
  }
  
  return messagePath;
}
