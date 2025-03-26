import { McpServerConfig, McpServerRepository } from '../../../shared/types';
import { Env } from 'worker-configuration';

export class McpServerR2Repository implements McpServerRepository {
  private r2Key: string;
  private env: Env;

  constructor(private r2: R2Bucket, env: Env, userPrefix?: string) {
    // Create a sanitized prefix from the email
    this.r2Key = userPrefix ? `${userPrefix}/mcp_config.jsonl` : 'mcp_config.jsonl';
    this.env = env;
  }

  async getMcpServers(): Promise<McpServerConfig[]> {
    try {
      let object = await this.r2.get(this.r2Key);

      if (!object) {
        console.log('No MCP server configuration found in R2');
        return [];
      }

      const content = await object.text();

      // Parse JSONL format (each line is a JSON object)
      const mcp_servers = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

      const default_servers: McpServerConfig[] = [
        {
          name: "amap",
          url: this.env.AMAP_URL
        },
      ];

      for (const default_server of default_servers) {
        if (!mcp_servers.some(server => server.name === default_server.name)) {
          mcp_servers.push(default_server);
        }
      }

      return mcp_servers;
    } catch (error) {
      console.error('Error fetching MCP servers from R2:', error);
      return [];
    }

  }

  async addMcpserver(mcp_server: McpServerConfig): Promise<void> {
    try {
      // Get existing servers
      const servers = await this.getMcpServers();

      // Add the new server
      servers.push(mcp_server);

      // Save the updated list
      const content = servers.map(s => JSON.stringify(s)).join('\n');

      // Write to R2
      await this.r2.put(this.r2Key, content);
    } catch (error) {
      console.error('Error adding MCP server to R2:', error);
      throw error;
    }
  }

  async updateMcpServer(name: string, mcp_server: McpServerConfig): Promise<void> {
    try {
      // Get existing servers
      const servers = await this.getMcpServers();

      // Find the server to update
      const index = servers.findIndex(server => server.name === name);
      if (index === -1) {
        throw new Error(`MCP server with name ${name} not found`);
      }

      // Update the server
      servers[index] = mcp_server;

      // Save the updated list
      const content = servers.map(s => JSON.stringify(s)).join('\n');

      // Write to R2
      await this.r2.put(this.r2Key, content);
    } catch (error) {
      console.error('Error updating MCP server in R2:', error);
      throw error;
    }
  }

  async deleteMcpServer(name: string): Promise<void> {
    try {
      // Get existing servers
      const servers = await this.getMcpServers();

      // Filter out the server to delete
      const updatedServers = servers.filter(server => server.name !== name);

      // If no servers were removed, the server wasn't found
      if (updatedServers.length === servers.length) {
        throw new Error(`MCP server with name ${name} not found`);
      }

      // Save the updated list
      const content = updatedServers.map(s => JSON.stringify(s)).join('\n');

      // Write to R2
      await this.r2.put(this.r2Key, content);
    } catch (error) {
      console.error('Error deleting MCP server from R2:', error);
      throw error;
    }
  }
}
