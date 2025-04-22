import React, { useEffect, useRef } from 'react';
import { useMcp } from '../../contexts/McpContext';

interface McpLog {
  status: "connecting" | "connected" | "error" | "info" | "summary";
  message: string;
  timestamp: string;
}

interface McpLogsDisplayProps {
  logs: McpLog[];
  isVisible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export default function McpLogsDisplay({ logs, isVisible, onClose, isDarkMode }: McpLogsDisplayProps) {
  const { showMcpLogs } = useMcp();

  // Don't show logs if either isVisible is false or showMcpLogs is false
  if (!isVisible || !showMcpLogs) return null;

  const statusEmoji: Record<McpLog['status'], string> = {
    "connecting": "🔄",
    "connected": "✅",
    "error": "❌",
    "info": "ℹ️",
    "summary": "📊"
  };

  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsContainerRef.current) {
      const container = logsContainerRef.current;
      // Only autoscroll if user is already near the bottom (within 100px)
      const isNearBottom = container.scrollHeight - container.clientHeight - container.scrollTop < 100;
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [logs]); // Re-run when logs change

  return (
    <div>
      <div className={`w-full h-full rounded-lg shadow-lg overflow-hidden ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className={`absolute top-0 left-0 right-0 p-2 flex justify-between items-center ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <span className={`text-sm font-medium ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            MCP Status Logs
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className={`p-1 rounded hover:bg-opacity-20 ${
                isDarkMode ? 'hover:bg-white text-gray-300' : 'hover:bg-black text-gray-600'
              }`}
              title="Close"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div
          ref={logsContainerRef}
          className={`absolute top-10 bottom-0 left-0 right-0 overflow-y-auto p-2 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          {logs.map((log, index) => (
            <div
              key={index}
              className={`mb-2 p-2 rounded text-sm ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              } ${
                log.status === 'error'
                  ? isDarkMode
                    ? 'text-red-300'
                    : 'text-red-600'
                  : isDarkMode
                    ? 'text-gray-200'
                    : 'text-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {statusEmoji[log.status]}
                  <span className="truncate">{log.message}</span>
                </span>
                <span className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {log.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
