import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chat, ChatMessage, Bot } from '@shared/types';
import MessageInput from './MessageInput';
import useSWR, { SWRConfiguration, mutate } from 'swr';
import { useTheme } from '../contexts/ThemeContext';
import AssistantAvatar from './AssistantAvatar';
import Logo from './Logo';
import CompactMarkdown from './Markdown';

export default function ChatView() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  // Configure SWR options for proper revalidation
  const swrConfig: SWRConfiguration = {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 0, // Disable auto refresh
    dedupingInterval: 2000, // Dedupe requests within 2 seconds
  };

  // State for message input
  const [message, setMessage] = useState('');
  const [selectedBot, setSelectedBot] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available bots
  const { data: bots } = useSWR<Bot[]>('/api/config/bots');

  const { data: chat, error } = useSWR<Chat>(
    id ? `/api/chats/${id}` : null,
    swrConfig
  );
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [collapsedReasoning, setCollapsedReasoning] = React.useState<{[key: string]: boolean}>({});

  const toggleReasoning = (messageId: string) => {
    setCollapsedReasoning(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  // Handle sending a message
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || !selectedBot || !id) {
      return;
    }

    setIsLoading(true);

    try {
      // Clear the input immediately to improve UX
      const messageContent = message;
      setMessage('');

      // Add user message and empty assistant message to chat immediately
      await mutate(
        `/api/chats/${id}`,
        (cachedChat: Chat | null | undefined) => {
          if (!cachedChat) return cachedChat;

          // Create a deep copy of the chat
          const updatedChat = JSON.parse(JSON.stringify(cachedChat));

          // Create user message
          const userMessage: ChatMessage = {
            role: 'user',
            content: messageContent,
            timestamp: new Date().toISOString(),
            unix_timestamp: Math.floor(Date.now() / 1000)
          };

          // Create empty assistant message
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            unix_timestamp: Math.floor(Date.now() / 1000)
          };

          // Add messages to chat
          updatedChat.messages.push(userMessage);
          updatedChat.messages.push(assistantMessage);
          updatedChat.update_time = new Date().toISOString();

          return updatedChat;
        },
        false
      );

      // Make the API request
      const response = await fetch(`/api/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          content: messageContent,
          botName: selectedBot,
          chatId: id
        })
      });

      if (!response.ok) {
        throw new Error(`Error sending message: ${response.statusText}`);
      }

      // Check if the response is a stream
      if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('Response body is not readable');
        }

        // Process the stream
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });

          // Process SSE format
          const lines = chunk.split('\n\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              try {
                // Parse the JSON data
                const parsedData = JSON.parse(data);

                // Handle the new SSE data format
                if (parsedData.choices && parsedData.choices[0]?.delta?.content) {
                  // Get the current chat from cache
                  const currentChat = await mutate(
                    `/api/chats/${id}`,
                    (cachedChat: Chat | null | undefined) => {
                      if (!cachedChat) return cachedChat;

                      // Create a deep copy of the chat
                      const updatedChat = JSON.parse(JSON.stringify(cachedChat));

                      // Get the last message (which should be the assistant's message)
                      const lastMessage = updatedChat.messages[updatedChat.messages.length - 1];

                      // Update the content
                      if (lastMessage && lastMessage.role === 'assistant') {
                        // If content is a string, append to it
                        if (typeof lastMessage.content === 'string') {
                          lastMessage.content += parsedData.choices[0].delta.content;
                        }

                        // Update model and provider if not already set
                        if (parsedData.model && !lastMessage.model) {
                          lastMessage.model = parsedData.model;
                        }

                        if (parsedData.provider && !lastMessage.provider) {
                          lastMessage.provider = parsedData.provider;
                        }
                      }

                      return updatedChat;
                    },
                    false
                  );
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      } else {
        // Handle non-streaming response (fallback)
        const updatedChat = await response.json();
        mutate(`/api/chats/${id}`, updatedChat, false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Handle error (could show a toast notification)
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (error?.status === 404) {
      navigate('/');
    }
  }, [error, navigate]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages]);

  if (!chat) {
    return (
      <div className={`flex items-center justify-center h-screen ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
      <div className={`flex-1 px-2 sm:px-4 py-4 space-y-6 sm:space-y-8 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'} overflow-x-hidden overflow-y-auto`}>
        {chat.messages.map((msg, index) => (
          <div
            key={`${msg.unix_timestamp}-${index}`}
            className={`flex items-start space-x-4 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            <div className="flex-shrink-0">
              {msg.role === 'user' ? (
                <div className={`h-10 w-10 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} flex items-center justify-center`}>
                  <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-medium`}>U</span>
                </div>
              ) : (
                <AssistantAvatar model={msg.model} />
              )}
            </div>
            <div className={`max-w-full flex-1 space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`rounded-lg px-4 py-3 sm:px-6 sm:py-4 break-words whitespace-pre-wrap max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-[#4285f4] text-white ml-auto'
                  : isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-700'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                    <span className="text-sm font-medium">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
                    <span className="text-xs opacity-75">
                      {new Date(msg.timestamp).toISOString()}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      {msg.model && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          msg.role === 'user'
                            ? 'bg-blue-400 text-white'
                            : isDarkMode ? 'bg-purple-900 text-purple-100' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {msg.model}
                        </span>
                      )}
                      {msg.provider && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          msg.role === 'user'
                            ? 'bg-blue-400 text-white'
                            : isDarkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'
                        }`}>
                          {msg.provider}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {msg.reasoning_content && (
                  <div className={`mb-3 text-sm ${
                    msg.role === 'user'
                      ? 'border-blue-400 text-blue-100'
                      : isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
                  }`}>
                    <button
                      onClick={() => toggleReasoning(msg.unix_timestamp.toString())}
                      className="flex items-center space-x-1 mb-1 opacity-80 hover:opacity-100"
                    >
                      <svg
                        className={`h-4 w-4 transform transition-transform ${
                          !collapsedReasoning[msg.unix_timestamp.toString()] ? 'rotate-90' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                      <span>Reasoning</span>
                    </button>
                    {!collapsedReasoning[msg.unix_timestamp.toString()] && (
                      <div className="pl-5 italic">
                        {msg.reasoning_content}
                      </div>
                    )}
                  </div>
                )}
                <CompactMarkdown
                  content={typeof msg.content === 'string' ? msg.content : ''}
                  className={msg.role === 'user' ? 'prose-invert' : 'prose-gray'}
                />
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
				<div className="pb-12"></div>
      </div>
      <MessageInput
        message={message}
        setMessage={setMessage}
        selectedBot={selectedBot}
        setSelectedBot={setSelectedBot}
        isLoading={isLoading}
        handleSubmit={handleSubmit}
        bots={bots || []}
			/>
		</div>
  );
}
