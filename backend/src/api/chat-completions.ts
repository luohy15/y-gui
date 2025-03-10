import { Chat, ChatMessage } from '../../../shared/types';
import { KVR2ChatRepository } from '../repository/kv-r2-repository';
import { ConfigR2Repository } from '../repository/config-r2-repository';
import { corsHeaders } from '../middleware/cors';
import { ProviderFactory } from '../providers/provider-factory';
import { McpManager } from '../mcp/mcp-manager';
import { containsToolUse, splitContent, extractMcpToolUse } from '../utils/tool-parser';
import { getToolConfirmation } from './tool-confirmation';
import { getSystemPrompt } from '../utils/system-prompt';

interface Env {
  CHAT_KV: KVNamespace;
  CHAT_R2: R2Bucket;
  SECRET_KEY: string;
}

/**
 * Handle the chat completions endpoint
 * This function processes requests to send messages to a chat and get AI responses
 */
export async function handleChatCompletions(request: Request, env: Env): Promise<Response> {
  try {
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
    const storage = new KVR2ChatRepository(env.CHAT_KV, env.CHAT_R2);
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

    // Initialize MCP servers for the selected bot
    const mcpManager = new McpManager(configRepo);
    await mcpManager.initMcpServersForBot(bot);

    // Get system prompt
    const systemPrompt = await getSystemPrompt(mcpManager);
    
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
      // Create a TransformStream for the SSE response
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      
      // Function to generate a unique tool ID
      const generateToolId = () => {
        return Array.from(crypto.getRandomValues(new Uint8Array(4)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      };
      
      // Process the response and handle tool execution
      (async () => {
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
          const responseGenerator = provider.callChatCompletions(chat, systemPrompt);
          
          let accumulatedContent = '';
          let lastProvider: string | undefined;
          let lastModel: string | undefined;
          
          // Stream the initial response
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
          
          // Check if the response contains tool use
          if (containsToolUse(accumulatedContent)) {
            // Split content into plain text and tool parts
            const [plainContent, toolContent] = splitContent(accumulatedContent);
            
            // Update the assistant message with only the plain text part
            assistantMessage.content = plainContent;
            
            // Add assistant message to chat
            chat.messages.push(assistantMessage);
            chat.update_time = new Date().toISOString();
            await storage.saveChat(chat);
            
            // Reuse the existing mcpManager instance for tool execution
            const mcpTool = extractMcpToolUse(toolContent!);
            
            if (mcpTool) {
              const [serverName, toolName, args] = mcpTool;
              const toolId = generateToolId();
              
              // Send tool execution confirmation request to client
              const confirmationRequest = {
                tool_execution: {
                  status: 'pending_confirmation',
                  tool_id: toolId,
                  server: serverName,
                  tool: toolName,
                  arguments: args
                }
              };
              
              await writer.write(encoder.encode(`data: ${JSON.stringify(confirmationRequest)}\n\n`));
              
              // Wait for confirmation (poll KV store)
              let confirmed = false;
              let cancelled = false;
              let attempts = 0;
              const maxAttempts = 60; // 30 seconds (500ms intervals)
              
              while (attempts < maxAttempts) {
                const confirmation = await getToolConfirmation(env, chatId, toolId);
                
                if (confirmation) {
                  confirmed = confirmation.confirmed;
                  cancelled = !confirmation.confirmed;
                  break;
                }
                
                // Wait before checking again
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
              }
              
              if (cancelled) {
                // Tool execution was cancelled
                const cancellationNotification = {
                  tool_execution: {
                    status: 'cancelled',
                    tool_id: toolId,
                    reason: 'User cancelled execution'
                  }
                };
                
                await writer.write(encoder.encode(`data: ${JSON.stringify(cancellationNotification)}\n\n`));
                await writer.write(encoder.encode(`data: [DONE]\n\n`));
                return;
              }
              
              if (confirmed) {
                // Tool execution was confirmed
                const executionStartedNotification = {
                  tool_execution: {
                    status: 'executing',
                    tool_id: toolId
                  }
                };
                
                await writer.write(encoder.encode(`data: ${JSON.stringify(executionStartedNotification)}\n\n`));
                
                try {
                  // Execute the tool
                  const toolResult = await mcpManager.executeTool(serverName, toolName, args);
                  
                  // Send tool execution result to client
                  const executionCompletedNotification = {
                    tool_execution: {
                      status: 'completed',
                      tool_id: toolId,
                      result: toolResult
                    }
                  };
                  
                  await writer.write(encoder.encode(`data: ${JSON.stringify(executionCompletedNotification)}\n\n`));
                  
                  // Create a new user message with the tool result
                  const toolResultMessage: ChatMessage = {
                    role: 'user',
                    content: toolResult,
                    timestamp: new Date().toISOString(),
                    unix_timestamp: Math.floor(Date.now() / 1000)
                  };
                  
                  // Add tool result message to chat
                  chat.messages.push(toolResultMessage);
                  chat.update_time = new Date().toISOString();
                  await storage.saveChat(chat);
                  
                  // Signal completion of the stream
                  await writer.write(encoder.encode(`data: [DONE]\n\n`));
                } catch (error) {
                  // Tool execution failed
                  console.error('Error executing tool:', error);
                  
                  const executionFailedNotification = {
                    tool_execution: {
                      status: 'failed',
                      tool_id: toolId,
                      error: error instanceof Error ? error.message : String(error)
                    }
                  };
                  
                  await writer.write(encoder.encode(`data: ${JSON.stringify(executionFailedNotification)}\n\n`));
                  await writer.write(encoder.encode(`data: [DONE]\n\n`));
                }
              } else {
                // Confirmation timed out
                const timeoutNotification = {
                  tool_execution: {
                    status: 'timeout',
                    tool_id: toolId
                  }
                };
                
                await writer.write(encoder.encode(`data: ${JSON.stringify(timeoutNotification)}\n\n`));
                await writer.write(encoder.encode(`data: [DONE]\n\n`));
              }
            } else {
              // No valid tool use detected
              await writer.write(encoder.encode(`data: [DONE]\n\n`));
            }
          } else {
            // No tool use, update and save assistant message
            assistantMessage.content = accumulatedContent;
            
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
            
            // Signal completion of the stream
            await writer.write(encoder.encode(`data: [DONE]\n\n`));
          }
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
  } catch (error) {
    console.error('Error handling chat completions:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
