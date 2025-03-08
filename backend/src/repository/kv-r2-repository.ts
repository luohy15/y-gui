import { Chat, ChatRepository, ListChatsOptions, ListChatsResult } from '../../../shared/types';

export class KVR2ChatRepository implements ChatRepository {
  constructor(private kv: KVNamespace, private r2: R2Bucket) {}

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

  async getChat(id: string) {
    // First try KV storage
    const kvChats = await this.getKVChats();
    const kvChat = kvChats.find(chat => chat.id === id);
    if (kvChat) {
      return kvChat;
    }

    // If not found in KV, try R2 storage
    const r2Chats = await this.getR2Chats();
    return r2Chats.find(chat => chat.id === id) || null;
  }

  private async getKVChats(): Promise<Chat[]> {
    const content = await this.kv.get('chats', 'text');
    if (!content) return [];
    
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          console.error('Error parsing chat from KV:', error);
          return null;
        }
      })
      .filter((chat): chat is Chat => chat !== null);
  }

  private async getR2Chats(): Promise<Chat[]> {
    try {
      console.log('Attempting to get chat.jsonl from R2...');
      
      // List objects to debug
      const list = await this.r2.list();
      console.log('R2 objects:', list.objects.map(obj => obj.key));
      
      // Try both possible filenames
      let object = await this.r2.get('chat1.jsonl');
      if (!object) {
        object = await this.r2.get('chat.jsonl');
      }
      
      console.log('R2 object exists:', !!object);
      if (!object) {
        console.log('Could not find chat file in R2');
        return [];
      }

      // Read the file content as text
      const content = await object.text();
      
      // Parse each line as a JSON object
      const chats: Chat[] = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

      // lines
      console.log('R2 chats:', chats.length);
      return chats;
    } catch (error) {
      console.error('Error reading from R2:', error);
      return [];
    }
  }

  private mergeChats(kvChats: Chat[], r2Chats: Chat[]): Chat[] {
    // Create a map of KV chats for quick lookup
    const kvChatsMap = new Map(kvChats.map(chat => [chat.id, chat]));
    
    // Add R2 chats that don't exist in KV
    for (const r2Chat of r2Chats) {
      if (!kvChatsMap.has(r2Chat.id)) {
        kvChatsMap.set(r2Chat.id, r2Chat);
      }
    }
    
    return Array.from(kvChatsMap.values());
  }

  async listChats(options: ListChatsOptions = {}): Promise<ListChatsResult> {
    const { search = '', page = 1, limit = 10 } = options;
    
    // Get chats from both sources
    const [kvChats, r2Chats] = await Promise.all([
      this.getKVChats(),
      this.getR2Chats()
    ]);
    
    // Merge chats (prioritize KV for duplicates)
    const mergedChats = this.mergeChats(kvChats, r2Chats);
    
    // Sort by update_time in descending order
    const sortedChats = mergedChats.sort((a, b) => 
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
    // Get existing chats
    const existingChats = await this.getKVChats();
    
    // Update or add the new chat
    const chatIndex = existingChats.findIndex(c => c.id === chat.id);
    if (chatIndex !== -1) {
      existingChats[chatIndex] = chat;
    } else {
      // if chat.id is empty, generate a 6 character random hexadecimal id (similar to Python's uuid.uuid4().hex[:6])
      if (!chat.id) {
        chat.id = Array.from(crypto.getRandomValues(new Uint8Array(3)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .substring(0, 6);
      }
      existingChats.push(chat);
    }
    
    // Convert to JSONL format and save back to KV
    const jsonlContent = existingChats.map(c => JSON.stringify(c)).join('\n');
    await this.kv.put('chats', jsonlContent);
    // return chat with id
    return chat;
  }

}
