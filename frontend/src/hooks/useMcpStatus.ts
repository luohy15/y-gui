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
  const [newRound, setNewRound] = useState(false);
  const { serverStatus, setServerStatus } = useMcp();

  const handleMcpStatus = (status: string, server: string, message: string, isRealContent?: boolean) => {
    const timestamp = new Date().toLocaleTimeString();

    // Detect the start of a new round when connecting status appears
    if (status === "connecting" && !newRound) {
      setNewRound(true);
      setMcpLogs([]); // Clear previous logs for new round
      setIsLogVisible(true); // Always show logs at start of round
    }

    // Close logs if real content is detected
    if (isRealContent) {
			setNewRound(false);
    }

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
    setIsLogVisible
  };
}
