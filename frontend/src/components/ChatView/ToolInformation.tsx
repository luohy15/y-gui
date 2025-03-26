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
  isLastMessage
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
        <span>{isLastMessage ? 'Tool Execution Request' : 'Tool Information'}</span>
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
