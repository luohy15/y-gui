import React from 'react';
import useSWR from 'swr';
import { Chat, ListChatsResult } from '@shared/types';
import ChatList from './ChatList';
import ChatView from './ChatView';
import Login from './Login';

export default function App() {
  const [token, setToken] = React.useState<string | null>(
    localStorage.getItem('authToken')
  );
  const [search, setSearch] = React.useState('');
  const [confirmedSearch, setConfirmedSearch] = React.useState('');
  const [showMobileList, setShowMobileList] = React.useState(true);
  const limit = 10;

  const { data, error, mutate } = useSWR<ListChatsResult>(
    token ? `/api/chats?search=${encodeURIComponent(confirmedSearch)}&page=1&limit=${limit}` : null,
    {
      onError: (err) => {
        if (err.status === 401) {
          setToken(null);
          localStorage.removeItem('authToken');
        }
      }
    }
  );
  const [selectedChat, setSelectedChat] = React.useState<Chat | null>(null);

  const handleSearch = (value: string, confirmed: boolean) => {
    setSearch(value);
    if (confirmed) {
      setConfirmedSearch(value);
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('authToken');
    setSelectedChat(null);
    setSearch('');
    setConfirmedSearch('');
    setShowMobileList(true); // Reset mobile view state
    mutate(undefined, { revalidate: false }); // Clear the cache without revalidating
  };

  const handleCreateChat = async () => {
    const newChat: Chat = {
      id: crypto.randomUUID(),
      messages: [],
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'omit',
        body: JSON.stringify(newChat)
      });

      if (!response.ok) {
        throw new Error(`Failed to create chat: ${response.status}`);
      }

      const createdChat = await response.json();
      mutate();
      setSelectedChat(createdChat);
    } catch (error) {
      console.error('Error creating chat:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleLogin = (newToken: string) => {
    setToken(newToken);
    mutate(); // Revalidate the cache with the new token
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  if (error) {
    return <div className="text-red-500">Error loading chats</div>;
  }

  const handleChatSelectWithMobile = (chat: Chat) => {
    handleChatSelect(chat);
    // Hide chat list on mobile after selection
    if (window.innerWidth < 768) {
      setShowMobileList(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-white p-4 shadow-sm flex justify-between items-center">
        {!showMobileList && selectedChat && (
          <button
            onClick={() => setShowMobileList(true)}
            className="md:hidden mr-2 text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
        )}
        <h1 className="text-xl font-bold">Y-GUI</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Logout
        </button>
      </div>
      <div className="flex flex-1">
        <div className={`${showMobileList ? 'block' : 'hidden'} md:block w-full md:w-80 border-r bg-white p-4`}>
          <button
            onClick={handleCreateChat}
            className="w-full mb-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            New Chat
          </button>
          <ChatList
            chats={data?.chats || []}
            onSelect={handleChatSelectWithMobile}
            selectedId={selectedChat?.id}
            onSearch={handleSearch}
            currentPage={1}
            totalPages={1}
          />
        </div>
        <div className={`${!showMobileList ? 'block' : 'hidden'} md:block flex-1`}>
          {selectedChat ? (
            <ChatView chat={selectedChat} onUpdate={mutate} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a chat or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
