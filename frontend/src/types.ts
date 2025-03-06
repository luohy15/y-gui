export interface Chat {
  id: string;
  messages: ChatMessage[];
  create_time: string;
  update_time: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  unix_timestamp: number;
  model?: string;
  provider?: string;
  reasoning_content?: string;
}

export interface StorageRepository {
  getChat(id: string): Promise<Chat | null>;
  listChats(): Promise<Chat[]>;
  saveChat(chat: Chat): Promise<void>;
  deleteChat(id: string): Promise<void>;
}
