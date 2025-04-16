import { Chat, ChatRepository, ListChatsOptions, ListChatsResult } from '../../../shared/types';
import { generateUniqueId } from '../utils/chat';

export class ChatR2Repository implements ChatRepository {
  private r2Key: string;

  constructor(private r2: R2Bucket, userPrefix?: string) {
    console.log('ChatR2Repository created with user prefix:', userPrefix);
    this.r2Key = userPrefix ? `${userPrefix}/chat.jsonl` : 'chat.jsonl';
  }

  async getOrCreateChat(id: string): Promise<Chat> {
    // Try to get an existing chat
    const existingChat = await this.getChat(id);
    
    // If it exists, return it
    if (existingChat) {
      return existingChat;
    }
    
    // Otherwise, create a new empty chat with the given ID
    const newChat: Chat = {
      id,
      messages: [],
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    };
    
    // We don't save the chat yet - we'll let the first message do that
    return newChat;
  }

  async getChat(id: string): Promise<Chat | null> {
    const chats = await this.getChats();
    return chats.find(chat => chat.id === id) || null;
  }

  private async getChats(): Promise<Chat[]> {
    try {
      let object = await this.r2.get(this.r2Key);
      if (!object) return [];

      // Read the file content as text
      const content = await object.text();
      
      // Parse each line as a JSON object
      const chats: Chat[] = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

      console.log('R2 chats:', chats.length);
      return chats;
    } catch (error) {
      console.error('Error reading from R2:', error);
      return [];
    }
  }

  async listChats(options: ListChatsOptions = {}): Promise<ListChatsResult> {
    const { search = '', page = 1, limit = 10 } = options;
    
    // Get chats from R2
    const chats = await this.getChats();
    
    // Sort by update_time in descending order
    const sortedChats = chats.sort((a, b) => 
      new Date(b.update_time).getTime() - new Date(a.update_time).getTime()
    );
    
    // Apply search filter if provided (case-insensitive on message content)
    const searchLower = search.toLowerCase();
    
    // Helper to extract searchable text from message content
    const getSearchableText = (content: any): string => {
      if (typeof content === 'string') {
        return content;
      }
      if (Array.isArray(content)) {
        return content
          .filter(block => block?.type === 'text')
          .map(block => block.text)
          .join(' ');
      }
      return '';
    };

    const filteredChats = search 
      ? sortedChats.filter(chat => 
          chat.messages.some(msg => {
            try {
              const searchableText = getSearchableText(msg.content);
              return searchableText.toLowerCase().includes(searchLower);
            } catch (error) {
              console.error('Error processing message content:', {
                chatId: chat.id,
                content: msg.content,
                error
              });
              return false;
            }
          })
        )
      : sortedChats;
    
    // Calculate pagination
    const total = filteredChats.length;
    const startIndex = (page - 1) * limit;
    const paginatedChats = filteredChats.slice(startIndex, startIndex + limit);
    
    return {
      chats: paginatedChats,
      total,
      page,
      limit
    };
  }

  async saveChat(chat: Chat): Promise<Chat> {
    // set chat update time: update_time: 2023-04-24T14:14:28+08:00
    chat.update_time = new Date().toISOString();

    // Get existing chats
    const existingChats = await this.getChats();
    const existsCheck = async (id: string) => existingChats.some(c => c.id === id);

    // If chat.id is empty, generate a new unique ID
    if (!chat.id) {
      chat.id = await generateUniqueId(existsCheck);
    }
    
    // Update or add the new chat
    const chatIndex = existingChats.findIndex(c => c.id === chat.id);
    if (chatIndex !== -1) {
      existingChats[chatIndex] = chat;
    } else {
      existingChats.push(chat);
    }
    
    // Sort chats by update_time in descending order
    const sortedChats = existingChats.sort((a, b) =>
      new Date(b.update_time).getTime() - new Date(a.update_time).getTime()
    );

    // Convert to JSONL format and save to R2
    const jsonlContent = sortedChats.map(c => JSON.stringify(c)).join('\n');
    await this.r2.put(this.r2Key, jsonlContent);
    
    // return chat with id
    return chat;
  }
}
