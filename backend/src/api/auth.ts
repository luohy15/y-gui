import { validateAuth, extractUserInfo } from '../utils/auth';
import { corsHeaders } from '../middleware/cors';

interface Env {
}

export async function handleAuthRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  
  // User info endpoint
  if (url.pathname === '/api/auth/userinfo' && request.method === 'GET') {
    // Validate Auth0 token
    if (!(await validateAuth(request))) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        throw new Error('Invalid authorization header');
      }
      
      const token = authHeader.slice(7);
      const userInfo = extractUserInfo(token);
      
      return new Response(JSON.stringify(userInfo), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
  
  // Return 404 for any other auth endpoints
  return new Response('Not Found', { 
    status: 404,
    headers: corsHeaders
  });
}
