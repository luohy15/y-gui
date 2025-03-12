import { BotConfig, McpServerConfig, ConfigRepository } from '../../../shared/types';

export class ConfigR2Repository implements ConfigRepository {
  private userPrefix: string;

  constructor(private r2: R2Bucket, userEmail?: string) {
    // Create a sanitized prefix from the email
    this.userPrefix = userEmail ? `${this.sanitizeEmail(userEmail)}/` : '';
  }

  // Helper method to sanitize email for use as a folder prefix
  private sanitizeEmail(email: string): string {
    return email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  async getBots(): Promise<BotConfig[]> {
    try {
      // Try with user prefix first
      let object = await this.r2.get(`${this.userPrefix}bot_config.jsonl`);
      
      // Fallback to legacy path if no user-specific file exists and no prefix was provided
      if (!object && !this.userPrefix) {
        object = await this.r2.get('bot_config.jsonl');
      }
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
      // Try with user prefix first
      let object = await this.r2.get(`${this.userPrefix}mcp_config.jsonl`);
      
      // Fallback to legacy path if no user-specific file exists and no prefix was provided
      if (!object && !this.userPrefix) {
        object = await this.r2.get('mcp_config.jsonl');
      }
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
