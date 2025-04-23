import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { BotConfig, McpServerRepository, IntegrationRepository } from '../../../shared/types';
import { BotR2Repository } from '../repository/bot-r2-repository';
import { writeMcpStatus } from '../utils/writer';

/**
 * Manager for MCP server connections and tool execution
 */
export class McpManager {
  // Store any active connections (will be short-lived in Cloudflare Workers due to stateless nature)
  private sessions: Record<string, Client> = {};

  /**
   * Create a new MCP Manager
   * @param configRepo Repository for accessing MCP server configurations
   */
  constructor(
    private mcpServerConfigRepository: McpServerRepository,
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
      const mcpServers = await this.mcpServerConfigRepository.getMcpServers();
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
            // Check if integration type is a prefix of the tool name
            if (toolName.startsWith(integration.type) && 
                integration.connected && 
                integration.credentials?.access_token) {
              
              // Log this match
              console.log(`Using integration token for ${integration.type} when calling tool ${toolName}`);
              
              // Use the integration token instead
              token = integration.credentials.access_token;
              break;
            }
          }
        } catch (error) {
          console.error("Error fetching integrations:", error);
          // Continue with server token if there's an error with integrations
        }
      }

      // Create transport with token if available
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
          headers: token ? 
            { "Authorization": `Bearer ${token}` } :
            {}
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
   * Format MCP server information for the system prompt
   * @returns Formatted server information string
   */
  async format_server_info(mcp_servers?: string[], writer?: WritableStreamDefaultWriter): Promise<string> {
    try {
      // Get the list of configured MCP servers
      let mcpServers = await this.mcpServerConfigRepository.getMcpServers();
      
      if (mcpServers.length === 0) {
        await writeMcpStatus(writer, "info", "No MCP servers configured");
        return "(No MCP servers configured)";
      }

      // Filter servers if specified
      if (mcp_servers && mcp_servers.length > 0) {
        mcpServers = mcpServers.filter(s => mcp_servers.includes(s.name));
      } else {
        await writeMcpStatus(writer, "info", "No MCP servers configured");
        return "(No MCP servers configured)";
      }
      
      const serverSections = [];
      
      // In Cloudflare Workers (stateless environment), we always use on-demand connections
      // Connect to each server one at a time, get tools, then disconnect
      for (const server of mcpServers) {
        let toolsSection = "";
        const serverName = server.name;
        
        try {
          // Connect to this server
          await writeMcpStatus(writer, "info", `Connecting to ${serverName} to list tools...`, serverName);
          const client = await this.connectOnDemand(serverName, "", writer);
          
          if (!client) {
            await writeMcpStatus(writer, "error", `Failed to connect to ${serverName} to list tools`, serverName);
            serverSections.push(`## ${serverName}\n\n(Could not connect to server)`);
            continue;
          }
          
          await writeMcpStatus(writer, "info", `Getting tools from ${serverName}...`, serverName);
          
          // Get and format tools section with timeout
          const toolsResponse = await Promise.race([
            client.listTools(),
            new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error(`Timeout listing tools for ${serverName}`)), 5000)
            )
          ]);

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
            
            await writeMcpStatus(writer, "info", `Found ${toolsResponse.tools.length} tools in ${serverName}`, serverName);
          } else {
            await writeMcpStatus(writer, "info", `No tools found in ${serverName}`, serverName);
          }
          
          // Disconnect from this server before moving to the next one
          await this.disconnectServer(serverName);
          
        } catch (error) {
          console.error(`Error listing tools for ${serverName}:`, error);
          await writeMcpStatus(
            writer, 
            "error", 
            `Error listing tools for ${serverName}: ${error instanceof Error ? error.message : String(error)}`,
            serverName
          );
        }

        // Combine all sections
        const serverSection = `## ${serverName}${toolsSection}`;
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
