import { BotConfig } from '../../../shared/types';
import { BaseProvider } from './provider-interface';
import { OpenAIFormatProvider } from './openai-format-provider';

/**
 * Factory for creating AI providers
 * This class creates provider instances on-demand based on bot configurations
 */
export class ProviderFactory {
  /**
   * Create a provider for a specific bot configuration
   * @param botConfig The bot configuration
   * @returns An BaseProvider instance for the bot
   */
  static createProvider(botConfig: BotConfig): BaseProvider {
    try {
      // For now, we'll use OpenAIFormatProvider for all bots
      // In the future, we can add more provider types based on api_type
      return new OpenAIFormatProvider(botConfig);
    } catch (error) {
      console.error(`Failed to create provider for bot: ${botConfig.name}`, error);
      throw error;
    }
  }
}
