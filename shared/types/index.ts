export interface Chat {
  id: string;
  messages: Message[];
  create_time: string;
  update_time: string;
  content_hash?: string;
  origin_chat_id?: string; // Stores the original chat ID for shared chats
  origin_message_id?: string; // Stores the original message ID for shared chats
  selected_message_id?: string;
}

export interface ContentBlock {
  type: 'text';
  text: string;
}

export interface ProviderResponse {
  content: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
  timestamp: string;
  unix_timestamp: number;
  id?: string;
  parent_id?: string;
  model?: string;
  provider?: string;
  reasoning_content?: string;
  reasoning_effort?: string;
  server?: string;
  tool?: string;
  arguments?: string | Record<string, any>;
  links?: string[]; // Array of URL citations in format "title|url" or just "url"
}

export interface ListChatsOptions {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListChatsResult {
  chats: Chat[];
  total: number;
  page: number;
  limit: number;
}

export interface ChatRepository {
  getChat(id: string): Promise<Chat | null>;
  getOrCreateChat(id: string): Promise<Chat>;
  listChats(options?: ListChatsOptions): Promise<ListChatsResult>;
  saveChat(chat: Chat): Promise<Chat>;
  getChats(): Promise<Chat[]>;
}

export interface BotConfig {
  name: string;
  model: string;
  base_url?: string;
  api_key?: string;
  openrouter_config?: Record<string, any>;
  api_type?: string;
  custom_api_path?: string;
  max_tokens?: number;
}

export interface McpServer {
  name: string;
  url: string | null;           // URL for the server
  token?: string | null;        // Optional token for authentication
  allow_tools?: string[] | null; // List of tool names that are allowed to execute without confirmation, if not specified or empty, all tools require confirmation
  is_default?: boolean;         // Whether this is a predefined default server
  // Cache fields
  tools?: McpTool[];           // Cached tools from the server
  last_updated?: string;       // Last cache update timestamp
  status?: 'connected' | 'disconnected' | 'failed'; // Connection status
  error_message?: string;      // Error message if connection failed
}

export interface BotRepository {
  getBots(): Promise<BotConfig[]>;
  addBot(bot: BotConfig): Promise<void>;
  updateBot(name: string, bot: BotConfig): Promise<void>;
  deleteBot(name: string): Promise<void>;
}

export interface McpServerRepository {
  getMcpServers(): Promise<McpServer[]>;
  addMcpserver(mcp_server: McpServer): Promise<void>;
  updateMcpServer(name: string, mcp_server: McpServer): Promise<void>;
  deleteMcpServer(name: string): Promise<void>;
}

export interface IntegrationConfig {
  name: string; // "google-calendar" or other future integrations
  auth_type: 'oauth' | 'api_key'; // Authentication type: 'oauth' for OAuth-based or 'api_key' for API key authentication
  connected: boolean;
  api_key?: string; // Required for auth_type='api_key'
  credentials?: {
    access_token?: string;
    refresh_token?: string;
    expiry_date?: number;
    expiry_time_str?: string; // Human-readable version of expiry_date
  }; // Required for auth_type='oauth'
}

export interface IntegrationRepository {
  getIntegrations(): Promise<IntegrationConfig[]>;
  addIntegration(integration: IntegrationConfig): Promise<void>;
  updateIntegration(name: string, integration: IntegrationConfig): Promise<void>;
  deleteIntegration(name: string): Promise<void>;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema?: any;
}

export interface RoutingDecision {
  use_think_model: boolean;      // False = quick, True = think
  use_web_search: boolean;       // False = no search, True = search
  reasoning_effort: string;      // "low", "medium", or "high" (only if use_think_model=True)
}
