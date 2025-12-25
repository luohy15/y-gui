import { BotConfig, BotRepository } from '../../../../shared/types';
import { Env } from 'worker-configuration';

export class BotD1Repository implements BotRepository {
  private userPrefix: string;

  constructor(private db: D1Database, private env: Env, userPrefix?: string) {
    this.userPrefix = userPrefix || 'default';
  }

  /**
   * Initialize the database schema if it doesn't exist
   */
  async initSchema(): Promise<void> {
    await this.db.exec(`CREATE TABLE IF NOT EXISTS bot (user_prefix TEXT NOT NULL, name TEXT NOT NULL, json_content TEXT NOT NULL, UNIQUE(user_prefix, name));`);
  }

  async addBot(bot: BotConfig): Promise<void> {
    try {
      await this.initSchema();
      
      // Insert the bot
      await this.db.prepare(`
        INSERT INTO bot (user_prefix, name, json_content)
        VALUES (?, ?, ?)
      `)
      .bind(this.userPrefix, bot.name, JSON.stringify(bot))
      .run();
    } catch (error) {
      console.error('Error adding bot to D1:', error);
      throw error;
    }
  }

  async updateBot(name: string, updatedBot: BotConfig): Promise<void> {
    try {
      await this.initSchema();

      // Update the bot by querying the JSON name field
      const result = await this.db.prepare(`
        UPDATE bot
        SET json_content = ?
        WHERE user_prefix = ? AND json_extract(json_content, '$.name') = ?
      `)
      .bind(JSON.stringify(updatedBot), this.userPrefix, name)
      .run();

      if (!result || result.meta.changes === 0) {
        throw new Error(`Bot with name ${name} not found`);
      }
    } catch (error) {
      console.error('Error updating bot in D1:', error);
      throw error;
    }
  }

  async deleteBot(name: string): Promise<void> {
    try {
      await this.initSchema();

      // Delete the bot by querying the JSON name field
      const result = await this.db.prepare(`
        DELETE FROM bot
        WHERE user_prefix = ? AND json_extract(json_content, '$.name') = ?
      `)
      .bind(this.userPrefix, name)
      .run();

      if (!result || result.meta.changes === 0) {
        throw new Error(`Bot with name ${name} not found`);
      }
    } catch (error) {
      console.error('Error deleting bot from D1:', error);
      throw error;
    }
  }

  async getBots(): Promise<BotConfig[]> {
    try {
      await this.initSchema();
      
      // Get all bots for this user prefix
      const results = await this.db.prepare(`
        SELECT json_content
        FROM bot
        WHERE user_prefix = ?
      `)
      .bind(this.userPrefix)
      .all<{ json_content: string }>();
      
      if (!results || !results.results) {
        return this.getDefaultBots();
      }
      
      // Parse the results into BotConfig objects
      const bots: BotConfig[] = results.results.map(row => {
        return JSON.parse(row.json_content);
      });
      
      // Add default bots if they don't already exist
      const defaultBots = this.getDefaultBots();
      for (const defaultBot of defaultBots) {
        if (!bots.some(bot => bot.model === defaultBot.model)) {
          bots.push(defaultBot);
        }
      }
      
      // Sort to match the default order
      bots.sort((a, b) => {
        const defaultIndex = defaultBots.findIndex(bot => bot.model === a.model) - 
                            defaultBots.findIndex(bot => bot.model === b.model);
        if (defaultIndex !== 0) return defaultIndex;
        return a.name.localeCompare(b.name); // Secondary sort by name
      });
      
      return bots;
    } catch (error) {
      console.error('Error fetching bots from D1:', error);
      return this.getDefaultBots();
    }
  }
  
  private getDefaultBots(): BotConfig[] {
    return [
      {
        name: "default",
        model: "google/gemini-3-flash-preview"
      },
    ];
  }
}
