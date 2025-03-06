import React from 'react';
import { Chat } from '@shared/types';

interface ChatListProps {
  chats: Chat[];
  onSelect: (chat: Chat) => void;
  selectedId?: string;
  onSearch?: (value: string, confirmed: boolean) => void;
  onPageChange?: (page: number) => void;
  currentPage?: number;
  totalPages?: number;
}

export default function ChatList({
  chats,
  onSelect,
  selectedId,
  onSearch,
  onPageChange,
  currentPage = 1,
  totalPages = 1
}: ChatListProps) {
  const [searchInput, setSearchInput] = React.useState('');

  const handleSearchConfirm = () => {
    onSearch?.(searchInput, true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Search chats..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            onSearch?.(e.target.value, false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearchConfirm();
            }
          }}
          className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearchConfirm}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Search
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
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
                ? chat.messages[0].content.slice(0, 30) + (chat.messages[0].content.length > 30 ? '...' : '')
                : 'New Chat'}
            </div>
            <div className="text-sm text-gray-500">
              {new Date(chat.update_time).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}
      {chats.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          {searchInput ? 'No chats found' : 'No chats yet'}
        </div>
      )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50 hover:bg-gray-200"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50 hover:bg-gray-200"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
