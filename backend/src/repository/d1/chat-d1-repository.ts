import { Chat, ChatRepository, ListChatsOptions, ListChatsResult } from '../../../../shared/types';
import { generateUniqueId } from '../../utils/chat';

export class ChatD1Repository implements ChatRepository {
  private userPrefix: string;

  constructor(private db: D1Database, userPrefix?: string) {
    console.log('ChatD1Repository created with user prefix:', userPrefix);
    this.userPrefix = userPrefix || 'default';
  }

  /**
   * Initialize the database schema if it doesn't exist
   */
  async initSchema(): Promise<void> {
    await this.db.exec(`CREATE TABLE IF NOT EXISTS chat (id INTEGER PRIMARY KEY AUTOINCREMENT, user_prefix TEXT NOT NULL, chat_id TEXT NOT NULL, json_content TEXT NOT NULL, update_time TEXT, UNIQUE(user_prefix, chat_id));`);
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
    try {
      await this.initSchema();
      
      const result = await this.db.prepare(`
        SELECT json_content FROM chat 
        WHERE user_prefix = ? AND chat_id = ?
      `)
      .bind(this.userPrefix, id)
      .first<{ json_content: string }>();
      
      if (!result) return null;
      
      return JSON.parse(result.json_content) as Chat;
    } catch (error) {
      console.error('Error getting chat from D1:', error);
      return null;
    }
  }

  async listChats(options: ListChatsOptions = {}): Promise<ListChatsResult> {
    const { search = '', page = 1, limit = 10 } = options;
    
    try {
      await this.initSchema();
      
      // Setup basic query parameters
      const bindParams: any[] = [this.userPrefix];
      let whereClause = "WHERE user_prefix = ?";
      
      // Process search terms if provided
      if (search && search.trim() !== '') {
        // Split search by spaces to handle multiple search terms
        const searchTerms = search.trim().split(/\s+/);
        
        if (searchTerms.length > 0) {
          // Add a LIKE condition for each search term
          const searchClauses = searchTerms.map(() => "json_content LIKE ?").join(" AND ");
          whereClause += ` AND (${searchClauses})`;
          
          // Add each search term as a parameter with wildcards
          searchTerms.forEach(term => {
            bindParams.push(`%${term}%`);
          });
        }
      }
      
      // Get total count for pagination
      const countStmt = await this.db.prepare(`
        SELECT COUNT(*) as total FROM chat 
        ${whereClause}
      `);
      
      const countResult = await countStmt.bind(...bindParams).first<{ total: number }>();
      const total = countResult?.total || 0;
      
      // Calculate offset for pagination
      const offset = (page - 1) * limit;
      
      // Get paginated results
      const chatsStmt = await this.db.prepare(`
        SELECT json_content FROM chat 
        ${whereClause}
        ORDER BY update_time DESC
        LIMIT ? OFFSET ?
      `);
      
      // Add pagination parameters
      bindParams.push(limit, offset);
      
      const results = await chatsStmt.bind(...bindParams).all<{ json_content: string }>();
      
      if (!results || !results.results) {
        return { chats: [], total, page, limit };
      }
      
      const chats = results.results.map(row => {
        try {
          return JSON.parse(row.json_content) as Chat;
        } catch (error) {
          console.error('Error parsing chat JSON:', error);
          return null;
        }
      }).filter((chat): chat is Chat => chat !== null);
      
      return {
        chats,
        total,
        page,
        limit
      };
    } catch (error) {
      console.error('Error listing chats from D1:', error);
      return {
        chats: [],
        total: 0,
        page,
        limit
      };
    }
  }

  async saveChat(chat: Chat): Promise<Chat> {
    await this.initSchema();
    
    // set chat update time: update_time: 2023-04-24T14:14:28+08:00
    const updateTime = new Date().toISOString();
    chat.update_time = updateTime;

    // If chat.id is empty, generate a new unique ID
    if (!chat.id) {
      const existsCheck = async (id: string) => {
        const existingChat = await this.getChat(id);
        return existingChat !== null;
      };
      
      chat.id = await generateUniqueId(existsCheck);
    }
    
    try {
      // Insert or replace the chat in the database
      await this.db.prepare(`
        INSERT OR REPLACE INTO chat (user_prefix, chat_id, json_content, update_time)
        VALUES (?, ?, ?, ?)
      `)
      .bind(this.userPrefix, chat.id, JSON.stringify(chat), updateTime)
      .run();
      
      return chat;
    } catch (error) {
      console.error('Error saving chat to D1:', error);
      throw new Error(`Failed to save chat: ${error}`);
    }
  }

  /**
   * Save multiple chats in batch
   * @param chats Array of chats to save
   * @returns Object with operation statistics
   */
  async saveChats(chats: Chat[]): Promise<{ total: number, success: number, failed: number }> {
    await this.initSchema();
    
    let success = 0;
    let failed = 0;
    
    try {
      // Process each chat individually without using explicit transactions
      for (const chat of chats) {
        try {
          // Ensure chat has update_time
          if (!chat.update_time) {
            chat.update_time = new Date().toISOString();
          }
          
          // Insert or replace each chat
          await this.db.prepare(`
            INSERT OR REPLACE INTO chat (user_prefix, chat_id, json_content, update_time)
            VALUES (?, ?, ?, ?)
          `)
          .bind(this.userPrefix, chat.id, JSON.stringify(chat), chat.update_time)
          .run();
          
          success++;
        } catch (error) {
          console.error('Error migrating chat:', chat.id, error);
          failed++;
        }
      }
    } catch (error) {
      console.error('Error during migration:', error);
      throw error;
    }
    
    return {
      total: chats.length,
      success,
      failed
    };
  }
}
