import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chat, ChatMessage } from '@shared/types';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import useSWR from 'swr';
import { useTheme } from '../contexts/ThemeContext';

export default function ChatView() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: chat, error } = useSWR<Chat>(id ? `/api/chats/${id}` : null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                  <span className="text-white font-medium">AI</span>
                </div>
                <div className="ml-3">
                  <h2 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>y-gui Chat</h2>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Assistant • Active now</p>
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
      <div className={`flex-1 px-2 sm:px-4 py-4 space-y-6 sm:space-y-8 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'} overflow-y-auto`}>
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
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                  <span className="text-white font-medium">AI</span>
                </div>
              )}
            </div>
            <div className={`flex-1 space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`rounded-lg px-4 py-3 sm:px-6 sm:py-4 break-words whitespace-pre-wrap max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-[#4285f4] text-white ml-auto'
                  : isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
                    <div className="flex items-center space-x-1">
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
                  <span className="text-xs opacity-75">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className={`prose prose-sm overflow-hidden max-w-full ${
                  msg.role === 'user'
                    ? 'prose-invert'
                    : 'prose-gray'
                }`}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, children, ...props}) => <p className="mb-2 last:mb-0" {...props}>{children}</p>,
                      a: ({node, children, href, ...props}) => (
                        <a
                          href={href}
                          className={`${
                            msg.role === 'user'
                              ? 'text-blue-200 hover:text-blue-100'
                              : 'text-blue-600 hover:text-blue-800'
                          }`}
                        >
                          {children}
                        </a>
                      ),
                      ul: ({node, children, ...props}) => <ul className="list-disc ml-4 mb-2" {...props}>{children}</ul>,
                      ol: ({node, children, ...props}) => <ol className="list-decimal ml-4 mb-2" {...props}>{children}</ol>,
                      li: ({node, children, ...props}) => <li className="mb-1" {...props}>{children}</li>,
                      h1: ({node, children, ...props}) => <h1 className="text-xl font-bold mb-2" {...props}>{children}</h1>,
                      h2: ({node, children, ...props}) => <h2 className="text-lg font-bold mb-2" {...props}>{children}</h2>,
                      h3: ({node, children, ...props}) => <h3 className="text-md font-bold mb-2" {...props}>{children}</h3>,
                      code: ({node, children, className, ...props}) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match;
                        return isInline ? (
                          <code className={`rounded px-1 py-0.5 break-words ${
                            msg.role === 'user' ? 'bg-blue-600' : isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                          }`}>{children}</code>
                        ) : (
                          <code className={`block rounded p-2 mb-2 overflow-x-auto whitespace-pre-wrap break-words ${
                            msg.role === 'user' ? 'bg-blue-600' : isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                          }`}>{children}</code>
                        );
                      },
                      pre: ({node, children, ...props}) => <pre className="bg-transparent p-0" {...props}>{children}</pre>,
                      blockquote: ({node, children, ...props}) => <blockquote className="border-l-4 border-gray-400 pl-4 italic mb-2 break-words" {...props}>{children}</blockquote>,
                      hr: () => <hr className="border-gray-400 my-4" />
                    }}
                  >
                    {msg.content as string}
                  </ReactMarkdown>
                </div>
                {msg.reasoning_content && (
                  <div className={`mt-3 text-sm italic border-t pt-2 ${
                    msg.role === 'user'
                      ? 'border-blue-400 text-blue-100'
                      : isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
                  }`}>
                    Reasoning: {msg.reasoning_content}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
