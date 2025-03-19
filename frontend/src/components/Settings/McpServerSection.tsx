import React, { useState, useRef, useEffect } from 'react';
import { McpServerConfig } from '../../../../shared/types';
import { useAuthenticatedSWR, useApi } from '../../utils/api';
// Import other components as needed (Action, Confirm, etc.)

interface McpServerSectionProps {
  isDarkMode: boolean;
  setStatusMessage: (message: {type: 'success' | 'error', text: string} | null) => void;
}

export const McpServerSection: React.FC<McpServerSectionProps> = ({
  isDarkMode,
  setStatusMessage
}) => {
  // API functions
  const api = useApi();

  // Fetch configurations using authenticated SWR
  const { data: mcpServers, error: mcpError, isLoading: mcpLoading, mutate: mutateMcpServers } =
    useAuthenticatedSWR<McpServerConfig[]>('/api/mcp-servers');

  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl md:text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} md:hidden`}>MCP Servers</h2>
        <h2 className={`hidden md:block text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>MCP Servers</h2>
        <button className={`px-3 py-1.5 md:px-4 md:py-2 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md text-sm md:text-base`}>Add Server</button>
      </div>

      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-6 text-sm md:text-base`}>Manage your MCP server configurations</p>

      <div className={`${isDarkMode ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden`}>
        {mcpLoading ? (
          <div className="p-4 text-center">
            <div className={`animate-pulse ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading MCP server configurations...</div>
          </div>
        ) : mcpError ? (
          <div className="p-4 text-center">
            <div className="text-red-500">Error loading MCP server configurations</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-blue-500 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : mcpServers && mcpServers.length > 0 ? (
          mcpServers.map((server, index) => (
          <div key={server.name} className={`${index !== mcpServers.length - 1 ? isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200' : ''} p-4`}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{server.name}</h3>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {server.command && <div>{server.command} {server.args?.join(' ')}</div>}
                  {server.url && <div>URL: {server.url}</div>}
                </div>
              </div>
              <button className={`p-2 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </button>
            </div>
          </div>
          ))
        ) : (
          <div className="p-4 text-center">
            <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No MCP server configurations found</div>
          </div>
        )}
      </div>
    </div>
  );
};
