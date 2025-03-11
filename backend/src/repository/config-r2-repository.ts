import { BotConfig, McpServerConfig, ConfigRepository } from '../../../shared/types';

export class ConfigR2Repository implements ConfigRepository {
  constructor(private r2: R2Bucket) {}

  async getBots(): Promise<BotConfig[]> {
    try {
      const object = await this.r2.get('bot_config.jsonl');
      if (!object) {
        console.log('No bots configuration found in R2');
        return [];
      }
      
      const content = await object.text();
      
      // Parse JSONL format (each line is a JSON object)
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch (error) {
      console.error('Error fetching bots from R2:', error);
      return [];
    }
  }

  async getMcpServers(): Promise<McpServerConfig[]> {
    try {
      const object = await this.r2.get('mcp_config.jsonl');
      if (!object) {
        console.log('No MCP servers configuration found in R2');
        return [];
      }
      
      const content = await object.text();
      
      // Parse JSONL format (each line is a JSON object)
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch (error) {
      console.error('Error fetching MCP servers from R2:', error);
      return [];
    }
  }
}
