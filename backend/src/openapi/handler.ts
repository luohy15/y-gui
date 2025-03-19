import { corsHeaders } from '../middleware/cors';
import { swaggerUiHtml } from './ui';
import { schemas, securitySchemes } from './schemas';
import { authPaths } from './paths/auth';
import { chatPaths } from './paths/chat';
import { toolPaths } from './paths/tool';
import { botPaths } from './paths/bot';
import { mcpServerPaths } from './paths/mcp-server';

// Handler for OpenAPI documentation endpoints
export async function handleApiDocs(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/docs/openapi.json' && request.method === 'GET') {
    // Generate the OpenAPI specification
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'y-gui API',
        description: 'API for y-gui chat application',
        version: '1.0.0',
      },
      servers: [
        {
          url: '/',
          description: 'Current server',
        },
      ],
      components: {
        securitySchemes,
        schemas,
      },
      paths: {
        ...authPaths,
        ...chatPaths,
        ...toolPaths,
        ...botPaths,
        ...mcpServerPaths,
      },
    };

    return new Response(JSON.stringify(openApiSpec), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  if (path === '/api/docs' && request.method === 'GET') {
    return new Response(swaggerUiHtml, {
      headers: {
        'Content-Type': 'text/html',
        ...corsHeaders,
      },
    });
  }

  return new Response('Not Found', {
    status: 404,
    headers: corsHeaders,
  });
}
