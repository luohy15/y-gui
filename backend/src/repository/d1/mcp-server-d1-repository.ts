import { McpServerConfig, McpServerRepository } from '../../../../shared/types';
import { Env } from 'worker-configuration';

export class McpServerD1Repository implements McpServerRepository {
  private userPrefix: string;

  constructor(private db: D1Database, private env: Env, userPrefix?: string) {
    this.userPrefix = userPrefix || 'default';
  }

  /**
   * Initialize the database schema if it doesn't exist
   */
  async initSchema(): Promise<void> {
    await this.db.exec(`CREATE TABLE IF NOT EXISTS mcp_server (user_prefix TEXT NOT NULL, name TEXT NOT NULL, json_content TEXT NOT NULL, UNIQUE(user_prefix, name));`);
  }

  async getMcpServers(): Promise<McpServerConfig[]> {
    try {
      await this.initSchema();
      
      // Get all MCP servers for this user prefix
      const results = await this.db.prepare(`
        SELECT json_content
        FROM mcp_server
        WHERE user_prefix = ?
      `)
      .bind(this.userPrefix)
      .all<{ json_content: string }>();
      
      if (!results || !results.results) {
        return this.getDefaultServers();
      }
      
      // Parse the results into McpServerConfig objects
      const servers: McpServerConfig[] = results.results.map(row => {
        return JSON.parse(row.json_content);
      });
      
      // Add default servers if they don't already exist
      const defaultServers = this.getDefaultServers();
      for (const defaultServer of defaultServers) {
        if (!servers.some(server => server.name === defaultServer.name)) {
          servers.push(defaultServer);
        }
      }
      
      return servers;
    } catch (error) {
      console.error('Error fetching MCP servers from D1:', error);
      return this.getDefaultServers();
    }
  }

  async addMcpserver(mcp_server: McpServerConfig): Promise<void> {
    try {
      await this.initSchema();
      
      // Insert the MCP server
      await this.db.prepare(`
        INSERT INTO mcp_server (user_prefix, name, json_content)
        VALUES (?, ?, ?)
      `)
      .bind(this.userPrefix, mcp_server.name, JSON.stringify(mcp_server))
      .run();
    } catch (error) {
      console.error('Error adding MCP server to D1:', error);
      throw error;
    }
  }

  async updateMcpServer(name: string, mcp_server: McpServerConfig): Promise<void> {
    try {
      await this.initSchema();
      
      // Update the MCP server
      const result = await this.db.prepare(`
        UPDATE mcp_server 
        SET json_content = ?
        WHERE user_prefix = ? AND name = ?
      `)
      .bind(JSON.stringify(mcp_server), this.userPrefix, name)
      .run();
      
      if (!result || result.meta.changes === 0) {
        throw new Error(`MCP server with name ${name} not found`);
      }
    } catch (error) {
      console.error('Error updating MCP server in D1:', error);
      throw error;
    }
  }

  async deleteMcpServer(name: string): Promise<void> {
    try {
      await this.initSchema();
      
      // Delete the MCP server
      const result = await this.db.prepare(`
        DELETE FROM mcp_server
        WHERE user_prefix = ? AND name = ?
      `)
      .bind(this.userPrefix, name)
      .run();
      
      if (!result || result.meta.changes === 0) {
        throw new Error(`MCP server with name ${name} not found`);
      }
    } catch (error) {
      console.error('Error deleting MCP server from D1:', error);
      throw error;
    }
  }
  
  private getDefaultServers(): McpServerConfig[] {
    return [
      {
        name: "default",
        url: this.env.MCP_SERVER_URL
      },
    ];
  }
}
