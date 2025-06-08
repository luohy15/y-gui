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
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Define constants before any conditional returns
  const statusEmoji: Record<McpLog['status'], string> = {
    "connecting": "🔄",
    "connected": "✅",
    "error": "❌",
    "info": "ℹ️",
    "summary": "📊"
  };

  // All hooks must be called before any conditional returns
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

  // Don't show logs if either isVisible is false or showMcpLogs is false
  if (!isVisible || !showMcpLogs) return null;

  return (
    <div
      className={`w-full sm:w-[80%] h-full overflow-x-hidden overflow-y-auto ${
        isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'
      } sm:rounded-lg`}
      onScroll={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      ref={logsContainerRef}
    >
      <div className="p-4 space-y-1.5">
        <div className={`flex items-center justify-between w-full mb-3 ${
          isDarkMode ? 'text-gray-200' : 'text-gray-700'
        }`}>
          <span className="text-sm font-medium">MCP Status Logs</span>
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

        {logs.map((log, index) => (
          <div
            key={index}
            className={`p-3 pl-4 rounded-lg transition-all duration-200 mb-1 last:mb-0 ${
              log.status === 'error'
                ? isDarkMode
                  ? 'bg-red-900/30 text-red-300'
                  : 'bg-red-50 text-red-600'
                : isDarkMode
                  ? 'bg-gray-800 text-gray-100 border border-gray-700'
                  : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="text-sm font-medium line-clamp-1 text-left max-w-[70%] pr-1 pl-0 flex items-center gap-2">
                {statusEmoji[log.status]}
                <span className="truncate">{log.message}</span>
              </div>
              <div className={`text-xs whitespace-nowrap text-right ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {log.timestamp}
              </div>
            </div>
          </div>
        ))}

        {logs.length === 0 && (
          <div className={`p-4 text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            No logs available
          </div>
        )}
      </div>
    </div>
  );
}
