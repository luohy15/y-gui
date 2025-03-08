import { Chat } from '../../../shared/types';

/**
 * Common interface for AI providers
 * This interface defines the contract that all AI providers must implement
 */

export interface AIProvider {
  /**
   * Generate a response from the AI provider
   * @param messages List of chat messages
   * @param chat Optional chat object
   * @param systemPrompt Optional system prompt
   * @returns An AsyncGenerator yielding content fragments as they arrive
   */
  callChatCompletions(
    chat?: Chat, 
    systemPrompt?: string
  ): AsyncGenerator<string, void, unknown>;
}
