import React from 'react';
import { Message } from '@shared/types';
import AssistantAvatar from './AssistantAvatar';
import CompactMarkdown from './Markdown';
import CopyButton from './CopyButton';
import ToolInformation from './ToolInformation';
import ToolResult from './ToolResult';

interface SharedMessageItemProps {
  message: Message;
  isDarkMode: boolean;
  expandedToolInfo: Record<string, boolean>;
  expandedToolResults: Record<string, boolean>;
  onToggleToolInfo: (messageId: string) => void;
  onToggleToolResult: (messageId: string) => void;
}

export default function SharedMessageItem({
  message,
  isDarkMode,
  expandedToolInfo,
  expandedToolResults,
  onToggleToolInfo,
  onToggleToolResult
}: SharedMessageItemProps) {
  const messageId = message.unix_timestamp.toString();
  const isUserMessage = message.role === 'user' && !message.server;

  return (
    <div className={`flex items-start space-x-4 ${isUserMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <div className="flex-shrink-0">
        {isUserMessage ? (
          <div className={`h-10 w-10 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} flex items-center justify-center`}>
            <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-medium`}>U</span>
          </div>
        ) : (
          <AssistantAvatar model={message.model} />
        )}
      </div>
      <div className={`max-w-full flex-1 space-y-2 ${isUserMessage ? 'items-end' : 'items-start'}`}>
        <div className={`group relative rounded-lg px-4 py-3 sm:px-6 sm:py-4 break-words whitespace-pre-wrap max-w-[85%] ${
          isUserMessage
            ? 'bg-[#4285f4] text-white ml-auto'
            : isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-700'
        }`}>
          <CopyButton
            content={typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2)}
            isDarkMode={isDarkMode}
            isRight={!isUserMessage}
          />

          {/* Message metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
              <span className="text-sm font-medium">{isUserMessage ? 'User' : 'Assistant'}</span>
              <span className="text-xs opacity-75">
                {new Date(message.timestamp).toLocaleString()}
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {message.model && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    isUserMessage
                      ? 'bg-blue-400 text-white'
                      : isDarkMode ? 'bg-purple-900 text-purple-100' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {message.model}
                  </span>
                )}
                {message.provider && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    isUserMessage
                      ? 'bg-blue-400 text-white'
                      : isDarkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'
                  }`}>
                    {message.provider}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Message content */}
          {message.role === 'user' && message.server ? (
            <ToolResult
              messageId={messageId}
              content={message.content}
              isCollapsed={!expandedToolResults[messageId]}
              onToggle={onToggleToolResult}
              isDarkMode={isDarkMode}
            />
          ) : (
            <CompactMarkdown
              content={typeof message.content === 'string' ? message.content : ''}
              className={isUserMessage ? 'prose-invert' : 'prose-gray'}
            />
          )}

          {/* Tool information */}
          {message.tool && message.server && message.arguments && message.role === 'assistant' && (
            <ToolInformation
              messageId={messageId}
              server={message.server}
              tool={message.tool}
              arguments={message.arguments}
              isCollapsed={!expandedToolInfo[messageId]}
              onToggle={onToggleToolInfo}
              isDarkMode={isDarkMode}
              needsConfirmation={false}
              isLastMessage={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
