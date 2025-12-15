import { Chat, Message, RoutingDecision } from '../../../shared/types';

/**
 * Common interface for AI providers
 * This interface defines the contract that all AI providers must implement
 */

// Response data from the provider
export interface ProviderResponseChunk {
  content: string | null,
  reasoningContent: string | null,
  provider: string | null,
  model: string | null,
  links: string[] | null
}

export interface BaseProvider {
  /**
   * Generate a response from the AI provider
   * @param messages List of chat messages
   * @param systemPrompt Optional system prompt
   * @param decision Optional routing decision for smart routing
   * @returns An AsyncGenerator yielding content fragments and provider info as they arrive
   */
  callChatCompletions(
    messages: Message[],
    systemPrompt?: string,
    decision?: RoutingDecision
  ): AsyncGenerator<ProviderResponseChunk, void, unknown>;
}
