import React from 'react';

interface ToolResultProps {
  messageId: string;
  content: string | object;
  isCollapsed: boolean;
  onToggle: (messageId: string) => void;
  isDarkMode: boolean;
}

export default function ToolResult({
  messageId,
  content,
  isCollapsed,
  onToggle,
  isDarkMode
}: ToolResultProps) {
  const contentString = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  const isJsonContent = typeof content === 'string' &&
    content.trim().startsWith('{') &&
    content.trim().endsWith('}');

  return (
    <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
      <button
        onClick={() => onToggle(messageId)}
        className="flex items-center space-x-1 mb-2 opacity-80 hover:opacity-100 text-sm font-medium"
      >
        <svg
          className={`h-4 w-4 transform transition-transform ${!isCollapsed ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
        <span>Tool Result</span>
      </button>
      {!isCollapsed && (
        <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
          {isJsonContent || typeof content === 'object' ? (
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{contentString}</pre>
          ) : (
            <div className="whitespace-pre-wrap">{contentString}</div>
          )}
        </div>
      )}
    </div>
  );
}
