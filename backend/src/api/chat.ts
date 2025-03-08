import { Chat, ChatMessage } from '../../../shared/types';
import { KVR2ChatRepository } from '../repository/kv-r2-repository';
import { ConfigR2Repository } from '../repository/config-r2-repository';
import { corsHeaders } from '../middleware/cors';
import { validateAuth } from '../utils/auth';
import { ProviderFactory } from '../providers/provider-factory';

interface Env {
  CHAT_KV: KVNamespace;
  CHAT_R2: R2Bucket;
  SECRET_KEY: string;
}

export async function handleChatsRequest(request: Request, env: Env): Promise<Response> {
  // Validate authentication for all chat endpoints
  const isAuthenticated = await validateAuth(request, env.SECRET_KEY);
  if (!isAuthenticated) {
    return new Response('Unauthorized', { 
      status: 401,
      headers: corsHeaders
    });
  }

  const storage = new KVR2ChatRepository(env.CHAT_KV, env.CHAT_R2);
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // List chats
    if (path === '/api/chats' && request.method === 'GET') {
      const searchParams = new URL(request.url).searchParams;
      const options = {
        search: searchParams.get('search') || undefined,
        page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
      };
      
      const result = await storage.listChats(options);
      return new Response(JSON.stringify(result), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Get single chat
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

    // Create chat
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

    // Send message to chat (completions endpoint)
    if (path === '/api/chat/completions' && request.method === 'POST') {
      // Get message data from request
      interface CompletionRequest {
        content: string;
        botName: string;
        chatId: string;
      }
      const completionData = await request.json() as CompletionRequest;
      const { content, botName, chatId } = completionData;
      
      if (!chatId) {
        return new Response('Chat ID is required', { 
          status: 400,
          headers: corsHeaders
        });
      }
      
      // Get the chat
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return new Response('Chat not found', { 
          status: 404,
          headers: corsHeaders
        });
      }
      
      // Validate request data
      
      if (!content) {
        return new Response('Message content is required', { 
          status: 400,
          headers: corsHeaders
        });
      }
      
      if (!botName) {
        return new Response('Bot name is required', { 
          status: 400,
          headers: corsHeaders
        });
      }
      
      // Get bot configurations
      const configRepo = new ConfigR2Repository(env.CHAT_R2);
      const bots = await configRepo.getBots();
      
      // Find the specified bot
      const bot = bots.find(b => b.name === botName);
      if (!bot) {
        return new Response(`Bot "${botName}" not found`, { 
          status: 404,
          headers: corsHeaders
        });
      }
      
      // Create provider directly using the factory
      const provider = ProviderFactory.createProvider(bot);
      
      // Create user message
      const userMessage: ChatMessage = {
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
        unix_timestamp: Math.floor(Date.now() / 1000)
      };
      
      // Add user message to chat
      chat.messages.push(userMessage);
      chat.update_time = new Date().toISOString();
      
      // Save chat with user message
      await storage.saveChat(chat);
      
      try {
        // Create a new assistant message with initial empty content
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          unix_timestamp: Math.floor(Date.now() / 1000),
          model: bot.model,
          provider: bot.name
        };
        
        // Get response generator from provider
        const responseGenerator = provider.callChatCompletions(chat, bot.reasoning_effort);
        
        // Create a TransformStream for the SSE response
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();
        
        let accumulatedContent = '';
        
        // Process the generator
        (async () => {
          try {
            // Use for await...of to consume the generator
            for await (const contentDelta of responseGenerator) {
              // Accumulate content
              accumulatedContent += contentDelta;
              
              // Create a response chunk with only the necessary data
              const responseChunk = {
                choices: [{
                  delta: {
                    content: contentDelta,
                  }
                }],
                model: bot.model,
                provider: bot.name
              };
              
              // Write the chunk to the output stream
              await writer.write(encoder.encode(`data: ${JSON.stringify(responseChunk)}\n\n`));
            }

            // Update the assistant message in the chat
            assistantMessage.content = accumulatedContent;

            // Add assistant message to chat
            chat.messages.push(assistantMessage);
            
            // Final update to the chat in storage
            chat.update_time = new Date().toISOString();
            await storage.saveChat(chat);
            
            // Close the writer
            await writer.close();
          } catch (error) {
            console.error('Error processing stream:', error);
            writer.abort(error);
          }
        })();
        
        // Return the readable stream as a streaming response
        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            ...corsHeaders
          }
        });
      } catch (error) {
        console.error('Error generating response:', error);
        return new Response(JSON.stringify({ error: 'Error generating response' }), {
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
    console.error('Error handling chats request:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
