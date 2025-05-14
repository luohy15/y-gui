import { Chat, Message } from '../../../shared/types';

/**
 * Common interface for AI providers
 * This interface defines the contract that all AI providers must implement
 */

// Response data from the provider
export interface ProviderResponseChunk {
  content: string | null,
  reasoningContent: string | null,
  provider: string | null,
  model: string | null
}

export interface BaseProvider {
  /**
   * Generate a response from the AI provider
   * @param messages List of chat messages
   * @param systemPrompt Optional system prompt
   * @returns An AsyncGenerator yielding content fragments and provider info as they arrive
   */
  callChatCompletions(
    messages: Message[], 
    systemPrompt?: string
  ): AsyncGenerator<ProviderResponseChunk, void, unknown>;
}
