import { McpServerConfig } from '../../../shared/types';
import { corsHeaders } from '../middleware/cors';
import { McpServerR2Repository } from '../repository/mcp-server-repository';

interface Env {
  CHAT_R2: R2Bucket;
}

export async function handleMcpServerRequest(request: Request, env: Env, userPrefix?: string): Promise<Response> {
  const mcpRepo = new McpServerR2Repository(env.CHAT_R2, userPrefix);
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
    // Add a new MCP server
    if (path === '/api/mcp-server' && request.method === 'POST') {
      const mcpServerConfig: McpServerConfig = await request.json();
      
      // Validate required fields
      if (!mcpServerConfig.name) {
        return new Response(JSON.stringify({ error: 'Missing required field: name' }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Validate that either command+args or url is provided
      if ((!mcpServerConfig.command || !mcpServerConfig.args) && !mcpServerConfig.url) {
        return new Response(JSON.stringify({ error: 'Either command+args or url must be provided' }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Check if server with same name already exists
      const existingServers = await mcpRepo.getMcpServers();
      if (existingServers.some(server => server.name === mcpServerConfig.name)) {
        return new Response(JSON.stringify({ error: 'MCP server with this name already exists' }), {
          status: 409,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Add the MCP server
      await mcpRepo.addMcpserver(mcpServerConfig);
      
      return new Response(JSON.stringify({ success: true, server: mcpServerConfig }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Update an existing MCP server
    if (serverName && path === `/api/mcp-server/${serverName}` && request.method === 'PUT') {
      const mcpServerConfig: McpServerConfig = await request.json();
      
      // Validate required fields
      if (!mcpServerConfig.name) {
        return new Response(JSON.stringify({ error: 'Missing required field: name' }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Validate that either command+args or url is provided
      if ((!mcpServerConfig.command || !mcpServerConfig.args) && !mcpServerConfig.url) {
        return new Response(JSON.stringify({ error: 'Either command+args or url must be provided' }), {
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
      await mcpRepo.updateMcpServer(serverName, mcpServerConfig);
      
      return new Response(JSON.stringify({ success: true, server: mcpServerConfig }), {
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
