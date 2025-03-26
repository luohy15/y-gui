import React, { createContext, useContext, useState, useEffect } from 'react';
import { McpServerConfig } from '@shared/types';
import { useAuthenticatedSWR } from '../utils/api';

export interface ServerStatus {
  status: "connected" | "connecting" | "error" | "disconnected";
  lastUpdated: string;
  message?: string;
}

interface McpContextType {
  mcpServers: McpServerConfig[] | undefined;
  serverStatus: Record<string, ServerStatus>;
  setServerStatus: React.Dispatch<React.SetStateAction<Record<string, ServerStatus>>>;
  showMcpLogs: boolean;
  setShowMcpLogs: React.Dispatch<React.SetStateAction<boolean>>;
}

const McpContext = createContext<McpContextType | undefined>(undefined);

export function McpProvider({ children }: { children: React.ReactNode }) {
  const [serverStatus, setServerStatus] = useState<Record<string, ServerStatus>>({});
  const [showMcpLogs, setShowMcpLogs] = useState<boolean>(() => {
    // Initialize from localStorage or default to true
    const saved = localStorage.getItem('showMcpLogs');
    return saved !== null ? saved === 'true' : true;
  });

  // Save to localStorage whenever the value changes
  useEffect(() => {
    localStorage.setItem('showMcpLogs', showMcpLogs.toString());
  }, [showMcpLogs]);

  const { data: mcpServers } = useAuthenticatedSWR<McpServerConfig[]>('/api/mcp-servers', {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 0,
    dedupingInterval: 2000,
  });

  return (
    <McpContext.Provider value={{ mcpServers, serverStatus, setServerStatus, showMcpLogs, setShowMcpLogs }}>
      {children}
    </McpContext.Provider>
  );
}

export function useMcp() {
  const context = useContext(McpContext);
  if (context === undefined) {
    throw new Error('useMcp must be used within a McpProvider');
  }
  return context;
}
