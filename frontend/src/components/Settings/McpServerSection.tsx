import React, { useState, useRef, useEffect } from 'react';
import { McpServerConfig } from '../../../../shared/types';
import { useAuthenticatedSWR, useApi } from '../../utils/api';
import { McpServerFormModal } from './McpServerForm';
import { ConfirmationDialog } from './Confirm';
import { ActionMenu } from './ActionMenu';
import { useMcp } from '../../contexts/McpContext';

interface McpServerSectionProps {
  isDarkMode: boolean;
  setStatusMessage: (message: {type: 'success' | 'error', text: string} | null) => void;
}

export const McpServerSection: React.FC<McpServerSectionProps> = ({
  isDarkMode,
  setStatusMessage
}) => {
  // MCP server form modal state
  const [isMcpServerFormOpen, setIsMcpServerFormOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<McpServerConfig | undefined>(undefined);

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<string | null>(null);

  // Action menu state
  const [actionMenuServer, setActionMenuServer] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // API functions
  const api = useApi();

  // Get MCP context
  const mcpContext = useMcp();

  // Fetch configurations using authenticated SWR
  const { data: mcpServers, error: mcpError, isLoading: mcpLoading, mutate: mutateMcpServers } =
    useAuthenticatedSWR<McpServerConfig[]>('/api/mcp-servers');

  // Handle MCP server form submission
  const handleMcpServerSubmit = async (server: McpServerConfig) => {
    try {
      if (selectedServer) {
        // Update existing server
        await api.put(`/api/mcp-server/${selectedServer.name}`, server);
        setStatusMessage({ type: 'success', text: `MCP server "${server.name}" updated successfully` });
      } else {
        // Add new server
        await api.post('/api/mcp-server', server);
        setStatusMessage({ type: 'success', text: `MCP server "${server.name}" added successfully` });
      }

      // Close the form and refresh the server list
      setIsMcpServerFormOpen(false);
      setSelectedServer(undefined);
      mutateMcpServers();
    } catch (error) {
      console.error('Error saving MCP server:', error);
      setStatusMessage({ type: 'error', text: `Failed to save MCP server: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  // Handle MCP server deletion
  const handleDeleteMcpServer = async () => {
    if (!serverToDelete) return;

    try {
      await api.delete(`/api/mcp-server/${serverToDelete}`);
      setStatusMessage({ type: 'success', text: `MCP server deleted successfully` });
      mutateMcpServers();
    } catch (error) {
      console.error('Error deleting MCP server:', error);
      setStatusMessage({ type: 'error', text: `Failed to delete MCP server: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }

    setServerToDelete(null);
    setIsConfirmDialogOpen(false);
  };

  // Open edit form for a server
  const handleEditMcpServer = (server: McpServerConfig) => {
    setSelectedServer(server);
    setIsMcpServerFormOpen(true);
  };

  // Open delete confirmation for a server
  const handleDeleteConfirm = (serverName: string) => {
    setServerToDelete(serverName);
    setIsConfirmDialogOpen(true);
  };

  return (
    <div className="mb-12">
      {/* MCP server form modal */}
      <McpServerFormModal
        isOpen={isMcpServerFormOpen}
        onClose={() => {
          setIsMcpServerFormOpen(false);
          setSelectedServer(undefined);
        }}
        onSubmit={handleMcpServerSubmit}
        initialServer={selectedServer}
        isDarkMode={isDarkMode}
      />

      {/* Confirmation dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={handleDeleteMcpServer}
        title="Delete MCP Server"
        message={`Are you sure you want to delete this MCP server? This action cannot be undone.`}
        isDarkMode={isDarkMode}
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl md:text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} md:hidden`}>MCP Servers</h2>
        <h2 className={`hidden md:block text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>MCP Servers</h2>
        <button
          onClick={() => {
            setSelectedServer(undefined);
            setIsMcpServerFormOpen(true);
          }}
          className={`px-3 py-1.5 md:px-4 md:py-2 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md text-sm md:text-base`}
        >
          Add Server
        </button>
      </div>

      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-6 text-sm md:text-base`}>Manage your MCP server configurations</p>

      {/* MCP Logs Display Settings */}
      <div className={`${isDarkMode ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden mb-6 p-4`}>
        <h3 className={`font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>MCP Logs Display</h3>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showMcpLogs"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
            checked={mcpContext.showMcpLogs}
            onChange={(e) => mcpContext.setShowMcpLogs(e.target.checked)}
          />
          <label htmlFor="showMcpLogs" className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Show MCP server logs in chat view
          </label>
        </div>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
          When enabled, MCP server status logs will be displayed in the chat interface when MCP tools are used
        </p>
      </div>

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
              <div className="relative" ref={actionMenuServer === server.name ? actionMenuRef : undefined}>
                <button
                  onClick={() => setActionMenuServer(actionMenuServer === server.name ? null : server.name)}
                  className={`p-2 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                </button>

                {actionMenuServer === server.name && (
                  <ActionMenu
                    isOpen={true}
                    onClose={() => setActionMenuServer(null)}
                    onEdit={() => handleEditMcpServer(server)}
                    onDelete={() => handleDeleteConfirm(server.name)}
                    isDarkMode={isDarkMode}
                  />
                )}
              </div>
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
