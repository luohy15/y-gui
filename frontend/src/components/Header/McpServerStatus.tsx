import React from 'react';
import { McpServerConfig } from '@shared/types';

interface ServerStatus {
  status: "connected" | "connecting" | "error" | "disconnected";
  lastUpdated: string;
  message?: string;
}

interface McpServerStatusProps {
  mcpServers: McpServerConfig[];
  serverStatus: Record<string, ServerStatus>;
  isDarkMode: boolean;
}

export default function McpServerStatus({ mcpServers, serverStatus, isDarkMode }: McpServerStatusProps) {
  if (!mcpServers || mcpServers.length === 0) return null;

  return (
    <div className={`w-full ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
      <div className={`rounded-lg p-1 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
        <div className="flex flex-wrap gap-2">
          {mcpServers.map((server) => (
            <div
              key={server.name}
              className={`rounded-md p-1.5 text-xs ${isDarkMode ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}
            >
              <div className="group relative">
                <div className="flex items-center gap-2">
                  {/* Status indicator */}
                  <div
                    className={`w-2 h-2 rounded-full ${
                      serverStatus[server.name]?.status === "connected" ? "bg-green-500" :
                      serverStatus[server.name]?.status === "connecting" ? "bg-yellow-500" :
                      serverStatus[server.name]?.status === "error" ? "bg-red-500" :
                      "bg-gray-500"
                    }`}
                  />

                  <span className={`font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    {server.name}
                  </span>

                  {serverStatus[server.name] && (
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {serverStatus[server.name].lastUpdated}
                    </span>
                  )}
                </div>

                {/* Hover tooltip */}
                <div className={`absolute top-full left-0 mt-2 w-64 p-2 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 ${
                  isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                }`}>
                  <div className="text-xs space-y-1">
                    <div className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      {server.name}
                    </div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                      {server.url && (
                        <div className="truncate">
                          <span className={`px-1 py-0.5 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            {server.url}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                      Status: {serverStatus[server.name]?.status || 'unknown'}
                      {serverStatus[server.name]?.message && (
                        <div className="text-xs italic">
                          {serverStatus[server.name].message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
