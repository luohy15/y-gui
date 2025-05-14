import { Chat } from '../../../shared/types';
import { ChatR2Repository } from '../repository/r2/chat-r2-repository';
import { ChatD1Repository } from '../repository/d1/chat-d1-repository';
import { corsHeaders } from '../middleware/cors';
import { Env } from 'worker-configuration';

// Number of chats to process in each batch
const BATCH_SIZE = 100;

/**
 * Migrate chats from R2 to D1 in batches
 * @param request The incoming request
 * @param env Environment variables
 * @param userPrefix Optional user prefix
 * @returns Response with migration results
 */
export async function handleChatMigration(request: Request, env: Env, userPrefix?: string): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: corsHeaders
    });
  }
  
  try {
    // Create repositories
    const r2Repository = new ChatR2Repository(env.CHAT_R2, userPrefix);
    const d1Repository = new ChatD1Repository(env.CHAT_DB, userPrefix);
    
    // Initialize D1 schema
    await d1Repository.initSchema();
    
    // Get all chats from R2 using the now-public getChats method
    const allChats = await r2Repository.getChats();
    
    if (allChats.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No chats found to migrate',
        stats: { total: 0, migrated: 0, failed: 0 }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    console.log(`Retrieved ${allChats.length} total chats from R2`);
    
    // Prepare statistics
    let totalMigrated = 0;
    let totalFailed = 0;
    
    // Process chats in batches
    for (let i = 0; i < allChats.length; i += BATCH_SIZE) {
      const batch = allChats.slice(i, i + BATCH_SIZE);
      console.log(`Migrating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allChats.length / BATCH_SIZE)}, size: ${batch.length}`);
      
      try {
        const batchResult = await d1Repository.saveChats(batch);
        totalMigrated += batchResult.success;
        totalFailed += batchResult.failed;
      } catch (error) {
        console.error('Error migrating batch:', error);
        totalFailed += batch.length;
      }
    }
    
    // Return migration statistics
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Migration completed',
      stats: {
        total: allChats.length,
        migrated: totalMigrated,
        failed: totalFailed
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error during migration:', error);
    return new Response(JSON.stringify({ 
      success: false,
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
