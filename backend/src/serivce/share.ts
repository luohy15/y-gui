import { Chat, Message, ChatRepository } from '../../../shared/types';
import { generateUniqueId, buildMessagePath } from '../utils/chat';

export class ShareService {
  constructor(
    private chatRepository: ChatRepository,
    private publicChatRepository: ChatRepository
  ) {}

  /**
   * Create a shared version of a chat
   * @param chatId The ID of the original chat to share
   * @param messageId Optional message ID to filter the conversation
   * @returns The ID of the newly created shared chat
   */
  async createShare(chatId: string, messageId?: string): Promise<string> {
    // Get the original chat
    const chat = await this.chatRepository.getChat(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    
    // Check if a shared chat with the same origin already exists
    const publicChats = await this.publicChatRepository.getChats();
    const existingShare = publicChats.find(
      c => c.origin_chat_id === chatId && c.origin_message_id === messageId
    );
    
    // If found, return the existing share ID
    if (existingShare) {
      return existingShare.id;
    }
    
    // Generate unique ID for shared chat
    const existsCheck = async (id: string) => {
      const chat = await this.publicChatRepository.getChat(id);
      return chat !== null;
    };
    const shareId = await generateUniqueId(existsCheck);
    
    // Create a copy for public sharing with the new fields
    const sharedChat: Chat = {
      ...chat,
      id: shareId,
      origin_chat_id: chatId,
      origin_message_id: messageId
    };
    
    // If messageId is provided, only include the specified message and its ancestors
    if (messageId) {
      const messagePath = buildMessagePath(chat.messages, messageId);
      if (messagePath.length > 0) {
        sharedChat.messages = messagePath;
        sharedChat.selected_message_id = messageId;
      }
    }
    
    // Save the shared chat copy
    await this.publicChatRepository.saveChat(sharedChat);
    return shareId;
  }

  /**
   * Get a shared chat by its ID
   * @param shareId The ID of the shared chat to retrieve
   * @returns The shared chat, or null if not found
   */
  async getSharedChat(shareId: string): Promise<Chat | null> {
    return this.publicChatRepository.getChat(shareId);
  }
}
