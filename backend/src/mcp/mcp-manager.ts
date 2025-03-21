import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { BotConfig, McpServerRepository } from '../../../shared/types';
import { BotR2Repository } from '../repository/bot-r2-repository';
import { FetchLikeInit } from 'eventsource';

/**
 * Manager for MCP server connections and tool execution
 */
export class McpManager {
  private sessions: Record<string, Client> = {};

  /**
   * Create a new MCP Manager
   * @param configRepo Repository for accessing MCP server configurations
   */
  constructor(private mcpServerConfigRepository: McpServerRepository) {}
  
  /**
   * Connect to specified MCP servers or all if no names provided
   * @param serverNames Optional list of server names to connect to
   * @returns Promise resolving when connections are established
   */
  async connectToServers(serverNames?: string[]): Promise<void> {
    try {
      const mcpServers = await this.mcpServerConfigRepository.getMcpServers();
      
      // Filter servers by name if serverNames is provided
      const serversToConnect = serverNames 
        ? mcpServers.filter(server => serverNames.includes(server.name))
        : [];
      
      // Connect to each server that's not already connected
      for (const server of serversToConnect) {
        // Skip if already connected
        if (this.sessions[server.name]) {
          console.log(`MCP server '${server.name}' already connected`);
          continue;
        }
        
        try {
          if (!server.url) {
            console.error(`Error connecting to MCP server ${server.name}: No URL provided`);
            continue;
          }

          // Create a URL from the server configuration
          const serverUrl = new URL(server.url);
          // Create transport with token if available
          const transportOptions = {
            eventSourceInit: {
              fetch: (input: string | URL, init?: FetchLikeInit) => {
                if (init) {
                  init.mode = undefined;
                  init.cache = undefined;
                }
                if (server.token) {
                  if (!init) {
                    init = {};
                  }
                  if (!init.headers) {
                    init.headers = {};
                  }
                  init.headers["Authorization"] = `Bearer ${server.token}`;
                }
                return fetch(input, init as RequestInit);
              }
            }
          }
        
          const transport = new SSEClientTransport(serverUrl, transportOptions);

          const client = new Client(
            {
              name: "example-client",
              version: "1.0.0"
            },
            {
              capabilities: {
                prompts: {},
                resources: {},
                tools: {}
              }
            }
          );
          
          await client.connect(transport);
          this.sessions[server.name] = client;
          
          console.log(`Connected to MCP server: ${server.name}`);
        } catch (error) {
          console.error(`Failed to connect to MCP server ${server.name}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error connecting to MCP servers:`, error);
    }
  }
  
  /**
   * Format MCP server information for the system prompt
   * @returns Formatted server information string
   */
  async format_server_info(): Promise<string> {
    if (Object.keys(this.sessions).length === 0) {
      return "(No MCP servers currently connected)";
    }

    const serverSections = [];

    for (const [serverName, client] of Object.entries(this.sessions)) {
      // Get server information
      let toolsSection = "";
      let templatesSection = "";
      let resourcesSection = "";

      try {
        // Get and format tools section
        const toolsResponse = await client.listTools();
        if (toolsResponse && toolsResponse.tools && toolsResponse.tools.length > 0) {
          const tools = [];
          for (const tool of toolsResponse.tools) {
            let schemaStr = "";
            if (tool.inputSchema) {
              const schemaJson = JSON.stringify(tool.inputSchema, null, 2);
              const schemaLines = schemaJson.split("\n");
              schemaStr = "\n    Input Schema:\n    " + schemaLines.join("\n    ");
            }
            tools.push(`- ${tool.name}: ${tool.description}${schemaStr}`);
          }
          toolsSection = "\n\n### Available Tools\n" + tools.join("\n\n");
        }
      } catch (error) {
        console.error(`Error listing tools for ${serverName}:`, error);
      }

      // Combine all sections
      const serverSection = 
        `## ${serverName}` +
        `${toolsSection}` +
        `${templatesSection}` +
        `${resourcesSection}`;
      
      serverSections.push(serverSection);
    }

    return serverSections.join("\n\n");
  }

  /**
   * Initialize MCP servers for a specific bot
   * @param bot The bot to initialize MCP servers for
   * @returns Promise resolving when connections are established
   */
  async initMcpServersForBot(bot: BotConfig): Promise<void> {
    try {
      // If the bot has mcp_servers property, use those servers
      // Otherwise, connect to all available servers
      const serverNames = bot.mcp_servers;
      
      // Connect to the specified servers
      await this.connectToServers(serverNames);
      
      console.log(`Initialized MCP servers for bot: ${bot.name}`);
    } catch (error) {
      console.error(`Error initializing MCP servers for bot ${bot.name}:`, error);
    }
  }
  
  /**
   * Execute an MCP tool
   * @param serverName Name of the MCP server
   * @param toolName Name of the tool to execute
   * @param args Arguments for the tool
   * @returns Promise resolving to the tool execution result
   */
  async executeTool(serverName: string, toolName: string, args: any): Promise<string> {
    try {
      // Check if we have an active session for this server
      if (!this.sessions[serverName]) {
        // Try to connect to the server if not already connected
        await this.connectToServers([serverName]);
        
        // If still not connected, return error
        if (!this.sessions[serverName]) {
          return `Error: MCP server '${serverName}' not found or could not connect`;
        }
      }
      
      // Execute the tool using the client
      const response = await this.sessions[serverName].callTool({
        name: toolName,
        arguments: args
      });
      
      // Extract text content from response
      let result = "";
      if (Array.isArray(response.content)) {
        for (const block of response.content) {
          if (block.type === 'text' && block.text) {
            result += block.text;
          }
        }
      }
      
      return result || "Tool execution completed successfully";
    } catch (error) {
      console.error(`Error executing MCP tool:`, error);
      return `Error executing MCP tool: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
