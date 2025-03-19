import { BotConfig } from '../../../shared/types';
import { corsHeaders } from '../middleware/cors';
import { BotR2Repository } from '../repository/bot-r2-repository';

interface Env {
  CHAT_R2: R2Bucket;
}

export async function handleBotRequest(request: Request, env: Env, userPrefix?: string): Promise<Response> {
  const botRepo = new BotR2Repository(env.CHAT_R2, userPrefix);
  const url = new URL(request.url);
  const path = url.pathname;
  const pathParts = path.split('/');
  const botName = pathParts.length > 3 ? pathParts[3] : null;

  try {
    // Get bot configurations
    if (path === '/api/bots' && request.method === 'GET') {
      const bots = await botRepo.getBots();
      return new Response(JSON.stringify(bots), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    // Add a new bot
    if (path === '/api/bot' && request.method === 'POST') {
      const botConfig: BotConfig = await request.json();
      
      // Validate required fields
      if (!botConfig.name || !botConfig.model || !botConfig.base_url) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Check if bot with same name already exists
      const existingBots = await botRepo.getBots();
      if (existingBots.some(bot => bot.name === botConfig.name)) {
        return new Response(JSON.stringify({ error: 'Bot with this name already exists' }), {
          status: 409,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Add the bot
      await botRepo.addBot(botConfig);
      
      return new Response(JSON.stringify({ success: true, bot: botConfig }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Update an existing bot
    if (botName && path === `/api/bot/${botName}` && request.method === 'PUT') {
      const botConfig: BotConfig = await request.json();
      
      // Validate required fields
      if (!botConfig.name || !botConfig.model || !botConfig.base_url) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Check if bot exists
      const existingBots = await botRepo.getBots();
      if (!existingBots.some(bot => bot.name === botName)) {
        return new Response(JSON.stringify({ error: 'Bot not found' }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Update the bot
      await botRepo.updateBot(botName, botConfig);
      
      return new Response(JSON.stringify({ success: true, bot: botConfig }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Delete a bot
    if (botName && path === `/api/bot/${botName}` && request.method === 'DELETE') {
      // Check if bot exists
      const existingBots = await botRepo.getBots();
      if (!existingBots.some(bot => bot.name === botName)) {
        return new Response(JSON.stringify({ error: 'Bot not found' }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Delete the bot
      await botRepo.deleteBot(botName);
      
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
    console.error('Error handling bot request:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
