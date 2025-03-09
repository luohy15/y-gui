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

      const chat = await storage.getOrCreateChat(id);

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
      const resultChat = await storage.saveChat(chatData);
      return new Response(JSON.stringify(resultChat), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Get a new unique chat ID
    if (path === '/api/chat/id' && request.method === 'GET') {
      // Generate a new ID
      let newId = '';
      let exists = true;
      
      // Keep generating IDs until we find one that doesn't exist
      while (exists) {
        newId = Array.from(crypto.getRandomValues(new Uint8Array(3)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .substring(0, 6);
        
        // Check if this ID already exists
        const chat = await storage.getChat(newId);
        exists = chat !== null;
      }
      
      return new Response(JSON.stringify({ id: newId }), {
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
      
      // Get or create the chat
      const chat = await storage.getOrCreateChat(chatId);
      
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
        let lastProvider: string | undefined;
        let lastModel: string | undefined;
        
        // Process the generator
        (async () => {
          try {
            // Use for await...of to consume the generator
            for await (const contentDelta of responseGenerator) {
              // Accumulate content
              accumulatedContent += contentDelta.content;
              
              // Store provider and model information if available
              if (contentDelta.provider) {
                lastProvider = contentDelta.provider;
              }
              if (contentDelta.model) {
                lastModel = contentDelta.model;
              }
              
              // Create a response chunk with only the necessary data
              const responseChunk = {
                choices: [{
                  delta: {
                    content: contentDelta.content,
                  }
                }],
                model: contentDelta.model || bot.model,
                provider: contentDelta.provider || bot.name
              };
              
              // Write the chunk to the output stream
              await writer.write(encoder.encode(`data: ${JSON.stringify(responseChunk)}\n\n`));
            }

            // Update the assistant message in the chat
            assistantMessage.content = accumulatedContent;
            
            // Update provider and model if they were provided in the response
            if (lastProvider) {
              assistantMessage.provider = lastProvider;
            }
            if (lastModel) {
              assistantMessage.model = lastModel;
            }

            // Add assistant message to chat
            chat.messages.push(assistantMessage);
            
            // Final update to the chat in storage
            chat.update_time = new Date().toISOString();
            await storage.saveChat(chat);

            await writer.write(encoder.encode(`data: [DONE]\n\n`));
            
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
