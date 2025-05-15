import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface RefreshNavigationProps {
  messageIds: string[];
  messageId: string;
  onRefresh: () => Promise<void>;
  onSelectMessage: (messageId: string) => Promise<void>;
}

export default function RefreshNavigation({
  messageIds,
  messageId,
  onRefresh,
  onSelectMessage,
}: RefreshNavigationProps) {
  const { isDarkMode } = useTheme();
  const [currentResponseIndex, setCurrentResponseIndex] = useState(0);
  const [responseCount, setResponseCount] = useState(0);

  // Update navigation state when messageId or messageIds change
  useEffect(() => {
    const index = messageIds?.findIndex(id => id === messageId) ?? 0;
    const count = messageIds?.length ?? 0;
    setCurrentResponseIndex(index);
    setResponseCount(count);
  }, [messageId, messageIds]);

  const baseButtonClass = "p-1 rounded-full transition-all transform";
  const activeButtonClass = `${baseButtonClass} ${
    isDarkMode
      ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-300 active:scale-90 active:bg-gray-700'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800 active:scale-90 active:bg-gray-200'
  }`;

  return (
    <div className="flex items-center">
      {/* Response navigation */}
      {messageIds && messageIds?.length > 1 && (
        <div className="flex items-center space-x-1">
          <button
            className={`${activeButtonClass} ${currentResponseIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Previous response"
            onClick={() => {
              if (currentResponseIndex > 0 && messageIds) {
                onSelectMessage(messageIds[currentResponseIndex - 1]);
              }
            }}
            disabled={currentResponseIndex === 0}
            title="Previous response"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-xs">
            {currentResponseIndex + 1}/{responseCount}
          </span>

          <button
            className={`${activeButtonClass} ${currentResponseIndex === responseCount - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Next response"
            onClick={() => {
              if (currentResponseIndex < responseCount - 1 && messageIds) {
                onSelectMessage(messageIds[currentResponseIndex + 1]);
              }
            }}
            disabled={currentResponseIndex === responseCount - 1}
            title="Next response"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Refresh button */}
      {onRefresh && messageId && (
        <button
          className={activeButtonClass + " min-w-[28px] min-h-[28px] flex items-center justify-center"}
          aria-label="Refresh"
          onClick={onRefresh}
          title="Generate a new response"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
    </div>
  );
}
