import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Chat, ListChatsResult } from '@shared/types';
import useSWR from 'swr';
import { useTheme } from '../contexts/ThemeContext';

interface ChatListProps {
  token: string;
  onLogout: () => void;
}

const getRandomGradient = () => {
  const gradients = [
    'from-blue-500 to-indigo-500',
    'from-green-500 to-teal-500',
    'from-pink-500 to-rose-500',
    'from-yellow-400 to-orange-500',
    'from-purple-500 to-indigo-500'
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
};

export default function ChatList({ token, onLogout }: ChatListProps) {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [searchInput, setSearchInput] = React.useState('');
  const [confirmedSearch, setConfirmedSearch] = React.useState('');
  const limit = 10;

  const [currentPage, setCurrentPage] = React.useState(1);

  const { data, error, mutate } = useSWR<ListChatsResult>(
    `/api/chats?search=${encodeURIComponent(confirmedSearch)}&page=${currentPage}&limit=${limit}`,
    {
      onError: (err) => {
        if (err.status === 401) {
          onLogout();
        }
      }
    }
  );

  const handleSearchConfirm = () => {
    setConfirmedSearch(searchInput);
  };

  if (error) {
    return <div className={isDarkMode ? 'text-red-400' : 'text-red-500'}>Error loading chats</div>;
  }

  const chats = data?.chats || [];

  // Split chats into pinned and recent (for now, just showing all as recent)
  const pinnedChats: Chat[] = [];

  const renderChatItem = (chat: Chat, isPinned = false) => (
    <div
      key={chat.id}
      className={`chat-item block rounded-lg cursor-pointer transition-all duration-200 hover:translate-x-1 ${
        isDarkMode
          ? 'hover:bg-gray-800 border border-transparent hover:border-gray-700'
          : 'hover:bg-gray-50 border border-transparent hover:border-gray-100'
      }`}
      onClick={() => navigate(`/chat/${chat.id}`)}
    >
      <div className="flex items-start space-x-4 min-w-0">
        <div className="flex-shrink-0">
          <div className={`h-10 w-10 rounded-full bg-gradient-to-r ${getRandomGradient()} flex items-center justify-center shadow-sm`}>
            <span className="text-white font-medium">AI</span>
          </div>
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
            <div className="flex items-center">
              {isPinned && (
                <svg className="h-4 w-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {new Date(chat.update_time).toLocaleDateString()}
              </span>
            </div>
          </div>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} truncate`}>
            {chat.messages.length > 0
              ? (typeof chat.messages[0].content === 'string'
                 ? chat.messages[0].content.slice(0, 50) + (chat.messages[0].content.length > 50 ? '...' : '')
                 : 'Message content')
              : 'Start a new conversation...'}
          </p>
          <div className="mt-2 flex items-center space-x-2">
            {chat.messages.length > 0 && chat.messages[0].model && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                isDarkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-800'
              }`}>
                {chat.messages[0].model}
              </span>
            )}
            {chat.messages.length > 0 && chat.messages[0].provider && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                isDarkMode ? 'bg-purple-900 text-purple-100' : 'bg-purple-100 text-purple-800'
              }`}>
                {chat.messages[0].provider}
              </span>
            )}
            {chat.messages.length === 0 && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-800'
              }`}>
                New
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`max-w-full flex flex-col h-screen ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
      <header className={`${isDarkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-100'} border-b`}>
        <div className="max-w-full mx-4 sm:mx-6 lg:mx-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-[#4285f4] rounded-full flex items-center justify-center shadow-sm">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4-4-4z"></path>
                </svg>
              </div>
              <h1 className={`ml-3 text-lg font-light ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>y-gui Chat</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/settings')}
                className={`${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} p-1 rounded-full transition-colors`}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </button>
              <button
                onClick={onLogout}
                className={`${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} p-1 rounded-full transition-colors`}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-full mx-4 sm:mx-6 lg:mx-8 py-8 flex flex-col h-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-8">
          <div className="w-full sm:max-w-lg flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-2">
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
            <button
              onClick={handleSearchConfirm}
              className="btn-primary flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none bg-[#4285f4] hover:bg-[#3b78e7] transition-all duration-200 shadow-sm"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18l9-2zm0 0v-8"></path>
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 min-w-0">
          {pinnedChats.length > 0 && (
            <section>
              <h2 className={`text-lg font-light ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Pinned</h2>
              <div className="space-y-2">
                {pinnedChats.map(chat => renderChatItem(chat, true))}
              </div>
            </section>
          )}

          <section>
            <h2 className={`text-lg font-light ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Recent</h2>
            <div className="space-y-2">
              {chats.map(chat => renderChatItem(chat))}
            </div>
            {chats.length === 0 && (
              <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} py-8`}>
                {searchInput ? 'No chats found' : 'No chats yet'}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
