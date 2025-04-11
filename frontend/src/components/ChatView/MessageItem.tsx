import { Message } from '@shared/types';
import React from 'react';
import CopyButton from './CopyButton';
import CompactMarkdown from './Markdown';
import ToolInformation from './ToolInformation';
import './ToolStyles.css';

interface MessageItemProps {
  message: Message;
  isLastMessage: boolean;
  isDarkMode: boolean;
  onToolConfirm: (server: string, tool: string, args: any) => void;
  onToolDeny: () => void;
  needsConfirmation: (server: string, tool: string) => boolean;
  expandedToolInfo: Record<string, boolean>;
  expandedToolResults: Record<string, boolean>;
  onToggleToolInfo: (messageId: string) => void;
  onToggleToolResult: (messageId: string) => void;
  isStreaming: boolean;
  toolResults?: Record<string, string | object>;
}

export default function MessageItem({
  message,
  isLastMessage,
  isDarkMode,
  onToolConfirm,
  onToolDeny,
  needsConfirmation,
  expandedToolInfo,
  expandedToolResults,
  onToggleToolInfo,
  onToggleToolResult,
  isStreaming,
  toolResults
}: MessageItemProps) {
  const messageId = message.unix_timestamp.toString();
  const isUserMessage = message.role === 'user' && !message.server;

  return (
    <div className={`flex items-start space-x-4 ${isUserMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <div className={`flex-1 space-y-2 ${isUserMessage ? 'items-end' : 'items-start'}`}>
        <div className={`group relative rounded-lg px-4 py-3 sm:px-6 sm:py-4 break-words whitespace-pre-wrap ${
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
              <span className="text-sm font-medium">{isUserMessage ? 'You' : 'Assistant'}</span>
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

          {/* Loading animation for empty assistant message */}
          {message.role === 'assistant' && !message.content && isStreaming && (
            <div className="flex items-center space-x-3 h-8 my-2">
              <span className="animate-pulse text-2xl font-bold">•</span>
              <span className="animate-pulse text-2xl font-bold animation-delay-200">•</span>
              <span className="animate-pulse text-2xl font-bold animation-delay-400">•</span>
            </div>
          )}

          {/* Message content */}
					<CompactMarkdown
						content={typeof message.content === 'string' ? message.content : ''}
						className={isUserMessage ? 'prose-invert' : 'prose-gray'}
					/>

          {/* Tool information - Added custom classes for visual styling */}
          {message.tool && message.server && message.arguments && message.role === 'assistant' && (
            <div className={`tool-section ${isDarkMode ? 'dark' : 'light'} ${!expandedToolInfo[messageId] ? 'collapsed' : ''}`}>
              <ToolInformation
                messageId={messageId}
                server={message.server}
                tool={message.tool}
                arguments={message.arguments}
                isCollapsed={!expandedToolInfo[messageId]}
                onToggle={onToggleToolInfo}
                onApprove={() => onToolConfirm(message.server!, message.tool!, message.arguments!)}
                onDeny={onToolDeny}
                isDarkMode={isDarkMode}
                needsConfirmation={needsConfirmation(message.server, message.tool)}
                isLastMessage={isLastMessage}
                toolResult={toolResults && toolResults[messageId]}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
