import React, { createContext, useContext, useState } from 'react';
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
}

const McpContext = createContext<McpContextType | undefined>(undefined);

export function McpProvider({ children }: { children: React.ReactNode }) {
  const [serverStatus, setServerStatus] = useState<Record<string, ServerStatus>>({});

  const { data: mcpServers } = useAuthenticatedSWR<McpServerConfig[]>('/api/mcp-servers', {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 0,
    dedupingInterval: 2000,
  });

  return (
    <McpContext.Provider value={{ mcpServers, serverStatus, setServerStatus }}>
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
