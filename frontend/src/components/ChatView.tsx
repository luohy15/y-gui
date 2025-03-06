import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chat, ChatMessage } from '@shared/types';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import useSWR, { SWRConfiguration } from 'swr';
import { useTheme } from '../contexts/ThemeContext';
import AssistantAvatar from './AssistantAvatar';
import Logo from './Logo';

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

  React.useEffect(() => {
    if (error?.status === 404) {
      navigate('/');
    }
  }, [error, navigate]);

  if (!chat) {
    return (
      <div className={`flex items-center justify-center h-screen ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
      <header className={`${isDarkMode ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-100'} border-b`}>
        <div className="max-w-full mx-4 sm:mx-6 lg:mx-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'} mr-4`}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
              </button>
              <div className="flex items-center">
                <Logo />
                <div className="ml-3">
                  <h2 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>y-gui Chat</h2>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Assistant</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className={`${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} p-1 rounded-full`}>
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
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
                <div className={`prose prose-sm overflow-hidden max-w-full ${
                  msg.role === 'user'
                    ? 'prose-invert'
                    : 'prose-gray'
                }`}>
                  <ReactMarkdown
                    rehypePlugins={[rehypeHighlight]}
                  >
                  {typeof msg.content === 'string' ? msg.content : ''}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
