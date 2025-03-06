import { generateToken, AuthResponse } from '../utils/auth';
import { corsHeaders } from '../middleware/cors';

interface Env {
  SECRET_KEY: string;
}

export async function handleAuthRequest(request: Request, env: Env): Promise<Response> {
  // Only handle /api/auth/login endpoint
  const url = new URL(request.url);
  if (url.pathname !== '/api/auth/login') {
    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  try {
    const { secretKey } = await request.json() as { secretKey: string };

    if (secretKey !== env.SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Invalid secret key' }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    const token = await generateToken(secretKey);
    const response: AuthResponse = { token };

    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
