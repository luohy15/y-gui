import { Chat } from '../../../shared/types';

/**
 * Common interface for AI providers
 * This interface defines the contract that all AI providers must implement
 */

// Response data from the provider
export interface ProviderResponseData {
  content: string;
  provider?: string;
  model?: string;
}

export interface AIProvider {
  /**
   * Generate a response from the AI provider
   * @param messages List of chat messages
   * @param chat Optional chat object
   * @param systemPrompt Optional system prompt
   * @returns An AsyncGenerator yielding content fragments and provider info as they arrive
   */
  callChatCompletions(
    chat?: Chat, 
    systemPrompt?: string
  ): AsyncGenerator<ProviderResponseData, void, unknown>;
}
