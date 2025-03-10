import { corsHeaders } from '../middleware/cors';
import { validateAuth } from '../utils/auth';

interface Env {
  CHAT_KV: KVNamespace;
  CHAT_R2: R2Bucket;
  SECRET_KEY: string;
}

/**
 * Handle tool execution confirmation
 * This endpoint allows clients to confirm or cancel tool execution
 */
export async function handleToolConfirmation(request: Request, env: Env): Promise<Response> {
  // Validate authentication
  const isAuthenticated = await validateAuth(request, env.SECRET_KEY);
  if (!isAuthenticated) {
    return new Response('Unauthorized', { 
      status: 401,
      headers: corsHeaders
    });
  }

  try {
    // Parse request body
    interface ConfirmationRequest {
      chatId: string;
      toolId: string;
      confirmed: boolean;
    }
    
    const confirmationData = await request.json() as ConfirmationRequest;
    const { chatId, toolId, confirmed } = confirmationData;
    
    // Validate request data
    if (!chatId) {
      return new Response('Chat ID is required', { 
        status: 400,
        headers: corsHeaders
      });
    }
    
    if (!toolId) {
      return new Response('Tool ID is required', { 
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Store confirmation status in KV
    // The key format is: tool_confirmation:{chatId}:{toolId}
    const key = `tool_confirmation:${chatId}:${toolId}`;
    await env.CHAT_KV.put(key, JSON.stringify({
      confirmed,
      timestamp: Date.now()
    }));
    
    // Return success response
    return new Response(JSON.stringify({ 
      status: 'success',
      confirmed
    }), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error handling tool confirmation:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * Check if a tool execution has been confirmed
 * @param env Environment with KV namespace
 * @param chatId Chat ID
 * @param toolId Tool ID
 * @returns Promise resolving to confirmation status or null if not found
 */
export async function getToolConfirmation(
  env: Env, 
  chatId: string, 
  toolId: string
): Promise<{ confirmed: boolean; timestamp: number } | null> {
  try {
    const key = `tool_confirmation:${chatId}:${toolId}`;
    const value = await env.CHAT_KV.get(key);
    
    if (!value) {
      return null;
    }
    
    return JSON.parse(value);
  } catch (error) {
    console.error('Error getting tool confirmation:', error);
    return null;
  }
}
