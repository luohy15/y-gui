import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Chat, ListChatsResult } from '@shared/types';
import { useAuthenticatedSWR } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext';
import AssistantAvatar from './ChatView/AssistantAvatar';
import { formatDateTime } from '../utils/formatters';

interface SearchWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchWindow: React.FC<SearchWindowProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [searchInput, setSearchInput] = React.useState('');
  const [confirmedSearch, setConfirmedSearch] = React.useState('');
  const limit = 5;
  const [currentPage, setCurrentPage] = React.useState(1);

  const { data, error } = useAuthenticatedSWR<ListChatsResult>(
    `/api/chats?search=${encodeURIComponent(confirmedSearch)}&page=${currentPage}&limit=${limit}`,
    {
      onError: (err: any) => {
        if (err.status === 401) {
          console.log('Unauthorized');
        }
      }
    }
  );

  const handleSearchConfirm = () => {
    setConfirmedSearch(searchInput);
  };

  if (!isOpen) return null;

  const chats = data?.chats || [];

  const renderChatItem = (chat: Chat) => (
    <div
      key={chat.id}
      className={`chat-item block rounded-lg cursor-pointer transition-all duration-200 hover:translate-x-1 ${
        isDarkMode
          ? 'hover:bg-gray-800 border border-transparent hover:border-gray-700'
          : 'hover:bg-gray-50 border border-transparent hover:border-gray-100'
      }`}
      onClick={() => {
        navigate(`/chat/${chat.id}`);
        onClose();
      }}
    >
      <div className="flex items-start space-x-4 min-w-0">
        <div className="flex-shrink-0">
          <AssistantAvatar model={chat.messages.length > 1 ? chat.messages[1].model : undefined} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} truncate`}>
              {chat.messages.length > 0
                ? (typeof chat.messages[0].content === 'string'
                   ? chat.messages[0].content.slice(0, 30)
                   : 'Message content')
                : 'New Chat'}
            </p>
            <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {formatDateTime(chat.update_time)}
            </span>
          </div>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} truncate`}>
            {chat.messages.length > 0
              ? (typeof chat.messages[0].content === 'string'
                 ? chat.messages[0].content.slice(0, 50) + (chat.messages[0].content.length > 50 ? '...' : '')
                 : 'Message content')
              : 'Start a new conversation...'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Search Window */}
      <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl
        ${isDarkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'}
        border rounded-lg shadow-xl z-50 p-4`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 ${
            isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Search input */}
        <div className="flex space-x-2 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search chats..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchConfirm();
                }
              }}
              className={`input-primary w-full pl-10 pr-4 py-2 rounded-md ${
                isDarkMode
                  ? 'bg-gray-800 text-white placeholder-gray-500 border-gray-700 focus:border-[#4285f4]'
                  : 'bg-white text-gray-800 placeholder-gray-400 border-gray-200 focus:border-[#4285f4]'
              } focus:outline-none transition-all duration-200`}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] space-y-2">
          {error && (
            <div className={isDarkMode ? 'text-red-400' : 'text-red-500'}>Error loading chats</div>
          )}
          {chats.map(chat => renderChatItem(chat))}
          {chats.length === 0 && (
            <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} py-8`}>
              {searchInput ? 'No chats found' : 'No chats yet'}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SearchWindow;
