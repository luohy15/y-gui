import { Chat, StorageRepository, ListChatsOptions, ListChatsResult } from '../../../shared/types';

export class KVStorageRepository implements StorageRepository {
  constructor(private kv: KVNamespace, private r2: R2Bucket) {}

  async getChat(id: string) {
    const chat = await this.kv.get(`chat:${id}`, 'json');
    return chat as Chat | null;
  }

  private async getKVChats(): Promise<Chat[]> {
    const list = await this.kv.list({ prefix: 'chat:' });
    const chats = await Promise.all(
      list.keys.map(key => this.kv.get(key.name, 'json'))
    );
    return chats.filter((chat): chat is Chat => chat !== null);
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
    
    // Sort by create_time in descending order
    const sortedChats = mergedChats.sort((a, b) => 
      new Date(b.create_time).getTime() - new Date(a.create_time).getTime()
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

  async saveChat(chat: Chat) {
    await this.kv.put(`chat:${chat.id}`, JSON.stringify(chat));
    
    // Backup to R2 in chat.jsonl format
    try {
      // Get existing chats
      const existingChats = await this.getR2Chats();
      
      // Update or add the new chat
      const chatIndex = existingChats.findIndex(c => c.id === chat.id);
      if (chatIndex !== -1) {
        existingChats[chatIndex] = chat;
      } else {
        existingChats.push(chat);
      }
      
      // Convert to JSONL format
      const jsonlContent = existingChats.map(c => JSON.stringify(c)).join('\n');
      
      // Save back to R2
      await this.r2.put('chat1.jsonl', jsonlContent);
    } catch (error) {
      console.error('Error saving to R2:', error);
      // Continue even if R2 backup fails - we still have the chat in KV
    }
  }

  async deleteChat(id: string) {
    await this.kv.delete(`chat:${id}`);
    
    // Remove from R2 chat.jsonl
    try {
      const existingChats = await this.getR2Chats();
      const filteredChats = existingChats.filter(chat => chat.id !== id);
      
      if (filteredChats.length < existingChats.length) {
        // Chat was found and filtered out, update the file
        const jsonlContent = filteredChats.map(c => JSON.stringify(c)).join('\n');
        await this.r2.put('chat1.jsonl', jsonlContent);
      }
    } catch (error) {
      console.error('Error updating R2 after deletion:', error);
      // Continue even if R2 update fails - we still deleted from KV
    }
  }
}
