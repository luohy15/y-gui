import React from 'react';
import { Chat, ChatMessage } from '@shared/types';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatViewProps {
  chat: Chat;
  onUpdate: () => void;
}

export default function ChatView({ chat, onUpdate }: ChatViewProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [chat.messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {chat.messages.map((msg, index) => (
          <div
            key={`${msg.unix_timestamp}-${index}`}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="max-w-[85%] w-full overflow-hidden">
              <div className={`rounded-lg p-3 break-all ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}>
                <div className={`prose prose-sm overflow-hidden ${
                  msg.role === 'user'
                    ? 'prose-invert'
                    : 'prose-neutral'
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
                            msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-300'
                          }`}>{children}</code>
                        ) : (
                          <code className={`block rounded p-2 mb-2 overflow-x-auto whitespace-pre-wrap break-all ${
                            msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-300'
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
                  <div className={`mt-2 text-sm italic border-t pt-2 ${
                    msg.role === 'user'
                      ? 'border-blue-400 text-blue-100'
                      : 'border-gray-300 text-gray-600'
                  }`}>
                    Reasoning: {msg.reasoning_content}
                  </div>
                )}
                <div className={`text-xs mt-2 space-y-1 ${
                  msg.role === 'user' ? 'text-blue-100' : 'text-gray-600'
                } opacity-75`}>
                  <div>{new Date(msg.timestamp).toLocaleString()}</div>
                  {msg.model && (
                    <div className={msg.role === 'user' ? 'text-blue-200' : 'text-blue-600'}>
                      Model: {msg.model}
                    </div>
                  )}
                  {msg.provider && (
                    <div className={msg.role === 'user' ? 'text-blue-200' : 'text-green-600'}>
                      Provider: {msg.provider}
                    </div>
                  )}
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
