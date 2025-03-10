import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Chat, ListChatsResult } from '@shared/types';
import useSWR from 'swr';
import { useTheme } from '../contexts/ThemeContext';
import AssistantAvatar from './AssistantAvatar';
import MessageInput from './MessageInput';

interface HomeProps {
}


export default function Home({ }: HomeProps) {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [searchInput, setSearchInput] = React.useState('');
  const [confirmedSearch, setConfirmedSearch] = React.useState('');
  const limit = 5;

  // New chat creation states
  const [newMessage, setNewMessage] = React.useState('');
  const [selectedBot, setSelectedBot] = React.useState('');
  const [isCreatingChat, setIsCreatingChat] = React.useState(false);
  const [isNavigatingToNewChat, setIsNavigatingToNewChat] = React.useState(false);
  const [isProcessingMessage, setIsProcessingMessage] = React.useState(false);

  const [currentPage, setCurrentPage] = React.useState(1);


  // Handle creating a new chat with a message
  const handleNewChatWithMessage = async (content: string, botName: string) => {
    if (!content.trim() || !botName) return;

    setIsCreatingChat(true);

    try {
      // First, create a new chat ID
      const idResponse = await fetch('/api/chat/id', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!idResponse.ok) {
        throw new Error('Failed to get new chat ID');
      }

      const { id } = await idResponse.json();

      // Navigate to the new chat page
      navigate(`/chat/${id}`);

      // Store the message and bot in localStorage so ChatView can use it
      localStorage.setItem(`newChat_${id}_message`, content);
      localStorage.setItem(`newChat_${id}_bot`, botName);

      // The ChatView component will detect this and handle the streaming

      // Refresh the chat list
      mutate();
    } catch (error) {
      console.error('Error creating chat with message:', error);
    } finally {
      setIsCreatingChat(false);
      setIsProcessingMessage(false);
      setNewMessage('');
    }
  };

  const { data, error, mutate } = useSWR<ListChatsResult>(
    `/api/chats?search=${encodeURIComponent(confirmedSearch)}&page=${currentPage}&limit=${limit}`,
    (url: string) => fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    }).then(res => {
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }),
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
    <div className={`max-w-full flex flex-col h-full ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
      <main className="max-w-full mx-4 sm:mx-6 lg:mx-8 py-8 flex flex-col h-full">
        {/* New Chat Input */}
        <div className={`mb-8 w-full max-w-3xl mx-auto ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          <MessageInput
            message={newMessage}
            setMessage={setNewMessage}
            selectedBot={selectedBot}
            setSelectedBot={setSelectedBot}
            isLoading={isCreatingChat || isProcessingMessage}
            handleSubmit={async () => Promise.resolve()} // Not used since we're using onSendMessage
            onSendMessage={handleNewChatWithMessage}
            isFixed={false} // Don't fix this input to the bottom of the screen
          />
        </div>

				<h2 className={`text-lg font-light ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Recent</h2>

        {/* Search Area */}
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
