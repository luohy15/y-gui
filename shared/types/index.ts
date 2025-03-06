export interface Chat {
  id: string;
  messages: ChatMessage[];
  create_time: string;
  update_time: string;
}

export interface ContentBlock {
  type: 'text';
  text: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
  timestamp: string;
  unix_timestamp: number;
  model?: string;
  provider?: string;
  reasoning_content?: string;
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

export interface StorageRepository {
  getChat(id: string): Promise<Chat | null>;
  listChats(options?: ListChatsOptions): Promise<ListChatsResult>;
  saveChat(chat: Chat): Promise<void>;
  deleteChat(id: string): Promise<void>;
}
