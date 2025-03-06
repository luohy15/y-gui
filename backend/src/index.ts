import { Chat, StorageRepository } from '../../shared/types';

interface Env {
  CHAT_KV: KVNamespace;
  CHAT_R2: R2Bucket;
  SECRET_KEY: string;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

interface AuthResponse {
  token: string;
}

async function generateToken(secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secretKey + Date.now());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validateAuth(request: Request, env: Env): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.slice(7);
  // In a real application, you would validate the token more securely
  // For now, we'll just check if it's a valid SHA-256 hash
  return /^[a-f0-9]{64}$/.test(token);
}

class KVStorageRepository implements StorageRepository {
  constructor(private kv: KVNamespace, private r2: R2Bucket) {}

  async getChat(id: string) {
    const chat = await this.kv.get(`chat:${id}`, 'json');
    return chat as Chat | null;
  }

  async listChats() {
    const list = await this.kv.list({ prefix: 'chat:' });
    const chats = await Promise.all(
      list.keys.map(key => this.kv.get(key.name, 'json'))
    );
    return chats.filter((chat): chat is Chat => chat !== null);
  }

  async saveChat(chat: Chat) {
    await this.kv.put(`chat:${chat.id}`, JSON.stringify(chat));
    // Backup to R2
    await this.r2.put(`chats/${chat.id}.json`, JSON.stringify(chat));
  }

  async deleteChat(id: string) {
    await this.kv.delete(`chat:${id}`);
    await this.r2.delete(`chats/${id}.json`);
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function handleCors(request: Request) {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  return corsHeaders;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const storage = new KVStorageRepository(env.CHAT_KV, env.CHAT_R2);
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleCors(request);
    }

    try {
      console.log('Handling request:', request.method, path);

      // Handle API routes first
      if (path.startsWith('/api/')) {
        // Handle login endpoint
        console.log('Checking login endpoint match:', path === '/api/auth/login');
        if (path === '/api/auth/login') {
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
            console.log('Parsing login request body');
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

        // Authenticate all other endpoints except login
        if (!path.startsWith('/api/auth/')) {
          const isAuthenticated = await validateAuth(request, env);
          if (!isAuthenticated) {
            return new Response('Unauthorized', { 
              status: 401,
              headers: corsHeaders
            });
          }
        }

        if (path === '/api/chats' && request.method === 'GET') {
          const chats = await storage.listChats();
          return new Response(JSON.stringify(chats), {
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        if (path.startsWith('/api/chats/') && request.method === 'GET') {
          const id = path.split('/').pop();
          if (!id) {
            return new Response('Invalid chat ID', { 
              status: 400,
              headers: corsHeaders
            });
          }

          const chat = await storage.getChat(id);
          if (!chat) {
            return new Response('Chat not found', { 
              status: 404,
              headers: corsHeaders
            });
          }

          return new Response(JSON.stringify(chat), {
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        if (path === '/api/chats' && request.method === 'POST') {
          const chatData = await request.json() as Chat;
          await storage.saveChat(chatData);
          return new Response(JSON.stringify(chatData), {
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        if (path.startsWith('/api/chats/') && request.method === 'DELETE') {
          const id = path.split('/').pop();
          if (!id) {
            return new Response('Invalid chat ID', { status: 400 });
          }

          await storage.deleteChat(id);
          return new Response(null, { 
            status: 204,
            headers: corsHeaders
          });
        }

        return new Response('Not Found', { 
          status: 404,
          headers: corsHeaders
        });
      }

      // For non-API routes, serve static assets using ASSETS binding
      return env.ASSETS.fetch(request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
      return new Response(errorMessage, { status: 500 });
    }
  }
};
