import { BotConfig, BotRepository } from '../../../shared/types';

export class BotR2Repository implements BotRepository {
  private r2Key: string;

  constructor(private r2: R2Bucket, userPrefix?: string) {
    // Create a sanitized prefix from the email
    this.r2Key = userPrefix ? `${userPrefix}/bot_config.jsonl` : 'bot_config.jsonl';
  }

  async addBot(bot: BotConfig): Promise<void> {
    try {
      // Get existing bots
      const bots = await this.getBots();
      
      // Add the new bot
      bots.push(bot);
      
      // Save the updated list
      const content = bots.map(b => JSON.stringify(b)).join('\n');
      
      // Write to R2
      await this.r2.put(this.r2Key, content);
    } catch (error) {
      console.error('Error adding bot to R2:', error);
      throw error;
    }
  }

  async updateBot(name: string, updatedBot: BotConfig): Promise<void> {
    try {
      // Get existing bots
      const bots = await this.getBots();
      
      // Find the bot to update
      const index = bots.findIndex(bot => bot.name === name);
      if (index === -1) {
        throw new Error(`Bot with name ${name} not found`);
      }
      
      // Update the bot
      bots[index] = updatedBot;
      
      // Save the updated list
      const content = bots.map(b => JSON.stringify(b)).join('\n');
      
      // Write to R2
      await this.r2.put(this.r2Key, content);
    } catch (error) {
      console.error('Error updating bot in R2:', error);
      throw error;
    }
  }

  async deleteBot(name: string): Promise<void> {
    try {
      // Get existing bots
      const bots = await this.getBots();
      
      // Filter out the bot to delete
      const updatedBots = bots.filter(bot => bot.name !== name);
      
      // If no bots were removed, the bot wasn't found
      if (updatedBots.length === bots.length) {
        throw new Error(`Bot with name ${name} not found`);
      }
      
      // Save the updated list
      const content = updatedBots.map(b => JSON.stringify(b)).join('\n');
      
      // Write to R2
      await this.r2.put(this.r2Key, content);
    } catch (error) {
      console.error('Error deleting bot from R2:', error);
      throw error;
    }
  }

  async getBots(): Promise<BotConfig[]> {
    try {
      let object = await this.r2.get(this.r2Key);
      
      if (!object) {
        console.log('No bots configuration found in R2');
        return [];
      }
      
      const content = await object.text();
      
      // Parse JSONL format (each line is a JSON object)
      const bots = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
      
      const freeBots: BotConfig[] = [
        {
          name: "gemini-0205-flash",
          model: "google/gemini-2.0-flash-exp:free"
        },
        {
          name: "deepseek-0324",
          model: "deepseek/deepseek-chat-v3-0324"
        },
      ];

      for (const freeBot of freeBots) {
        if (!bots.some(bot => bot.model === freeBot.model)) {
          bots.push(freeBot);
        }
      }
      // sort as original order
      bots.sort((a, b) => {
        return freeBots.findIndex(bot => bot.model === a.model) - freeBots.findIndex(bot => bot.model === b.model);
      });
      return bots;
    } catch (error) {
      console.error('Error fetching bots from R2:', error);
      return [];
    }
  }
}
