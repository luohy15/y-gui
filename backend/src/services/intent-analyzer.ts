/**
 * Intent analyzer for smart routing decisions.
 */

import { RoutingDecision } from '../../../shared/types';

export class IntentAnalyzer {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  private static readonly ANALYSIS_SYSTEM_PROMPT = `You are a routing assistant. Analyze the user's query and decide:
1. Does this need WEB SEARCH? No (0) or Yes (1)?
2. Should this use a QUICK (0) or THINK (1) model?
3. If THINK, what reasoning effort? (low/medium/high)

Use WEB SEARCH (1) when:
- Query mentions "latest", "current", "today", "recent", "2024", "2025"
- Query contains "web search", or explicitly asks to search
- Asking about news, events, or updates
- Needs real-time or very recent information

Use THINK model (1) for:
- Complex reasoning, analysis, or explanations
- Math problems, proofs, or calculations
- Multi-step problems
- Deep technical questions
- Code debugging or optimization

Reasoning effort levels:
- LOW: Simple explanations, basic reasoning
- MEDIUM: Moderate complexity, some analysis needed
- HIGH: Complex proofs, deep analysis, multi-step reasoning

Use QUICK model (0) for:
- Simple questions
- General knowledge
- Basic facts
- Short answers

Response format:
- Quick model: <search>,<model>
- Think model: <search>,<model>,<effort>

Examples:
- "What is Python?" → 0,0
- "Latest AI news?" → 1,0
- "Explain how quicksort works" → 0,1,medium
- "Prove why quicksort is O(n log n)" → 0,1,high
- "Analyze recent quantum breakthroughs" → 1,1,medium
- "What's 2+2?" → 0,1,low`;

  constructor(baseUrl: string, apiKey: string, model: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Simple LLM call using fetch
   */
  private async callLLM(systemMessage: string, userMessage: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://luohy15.com',
        'X-Title': 'y-gui',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`LLM call failed: ${response.statusText}`);
    }

    const result = await response.json() as any;
    const responseContent = result.choices[0].message.content;
    return responseContent;
  }

  /**
   * Analyze message using LLM and return routing decision
   */
  async analyze(message: string): Promise<RoutingDecision> {
    try {
      // Call the analyzer model (quick model)
      const responseText = await this.callLLM(
        IntentAnalyzer.ANALYSIS_SYSTEM_PROMPT,
        `Query: ${message}`
      );

      // Parse response (e.g., "0,1" or "1,0,high")
      const trimmedResponse = responseText.trim();
      const parts = trimmedResponse.split(',');

      const searchChoice = parseInt(parts[0].trim());
      const modelChoice = parseInt(parts[1].trim());

      const useThink = modelChoice === 1;
      const useSearch = searchChoice === 1;

      // Extract reasoning effort if present
      let reasoningEffort = 'medium'; // default
      if (useThink && parts.length >= 3) {
        const effort = parts[2].trim().toLowerCase();
        if (['low', 'medium', 'high'].includes(effort)) {
          reasoningEffort = effort;
        }
      }

      return {
        use_think_model: useThink,
        use_web_search: useSearch,
        reasoning_effort: reasoningEffort
      };
    } catch (error) {
      // Fallback to safe defaults if parsing fails
      console.error('Intent analysis error:', error);
      return {
        use_think_model: false,  // Default to quick
        use_web_search: false,
        reasoning_effort: 'medium'
      };
    }
  }
}
