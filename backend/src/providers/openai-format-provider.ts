import { BaseProvider, ProviderResponseChunk } from './provider-interface';
import { BotConfig, Chat, Message, ContentBlock } from '../../../shared/types';

// Define interfaces for message content blocks
interface TextContentBlock {
  type: 'text';
  text: string;
  cache_control?: { type: string };
}

type MessageContentBlock = TextContentBlock;

/**
 * OpenAI Format Provider implementation
 * This class implements the BaseProvider interface for providers using OpenAI-compatible API format
 * (OpenAI, Anthropic Claude, etc.)
 */
export class OpenAIFormatProvider implements BaseProvider {
  private botConfig: BotConfig;
  
  /**
   * Create a new OpenAIFormatProvider
   * @param botConfig Bot configuration
   */
  constructor(botConfig: BotConfig) {
    this.botConfig = botConfig;
  }

  /**
   * Prepare messages for completion by adding system message and cache_control
   * @param messages Original list of messages
   * @param systemPrompt Optional system message to add at the start
   * @returns Prepared messages for the API
   */
  prepareMessagesForCompletion(
    messages: Message[] | undefined,
    systemPrompt?: string
  ): any[] {
    // handle undefined messages
    if (!messages) {
      messages = [];
    }

    const preparedMessages: any[] = [];

    // Add system message if provided
    if (systemPrompt) {
      const systemMessage: any = {
        role: 'system',
        content: systemPrompt,
      };

      // Convert string content to content blocks if needed
      if (typeof systemMessage.content === 'string') {
        systemMessage.content = [
          { type: 'text', text: systemMessage.content },
        ];
      }

      // Add cache_control for Claude-3 models
      if (this.botConfig.model.includes('claude-3')) {
        for (const part of systemMessage.content as MessageContentBlock[]) {
          if (part.type === 'text') {
            part.cache_control = { type: 'ephemeral' };
          }
        }
      }

      preparedMessages.push(systemMessage);
    }

    // Add original messages
    for (const msg of messages) {
      const msgDict: any = { 
        role: msg.role,
        content: msg.content
      };
      
      // Convert string content to content blocks if needed
      if (typeof msgDict.content === 'string') {
        msgDict.content = [{ type: 'text', text: msgDict.content }];
      } else if (Array.isArray(msgDict.content)) {
        // Make a deep copy of content blocks
        msgDict.content = msgDict.content.map((part: ContentBlock) => ({...part}));
      }

      preparedMessages.push(msgDict);
    }

    // Find last user message and add cache_control for Claude-3 models
    if (this.botConfig.model.includes('claude-3')) {
      for (let i = preparedMessages.length - 1; i >= 0; i--) {
        const msg = preparedMessages[i];
        if (msg.role === 'user') {
          if (typeof msg.content === 'string') {
            msg.content = [{ type: 'text', text: msg.content }];
          }
          
          // Find text parts
          const textParts = msg.content.filter((part: MessageContentBlock) => part.type === 'text');
          if (textParts.length > 0) {
            const lastTextPart = textParts[textParts.length - 1];
            lastTextPart.cache_control = { type: 'ephemeral' };
          } else {
            // Add a text part if none exists
            const newTextPart = { type: 'text', text: '...', cache_control: { type: 'ephemeral' } };
            msg.content.push(newTextPart);
          }
          break;
        }
      }
    }

    return preparedMessages;
  }

  /**
   * Generate a response from the provider as an async generator
   * @param messages List of chat messages
   * @param chat Optional chat object
   * @param systemPrompt Optional system prompt
   * @returns An AsyncGenerator yielding content fragments and provider info
   */
  async *callChatCompletions(
    chat?: Chat, 
    systemPrompt?: string
  ): AsyncGenerator<ProviderResponseChunk, void, unknown> {
    // Prepare messages with system prompt
    const preparedMessages = this.prepareMessagesForCompletion(chat?.messages, systemPrompt);
    
    // Use a more flexible type for the request body
    const body: Record<string, any> = {
      model: this.botConfig.model,
      messages: preparedMessages,
      stream: true
    };
    
    // Add provider if specified in openrouter_config
    if (this.botConfig.openrouter_config && this.botConfig.openrouter_config.provider) {
      body.provider = this.botConfig.openrouter_config.provider;
    }
    
    // Add max_tokens if specified
    if (this.botConfig.max_tokens) {
      body.max_tokens = this.botConfig.max_tokens;
    }
    
    // Add reasoning_effort if specified
    if (this.botConfig.reasoning_effort) {
      body.reasoning_effort = this.botConfig.reasoning_effort;
    }
    
    // Add include_reasoning for deepseek models
    if (this.botConfig.model.includes('deepseek-r1')) {
      body.include_reasoning = true;
    }
    
    const apiKey = this.botConfig.api_key;
    const baseUrl = this.botConfig.base_url;
    const apiPath = this.botConfig.custom_api_path || '/chat/completions';
    
    const response = await fetch(`${baseUrl}${apiPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://luohy15.com',
        'X-Title': 'y-gui',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const reader = response.body!.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
  
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
  
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
  
      for (let i = 0; i < lines.length - 1; i++) {
        const event = lines[i];
        if (event.startsWith('data:')) {
          const data = event.replace('data:', '').trim();
          if (data === '[DONE]') {
            reader.cancel();
            return;
          } else {
            try {
              const jsonData = JSON.parse(data);
              const responseData = this.extractChunk(jsonData);
              if (responseData) {
                yield responseData;
              }
            } catch (error) {
              console.error('Error in json parse', error);
            }
          }
        }
      }
  
      buffer = lines[lines.length - 1];
    }
  }
  
  /**
   * Extract content and provider info from a parsed event
   * @param event The parsed event object
   * @returns The extracted provider response data or null
   */
  private extractChunk(event: any): ProviderResponseChunk | null {
    // Handle OpenAI format
    if (event.choices && event.choices[0]) {
      const delta = event.choices[0].delta;
      if (delta) {
        return {
          content: delta.content,
          reasoningContent: delta.reasoning_content,
          provider: event.provider,
          model: event.model
        };
      }
    } 
    
    return null;
  }
  
}
