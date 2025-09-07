import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpServerRepository, IntegrationRepository, McpServer, McpTool } from '../../../shared/types';
import { writeMcpStatus } from '../utils/writer';

/**
 * Manager for MCP server connections and tool execution
 */
export class McpManager {
  // Store any active connections (will be short-lived in Cloudflare Workers due to stateless nature)
  private sessions: Record<string, Client> = {};

  /**
   * Create a new MCP Manager
   * @param mcpServerRepository Repository for accessing MCP server configurations
   * @param integrationRepository Repository for accessing integration configurations
   */
  constructor(
    private mcpServerRepository: McpServerRepository,
    private integrationRepository: IntegrationRepository
  ) {}

  /**
   * Disconnect all MCP server sessions
   * @returns Promise resolving when all disconnections are complete
   */
  private async disconnectAll(): Promise<void> {
    for (const [name, client] of Object.entries(this.sessions)) {
      try {
        await client.close();
        console.log(`Disconnected from MCP server: ${name}`);
      } catch (err) {
        console.error(`Error disconnecting from ${name}:`, err);
      }
    }
    this.sessions = {};
  }
  
  /**
   * Disconnect a specific MCP server session
   * @param serverName Name of the MCP server to disconnect
   * @returns Promise resolving when disconnection is complete
   */
  private async disconnectServer(serverName: string): Promise<void> {
    if (this.sessions[serverName]) {
      try {
        await this.sessions[serverName].close();
        console.log(`Disconnected from MCP server: ${serverName}`);
        delete this.sessions[serverName];
      } catch (err) {
        console.error(`Error disconnecting from ${serverName}:`, err);
      }
    }
  }
  
  /**
   * Connect to a specific MCP server on-demand (just-in-time)
   * @param serverName Name of the MCP server to connect to
   * @param toolName Name of the tool being executed (optional)
   * @param writer Optional writer for status updates
   * @returns Promise resolving to the connected client or null if connection fails
   */
  private async connectOnDemand(
    serverName: string, 
    toolName: string = "", 
    writer?: WritableStreamDefaultWriter
  ): Promise<Client | null> {
    // First disconnect any existing connections to ensure we only have one active connection
    await this.disconnectAll();
    
    try {
      const mcpServers = await this.mcpServerRepository.getMcpServers();
      const server = mcpServers.find(s => s.name === serverName);
      
      if (!server) {
        console.error(`MCP server '${serverName}' not found in configuration`);
        await writeMcpStatus(writer, "error", `MCP server '${serverName}' not found`, serverName);
        return null;
      }
      
      if (!server.url) {
        console.error(`Error connecting to MCP server ${serverName}: No URL provided`);
        await writeMcpStatus(writer, "error", `Failed to connect to ${serverName}: No URL provided`, serverName);
        return null;
      }

      await writeMcpStatus(writer, "connecting", `Connecting to MCP server: ${serverName}`, serverName);

      // Create a URL from the server configuration
      const serverUrl = new URL(server.url);

      // Get token from server configuration
      let token = server.token;

      // Check if we have a tool name and should try to find an integration token
      if (toolName) {
        try {
          const integrations = await this.integrationRepository.getIntegrations();
          
          for (const integration of integrations) {
            // Check if integration name is a prefix of the tool name
            if (toolName.startsWith(integration.name) && 
                integration.connected) {
              
              // Log this match
              console.log(`Using integration token for ${integration.name} when calling tool ${toolName}`);
              
              // Use the integration token instead
              if (integration.auth_type === "api_key") {
                token = integration.api_key;
              } else if (integration.auth_type === "oauth") {
                token = integration.credentials?.access_token;
              }
              break;
            }
          }
        } catch (error) {
          console.error("Error fetching integrations:", error);
          // Continue with server token if there's an error with integrations
        }
      }

      // Get all connected integrations for the header
      let connectedIntegrations: string[] = [];
      try {
        const integrations = await this.integrationRepository.getIntegrations();
        connectedIntegrations = integrations
          .filter(integration => integration.connected)
          .map(integration => integration.name);
      } catch (error) {
        console.error("Error fetching integrations for header:", error);
        // Continue without the header if there's an error
      }

      // Create transport with token if available and add X-Integrations header
      const transportOptions: {
        requestInit: {
          headers: HeadersInit;
        };
        reconnectionOptions: {
          initialReconnectionDelay: number;
          maxReconnectionDelay: number;
          reconnectionDelayGrowFactor: number;
          maxRetries: number;
        };
      } = {
        requestInit: {
          headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            ...(connectedIntegrations.length > 0 ? { "X-Integrations": connectedIntegrations.join(',') } : {})
          }
        },
        reconnectionOptions: {
          initialReconnectionDelay: 1000,
          maxReconnectionDelay: 30000,
          reconnectionDelayGrowFactor: 1.5,
          maxRetries: 2
        }
      };
    
      const transport = new StreamableHTTPClientTransport(serverUrl, transportOptions);

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
      
      // Connect with timeout
      await Promise.race([
        client.connect(transport),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Connection timeout for ${serverName}`)), 5000)
        )
      ]);
      
      this.sessions[serverName] = client;
      await writeMcpStatus(writer, "connected", `Connected to MCP server: ${serverName}`, serverName);
      console.log(`Connected to MCP server: ${serverName}`);
      
      return client;
    } catch (error) {
      console.error(`Failed to connect to MCP server ${serverName}:`, error);
      await writeMcpStatus(
        writer, 
        "error", 
        `Failed to connect to ${serverName}: ${error instanceof Error ? error.message : String(error)}`,
        serverName
      );
      return null;
    }
  }
  
  /**
   * Refresh cache for all MCP servers by connecting and fetching their tools
   * @param writer Optional writer for status updates
   * @returns Promise resolving when cache refresh is complete
   */
  async refreshAllServerCaches(writer?: WritableStreamDefaultWriter): Promise<void> {
    try {
      const mcpServers = await this.mcpServerRepository.getMcpServers();
      
      if (mcpServers.length === 0) {
        await writeMcpStatus(writer, "info", "No MCP servers to cache");
        return;
      }
      
      await writeMcpStatus(writer, "info", `Refreshing cache for ${mcpServers.length} MCP servers`);
      
      for (const server of mcpServers) {
        await this.getServerTools(server.name, writer);
      }
      
      await writeMcpStatus(writer, "info", "Finished refreshing all server caches");
    } catch (error) {
      console.error("Error refreshing server caches:", error);
      await writeMcpStatus(writer, "error", `Error refreshing server caches: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get tools for a specific MCP server
   * @param serverName Name of the MCP server to get tools for
   * @param writer Optional writer for status updates
   */
  async getServerTools(serverName: string, writer?: WritableStreamDefaultWriter): Promise<void> {
    const now = new Date().toISOString();
    
    try {
      await writeMcpStatus(writer, "info", `Refreshing cache for ${serverName}`, serverName);
      
      const client = await this.connectOnDemand(serverName, "", writer);
      
      if (!client) {
        // Update the server with failed status
        const servers = await this.mcpServerRepository.getMcpServers();
        const server = servers.find(s => s.name === serverName);
        if (server) {
          const updatedServer: McpServer = {
            ...server,
            tools: [],
            last_updated: now,
            status: 'failed',
            error_message: 'Failed to connect to server'
          };
          await this.mcpServerRepository.updateMcpServer(serverName, updatedServer);
        }
        return;
      }
      
      // Get tools with timeout
      const toolsResponse = await Promise.race([
        client.listTools(),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout listing tools for ${serverName}`)), 5000)
        )
      ]);

      const tools: McpTool[] = [];
      if (toolsResponse && toolsResponse.tools && toolsResponse.tools.length > 0) {
        for (const tool of toolsResponse.tools) {
          tools.push({
            name: tool.name,
            description: tool.description || '',
            inputSchema: tool.inputSchema
          });
        }
      }

      // Update the server with cached tools
      const servers = await this.mcpServerRepository.getMcpServers();
      const server = servers.find(s => s.name === serverName);
      if (server) {
        const updatedServer: McpServer = {
          ...server,
          tools,
          last_updated: now,
          status: 'connected'
        };
        await this.mcpServerRepository.updateMcpServer(serverName, updatedServer);
      }

      await writeMcpStatus(writer, "info", `Cached ${tools.length} tools for ${serverName}`, serverName);
      
      // Disconnect from this server
      await this.disconnectServer(serverName);
      
    } catch (error) {
      console.error(`Error refreshing cache for ${serverName}:`, error);
      
      // Update the server with error status
      const servers = await this.mcpServerRepository.getMcpServers();
      const server = servers.find(s => s.name === serverName);
      if (server) {
        const updatedServer: McpServer = {
          ...server,
          tools: [],
          last_updated: now,
          status: 'failed',
          error_message: error instanceof Error ? error.message : String(error)
        };
        await this.mcpServerRepository.updateMcpServer(serverName, updatedServer);
      }
      
      await writeMcpStatus(
        writer, 
        "error", 
        `Error caching tools for ${serverName}: ${error instanceof Error ? error.message : String(error)}`,
        serverName
      );
    }
  }

  /**
   * Get formatted MCP tools prompt using cached data
   * @param writer Optional writer for status updates
   * @returns Formatted tools prompt string
   */
  async getToolsPrompt(writer?: WritableStreamDefaultWriter): Promise<string> {
    try {
      // Get the list of configured MCP servers
      const mcpServers = await this.mcpServerRepository.getMcpServers();
      
      if (mcpServers.length === 0) {
        await writeMcpStatus(writer, "info", "No MCP servers configured");
        return "(No MCP servers configured)";
      }

      const serverSections = [];
      
      // Use cached data to build the prompt
      for (const server of mcpServers) {
        let toolsSection = "";
        
        if (server.status === 'connected' && server.tools && server.tools.length > 0) {
          const tools = [];
          for (const tool of server.tools) {
            let schemaStr = "";
            if (tool.inputSchema) {
              const schemaJson = JSON.stringify(tool.inputSchema, null, 2);
              const schemaLines = schemaJson.split("\n");
              schemaStr = "\n    Input Schema:\n    " + schemaLines.join("\n    ");
            }
            tools.push(`- ${tool.name}: ${tool.description}${schemaStr}`);
          }
          toolsSection = "\n\n### Available Tools\n" + tools.join("\n\n");
        } else if (server.status === 'failed') {
          toolsSection = `\n\n(Server unavailable: ${server.error_message || 'Unknown error'})`;
        } else {
          toolsSection = "\n\n(Server not connected)";
        }

        const serverSection = `## ${server.name}${toolsSection}`;
        serverSections.push(serverSection);
      }
      
      return serverSections.join("\n\n");
    } catch (error) {
      console.error("Error formatting server info:", error);
      await writeMcpStatus(writer, "error", `Error retrieving MCP server information: ${error instanceof Error ? error.message : String(error)}`);
      return "(Error retrieving MCP server information)";
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
      let client: Client | null = null;
      
      // Connect on-demand (always just-in-time in Cloudflare Workers)
      client = await this.connectOnDemand(serverName, toolName);
      if (!client) {
        return `Error: Could not establish connection to MCP server '${serverName}'`;
      }
      
      // Execute the tool using the client
      const response = await client.callTool({
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
      
      // Always disconnect after use in Cloudflare Workers (stateless environment)
      await this.disconnectServer(serverName);
      
      return result || "Tool execution completed successfully";
    } catch (error) {
      console.error(`Error executing MCP tool:`, error);
      
      // Always clean up connection in Cloudflare Workers (stateless environment)
      await this.disconnectServer(serverName);
      
      return `Error executing MCP tool: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}