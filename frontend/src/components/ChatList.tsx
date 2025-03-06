import React from 'react';
import { Chat } from '@shared/types';

interface ChatListProps {
  chats: Chat[];
  onSelect: (chat: Chat) => void;
  onDelete: (chatId: string) => void;
  selectedId?: string;
}

export default function ChatList({ chats, onSelect, onDelete, selectedId }: ChatListProps) {
  return (
    <div className="space-y-2">
      {chats.map(chat => (
        <div
          key={chat.id}
          className={`flex justify-between items-center p-3 rounded cursor-pointer ${
            chat.id === selectedId ? 'bg-blue-100' : 'hover:bg-gray-100'
          }`}
          onClick={() => onSelect(chat)}
        >
          <div className="flex-1">
            <div className="font-medium">
              {chat.messages.length > 0
                ? chat.messages[chat.messages.length - 1].content.slice(0, 30) + '...'
                : 'New Chat'}
            </div>
            <div className="text-sm text-gray-500">
              {new Date(chat.update_time).toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(chat.id);
            }}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      ))}
      {chats.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          No chats yet
        </div>
      )}
    </div>
  );
}
