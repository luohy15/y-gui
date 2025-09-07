import { McpServer } from '../../../shared/types';
import { corsHeaders } from '../middleware/cors';
import { McpServerD1Repository } from '../repository/d1/mcp-server-d1-repository';
import { IntegrationD1Repository } from '../repository/d1/integration-d1-repository';
import { McpManager } from '../mcp/mcp-manager';
import { Env } from 'worker-configuration';

async function connectToMcpServer(serverName: string, mcpRepo: McpServerD1Repository, env: Env, userPrefix?: string) {
  const integrationRepo = new IntegrationD1Repository(env.CHAT_DB, userPrefix);
  const mcpManager = new McpManager(mcpRepo, integrationRepo);
  
  try {
    // Use getServerTools logic to connect and fetch tools
    await mcpManager.getServerTools(serverName);
    
    // Get the updated server to check if connection was successful
    const updatedServers = await mcpRepo.getMcpServers();
    const server = updatedServers.find(s => s.name === serverName);
    
    return {
      success: server?.status === 'connected',
      server,
      tools: server?.tools || [],
      error: server?.status !== 'connected' ? (server?.error_message || 'Connection failed') : undefined
    };
  } catch (error) {
    console.error(`Error connecting to MCP server ${serverName}:`, error);
    return {
      success: false,
      server: null,
      tools: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function handleMcpServerRequest(request: Request, env: Env, userPrefix?: string): Promise<Response> {
  const mcpRepo = new McpServerD1Repository(env.CHAT_DB, env, userPrefix);
  const url = new URL(request.url);
  const path = url.pathname;
  const pathParts = path.split('/');
  const serverName = pathParts.length > 3 ? pathParts[3] : null;

  try {
    // Get MCP server configurations
    if (path === '/api/mcp-servers' && request.method === 'GET') {
      const servers = await mcpRepo.getMcpServers();
      return new Response(JSON.stringify(servers), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Browse available connectors from mcprouter
    if (path === '/api/browse-connectors' && request.method === 'GET') {
      try {
        const response = await fetch('https://api.mcprouter.to/v1/list-servers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      } catch (error) {
        console.error('Error fetching servers from mcprouter:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch servers from mcprouter',
          details: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }
    // Add a new MCP server
    if (path === '/api/mcp-server' && request.method === 'POST') {
      const mcpServer: McpServer = await request.json();
      
      // Validate required fields
      if (!mcpServer.name) {
        return new Response(JSON.stringify({ error: 'Missing required field: name' }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Validate that url is provided
      if (!mcpServer.url) {
        return new Response(JSON.stringify({ error: 'Url must be provided' }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Check if server with same name already exists
      const existingServers = await mcpRepo.getMcpServers();
      if (existingServers.some(server => server.name === mcpServer.name)) {
        return new Response(JSON.stringify({ error: 'MCP server with this name already exists' }), {
          status: 409,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Add the MCP server
      await mcpRepo.addMcpserver(mcpServer);
      
      // Auto-connect to the newly added server
      const connectionResult = await connectToMcpServer(mcpServer.name, mcpRepo, env, userPrefix);
      
      return new Response(JSON.stringify({ 
        success: true, 
        server: connectionResult.server || mcpServer,
        autoConnected: connectionResult.success,
        tools: connectionResult.tools,
        message: connectionResult.success 
          ? `MCP server ${mcpServer.name} added and connected successfully`
          : `MCP server ${mcpServer.name} added but connection failed: ${connectionResult.error}`
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Update an existing MCP server
    if (serverName && path === `/api/mcp-server/${serverName}` && request.method === 'PUT') {
      const mcpServer: McpServer = await request.json();
      
      // Validate required fields
      if (!mcpServer.name) {
        return new Response(JSON.stringify({ error: 'Missing required field: name' }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Validate that url is provided
      if (!mcpServer.url) {
        return new Response(JSON.stringify({ error: 'Url must be provided' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Check if server exists
      const existingServers = await mcpRepo.getMcpServers();
      if (!existingServers.some(server => server.name === serverName)) {
        return new Response(JSON.stringify({ error: 'MCP server not found' }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Update the MCP server
      await mcpRepo.updateMcpServer(serverName, mcpServer);
      
      return new Response(JSON.stringify({ success: true, server: mcpServer }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Delete a MCP server
    if (serverName && path === `/api/mcp-server/${serverName}` && request.method === 'DELETE') {
      // Check if server exists
      const existingServers = await mcpRepo.getMcpServers();
      if (!existingServers.some(server => server.name === serverName)) {
        return new Response(JSON.stringify({ error: 'MCP server not found' }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Delete the MCP server
      await mcpRepo.deleteMcpServer(serverName);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Connect to a specific MCP server
    if (serverName && path === `/api/mcp-server/${serverName}/connect` && request.method === 'POST') {
      // Check if server exists
      const existingServers = await mcpRepo.getMcpServers();
      if (!existingServers.some(server => server.name === serverName)) {
        return new Response(JSON.stringify({ error: 'MCP server not found' }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      const connectionResult = await connectToMcpServer(serverName, mcpRepo, env, userPrefix);
      
      if (connectionResult.success) {
        return new Response(JSON.stringify({ 
          success: true,
          message: `MCP server ${serverName} connected successfully`,
          tools: connectionResult.tools
        }), {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      } else {
        return new Response(JSON.stringify({ 
          error: `Failed to connect to MCP server ${serverName}`, 
          details: connectionResult.error
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }
    
    // Disconnect from a specific MCP server
    if (serverName && path === `/api/mcp-server/${serverName}/disconnect` && request.method === 'POST') {
      // Check if server exists
      const existingServers = await mcpRepo.getMcpServers();
      const server = existingServers.find(server => server.name === serverName);
      if (!server) {
        return new Response(JSON.stringify({ error: 'MCP server not found' }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      try {
        // Clear tools and set status to disconnected
        const disconnectedServer = {
          ...server,
          tools: [],
          status: 'disconnected' as const,
          last_updated: new Date().toISOString(),
          error_message: undefined
        };
        
        await mcpRepo.updateMcpServer(serverName, disconnectedServer);
        
        return new Response(JSON.stringify({ 
          success: true,
          message: `MCP server ${serverName} disconnected successfully`
        }), {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      } catch (error) {
        console.error(`Error disconnecting MCP server ${serverName}:`, error);
        return new Response(JSON.stringify({ 
          error: `Failed to disconnect MCP server ${serverName}`, 
          details: error instanceof Error ? error.message : 'Unknown error' 
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }

    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error handling MCP server request:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
