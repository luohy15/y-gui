import { AIProvider } from './provider-interface';
import { Bot, Chat, ChatMessage, ContentBlock } from '../../../shared/types';

// Define interfaces for message content blocks
interface TextContentBlock {
  type: 'text';
  text: string;
  cache_control?: { type: string };
}

type MessageContentBlock = TextContentBlock;

/**
 * OpenAI Format Provider implementation
 * This class implements the AIProvider interface for providers using OpenAI-compatible API format
 * (OpenAI, Anthropic Claude, etc.)
 */
export class OpenAIFormatProvider implements AIProvider {
  private botConfig: Bot;
  
  /**
   * Create a new OpenAIFormatProvider
   * @param botConfig Bot configuration
   */
  constructor(botConfig: Bot) {
    this.botConfig = botConfig;
  }

  /**
   * Prepare messages for completion by adding system message and cache_control
   * @param messages Original list of messages
   * @param systemPrompt Optional system message to add at the start
   * @returns Prepared messages for the API
   */
  prepareMessagesForCompletion(
    messages: ChatMessage[] | undefined,
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
   * @returns An AsyncGenerator yielding content fragments
   */
  async *callChatCompletions(
    chat?: Chat, 
    systemPrompt?: string
  ): AsyncGenerator<string, void, unknown> {
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
      const lines = buffer.split('\n\n'); // SSE 事件通常以空行分隔
  
      // 处理完整的事件
      for (let i = 0; i < lines.length - 1; i++) {
        const event = lines[i];
        if (event.startsWith('data:')) {
          const data = event.replace('data:', '').trim();
          if (data === '[DONE]') {
            console.log('收到 [DONE]，停止处理');
            reader.cancel(); // 取消流读取
            return;
          } else {
            console.log('收到数据:', data);
            try {
              const jsonData = JSON.parse(data);
              const extractData = this.extractContentFromEvent(jsonData);
              if (extractData) {
                yield extractData;
              }
            } catch (error) {
              console.error('解析 JSON 数据时出错:', error);
            }
          }
        }
      }
  
      // 将未处理完的部分留到下一次
      buffer = lines[lines.length - 1];
    }
  }
  
  /**
   * Extract content from a parsed event
   * @param event The parsed event object
   * @returns The extracted content string or null
   */
  private extractContentFromEvent(event: any): string | null {
    // Handle OpenAI format
    if (event.choices && event.choices[0]) {
      const delta = event.choices[0].delta;
      if (delta && delta.content) {
        return delta.content;
      }
    } 
    
    return null;
  }
  
}
