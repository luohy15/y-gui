export interface Chat {
  id: string;
  messages: Message[];
  create_time: string;
  update_time: string;
  content_hash?: string;
  share_id?: string;
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
  model?: string;
  provider?: string;
  reasoning_content?: string;
  server?: string;
  tool?: string;
  arguments?: string | Record<string, any>;
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
  listChats(options?: ListChatsOptions): Promise<ListChatsResult>;
  saveChat(chat: Chat): Promise<Chat>;
}

export interface BotConfig {
  name: string;
  model: string;
  base_url?: string;
  api_key?: string;
  print_speed?: number;
  mcp_servers?: string[];
  openrouter_config?: Record<string, any>;
  api_type?: string;
  custom_api_path?: string;
  max_tokens?: number;
  reasoning_effort?: string;
}

export interface McpServerConfig {
  name: string;
  command?: string | null;
  args?: string[] | null;
  env?: Record<string, string> | null;
  url?: string | null;           // URL for the server
  token?: string | null;        // Optional token for authentication
  need_confirm?: string[] | null; // List of tool names that require confirmation, if not specified or empty, no confirmation needed
}

export interface BotRepository {
  getBots(): Promise<BotConfig[]>;
  addBot(bot: BotConfig): Promise<void>;
  updateBot(name: string, bot: BotConfig): Promise<void>;
  deleteBot(name: string): Promise<void>;
}

export interface McpServerRepository {
  getMcpServers(): Promise<McpServerConfig[]>;
  addMcpserver(mcp_server: McpServerConfig): Promise<void>;
  updateMcpServer(name: string, mcp_server: McpServerConfig): Promise<void>;
  deleteMcpServer(name: string): Promise<void>;
}
