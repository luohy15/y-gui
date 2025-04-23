import React from 'react';

interface ToolInformationProps {
  messageId: string;
  server: string;
  tool: string;
  arguments: any;
  isCollapsed: boolean;
  onToggle: (messageId: string) => void;
  onApprove?: () => void;
  onDeny?: () => void;
  isDarkMode: boolean;
  needsConfirmation?: boolean;
  isLastMessage?: boolean;
  toolResult?: string | object;
}

export default function ToolInformation({
  messageId,
  server,
  tool,
  arguments: toolArgs,
  isCollapsed,
  onToggle,
  onApprove,
  onDeny,
  isDarkMode,
  needsConfirmation,
  isLastMessage,
  toolResult
}: ToolInformationProps) {
  return (
    <div className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
      <button
        onClick={() => onToggle(messageId)}
        className="flex items-center space-x-1 mb-1 opacity-80 hover:opacity-100"
      >
        <svg
          className={`h-4 w-4 transform transition-transform ${!isCollapsed ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>

        {/* Server badge with status indicator */}
        <div className="flex items-center ml-1">
          <div
            className="w-2 h-2 rounded-full bg-green-500 mr-1"
          />
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
          }`}>
            {server}
          </span>
        </div>

        {/* Tool badge with wrench icon */}
        <div className="flex items-center ml-1">
          <svg
            className="h-3.5 w-3.5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
          }`}>
            {tool}
          </span>
        </div>

        {/* Add status indicator based on toolResult */}
        {toolResult ? (
          // Checkmark when toolResult exists
          <div className="flex items-center ml-1">
            <svg
              className="h-3.5 w-3.5 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          // Loading spinner when toolResult doesn't exist
          <div className="flex items-center ml-1">
            <svg
              className={`h-3.5 w-3.5 animate-spin ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        )}
      </button>
      {!isCollapsed && (
        <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className="mb-2">
            <span className="text-sm font-semibold">Server:</span>
            <span className="ml-2 text-sm">{server}</span>
          </div>
          <div className="mb-2">
            <span className="text-sm font-semibold">Tool:</span>
            <span className="ml-2 text-sm">{tool}</span>
          </div>
          <div className="mb-3">
            <span className="text-sm font-semibold">Arguments:</span>
            <pre className={`mt-1 p-2 rounded text-xs overflow-x-auto ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              {typeof toolArgs === 'string'
                ? toolArgs
                : JSON.stringify(toolArgs, null, 2)}
            </pre>
          </div>

          {/* Tool Result Section */}
          {toolResult && (
            <div className="mb-3">
              <span className="text-sm font-semibold">Result:</span>
              <div className={`mt-1 p-2 rounded ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                {(typeof toolResult === 'object' || (typeof toolResult === 'string' && toolResult.trim().startsWith('{') && toolResult.trim().endsWith('}'))) ? (
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                    {typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2)}
                  </pre>
                ) : (
                  <div className="whitespace-pre-wrap text-sm">{toolResult}</div>
                )}
              </div>
            </div>
          )}

          {isLastMessage && needsConfirmation && onApprove && onDeny && (
            <div className="flex space-x-3">
              <button
                onClick={onApprove}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                Approve
              </button>
              <button
                onClick={onDeny}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Deny
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
