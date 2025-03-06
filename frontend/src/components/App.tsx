import React from 'react';
import useSWR from 'swr';
import { Chat } from '@shared/types';
import ChatList from './ChatList';
import ChatView from './ChatView';
import Login from './Login';

export default function App() {
  const [token, setToken] = React.useState<string | null>(
    localStorage.getItem('authToken')
  );
  const { data: chats, error, mutate } = useSWR<Chat[]>(
    token ? '/api/chats' : null,
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

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('authToken');
    setSelectedChat(null);
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete chat: ${response.status}`);
      }

      mutate();
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      // You might want to show an error message to the user here
    }
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
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  if (error) {
    return <div className="text-red-500">Error loading chats</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-white p-4 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold">Y-GUI</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Logout
        </button>
      </div>
      <div className="flex flex-1">
        <div className="w-1/4 border-r bg-white p-4">
          <button
            onClick={handleCreateChat}
            className="w-full mb-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            New Chat
          </button>
          <ChatList
            chats={chats || []}
            onSelect={handleChatSelect}
            onDelete={handleDeleteChat}
            selectedId={selectedChat?.id}
          />
        </div>
        <div className="flex-1">
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
