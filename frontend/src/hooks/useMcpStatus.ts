import { useState } from 'react';
import { useMcp } from '../contexts/McpContext';

export interface McpLog {
  status: "connecting" | "connected" | "error" | "info" | "summary";
  message: string;
  timestamp: string;
}

export interface ServerStatus {
  status: "connected" | "connecting" | "error" | "disconnected";
  lastUpdated: string;
  message?: string;
}

export function useMcpStatus() {
  const [mcpLogs, setMcpLogs] = useState<McpLog[]>([]);
  const [isLogVisible, setIsLogVisible] = useState(false);
  const [hasRealContent, setHasRealContent] = useState(false);
  const { serverStatus, setServerStatus } = useMcp();

  const handleMcpStatus = (status: string, server: string, message: string, isRealContent?: boolean) => {
    // Reset hasRealContent when a new MCP status comes in
    if (!isRealContent) {
      setHasRealContent(false);
    }
    const timestamp = new Date().toLocaleTimeString();

    // Update server status in global context
		if (status !== "info" && status !== "summary") {
			setServerStatus(prev => ({
				...prev,
				[server]: {
					status: status === "connected" ? "connected" :
									status === "connecting" ? "connecting" :
									status === "error" ? "error" : "disconnected",
					lastUpdated: timestamp,
					message
				}
			}));
		}

    // Add to logs
    setMcpLogs(prev => [...prev, {
      status: status as McpLog['status'],
      message,
      timestamp
    }]);

    // Show log area when new message arrives, but close it if real content is coming
    if (isRealContent) {
      setHasRealContent(true);
      setIsLogVisible(false);
    } else if (!hasRealContent) {
      setIsLogVisible(true);
    }
  };

  const closeLog = () => {
    setIsLogVisible(false);
  };

  const clearLogs = () => {
    setMcpLogs([]);
  };

  return {
    mcpLogs,
    isLogVisible,
    serverStatus,
    handleMcpStatus,
    closeLog,
    clearLogs,
    setIsLogVisible,
    setHasRealContent
  };
}
