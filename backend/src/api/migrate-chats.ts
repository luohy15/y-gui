import { corsHeaders } from '../middleware/cors';
import { Env } from 'worker-configuration';

export async function handleMigrateChatsRequest(request: Request, env: Env): Promise<Response> {
  try {
    // List all KV keys
    const keys = await env.CHAT_KV.list();
    
    const migrationResults = [];
    
    // Process each key
    for (const key of keys.keys) {
      // Extract user prefix (everything before :chats)
      const userPrefix = key.name.split(':chats')[0];
      
      // Get content from KV
      const content = await env.CHAT_KV.get(key.name, 'text');
      
      if (content) {
        // Write directly to R2
        const r2Key = `${userPrefix}/chat.jsonl`;
        await env.CHAT_R2.put(r2Key, content);
        
        migrationResults.push({
          source: key.name,
          destination: r2Key,
          status: 'success'
        });
      }
    }
    
    return new Response(JSON.stringify({
      migrated: migrationResults,
      total: migrationResults.length
    }), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({ 
      error: 'Migration failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
