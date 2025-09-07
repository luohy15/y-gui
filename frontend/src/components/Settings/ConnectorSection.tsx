import React, { useState, useRef, useEffect } from 'react';
import { McpServer } from '../../../../shared/types';
import { useAuthenticatedSWR, useApi } from '../../utils/api';
import { ConnectorFormModal } from './ConnectorForm';
import { ConfirmationDialog } from './Confirm';
import { useMcp } from '../../contexts/McpContext';

interface ConnectorSectionProps {
  isDarkMode: boolean;
  setStatusMessage: (message: {type: 'success' | 'error', text: string} | null) => void;
}

export const ConnectorSection: React.FC<ConnectorSectionProps> = ({
  isDarkMode,
  setStatusMessage
}) => {
  // Connector form modal state
  const [isConnectorFormOpen, setIsConnectorFormOpen] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<McpServer | undefined>(undefined);

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [connectorToDelete, setConnectorToDelete] = useState<string | null>(null);

  // Toggle state
  const [togglingConnector, setTogglingConnector] = useState<string | null>(null);
  
  // Allow tools management state
  const [managingAllowTools, setManagingAllowTools] = useState<string | null>(null);
  const [editingAllowTools, setEditingAllowTools] = useState<{[key: string]: string[]}>({});

  // API functions
  const api = useApi();

  // Get connector context
  const connectorContext = useMcp();

  // Fetch configurations using authenticated SWR
  const { data: connectors, error: connectorError, isLoading: connectorLoading, mutate: mutateConnectors } =
    useAuthenticatedSWR<McpServer[]>('/api/mcp-servers');

  // Handle connector form submission
  const handleConnectorSubmit = async (server: McpServer) => {
    try {
      if (selectedConnector) {
        // Update existing connector
        await api.put(`/api/mcp-server/${selectedConnector.name}`, server);
        setStatusMessage({ type: 'success', text: `Connector "${server.name}" updated successfully` });
      } else {
        // Add new connector
        await api.post('/api/mcp-server', server);
        setStatusMessage({ type: 'success', text: `Connector "${server.name}" added successfully` });
      }

      // Close the form and refresh the connector list
      setIsConnectorFormOpen(false);
      setSelectedConnector(undefined);
      mutateConnectors();
    } catch (error) {
      console.error('Error saving connector:', error);
      setStatusMessage({ type: 'error', text: `Failed to save connector: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  // Handle connector deletion
  const handleDeleteConnector = async () => {
    if (!connectorToDelete) return;

    try {
      await api.delete(`/api/mcp-server/${connectorToDelete}`);
      setStatusMessage({ type: 'success', text: `Connector deleted successfully` });
      mutateConnectors();
    } catch (error) {
      console.error('Error deleting connector:', error);
      setStatusMessage({ type: 'error', text: `Failed to delete connector: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }

    setConnectorToDelete(null);
    setIsConfirmDialogOpen(false);
  };

  // Open edit form for a connector
  const handleEditConnector = (connector: McpServer) => {
    setSelectedConnector(connector);
    setIsConnectorFormOpen(true);
  };

  // Open delete confirmation for a connector
  const handleDeleteConfirm = (connectorName: string) => {
    setConnectorToDelete(connectorName);
    setIsConfirmDialogOpen(true);
  };

  // Handle toggle connector connection
  const handleToggleConnector = async (connectorName: string, currentStatus: string) => {
    setTogglingConnector(connectorName);
    try {
      const action = currentStatus === 'connected' ? 'disconnect' : 'connect';
      await api.post(`/api/mcp-server/${connectorName}/${action}`, {});
      setStatusMessage({
        type: 'success',
        text: `Connector "${connectorName}" ${action}ed successfully`
      });
      mutateConnectors();
    } catch (error) {
      console.error(`Error toggling connector ${connectorName}:`, error);
      setStatusMessage({
        type: 'error',
        text: `Failed to toggle connector "${connectorName}": ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setTogglingConnector(null);
    }
  };

  // Handle allow_tools management
  const handleManageAllowTools = (connectorName: string, currentAllowTools: string[] | null) => {
    setManagingAllowTools(connectorName);
    setEditingAllowTools({
      ...editingAllowTools,
      [connectorName]: currentAllowTools || []
    });
  };

  const handleAddAllowTool = (connectorName: string, toolName: string) => {
    if (!toolName.trim()) return;
    
    const currentTools = editingAllowTools[connectorName] || [];
    if (currentTools.includes(toolName.trim())) return;
    
    setEditingAllowTools({
      ...editingAllowTools,
      [connectorName]: [...currentTools, toolName.trim()]
    });
  };

  const handleRemoveAllowTool = (connectorName: string, toolName: string) => {
    const currentTools = editingAllowTools[connectorName] || [];
    setEditingAllowTools({
      ...editingAllowTools,
      [connectorName]: currentTools.filter(tool => tool !== toolName)
    });
  };

  const handleSaveAllowTools = async (connectorName: string) => {
    try {
      const connector = connectors?.find(c => c.name === connectorName);
      if (!connector) return;

      const updatedConnector = {
        ...connector,
        allow_tools: editingAllowTools[connectorName]
      };

      await api.put(`/api/mcp-server/${connectorName}`, updatedConnector);
      setStatusMessage({
        type: 'success',
        text: `Allow tools updated successfully for "${connectorName}"`
      });
      mutateConnectors();
      setManagingAllowTools(null);
    } catch (error) {
      console.error(`Error updating allow tools for ${connectorName}:`, error);
      setStatusMessage({
        type: 'error',
        text: `Failed to update allow tools: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const handleCancelAllowToolsEdit = () => {
    setManagingAllowTools(null);
    setEditingAllowTools({});
  };

  // Render individual connector item
  const renderConnectorItem = (connector: McpServer, isDefault: boolean) => (
    <div className="flex justify-between items-center">
      <div>
        <div className="flex items-center gap-2">
          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{connector.name}</h4>
          <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            connector.status === 'connected'
              ? 'bg-green-100 text-green-800'
              : connector.status === 'disconnected' || connector.status === 'failed'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-1 ${
              connector.status === 'connected'
                ? 'bg-green-500'
                : connector.status === 'disconnected' || connector.status === 'failed'
                  ? 'bg-red-500'
                  : 'bg-gray-500'
            }`}></div>
            {connector.status === 'connected' ? 'Connected' :
             connector.status === 'failed' ? 'Failed' :
             connector.status === 'disconnected' ? 'Disconnected' :
             'Disconnected'}
          </div>
          {togglingConnector === connector.name && (
            <div className="animate-spin h-4 w-4">
              <svg className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
        </div>
        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {connector.url && <div>URL: {connector.url}</div>}
          {connector.error_message && (
            <div className="text-red-500 text-xs mt-1">Error: {connector.error_message}</div>
          )}
          {connector.tools && connector.tools.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium mb-1">Available Tools ({connector.tools.length}):</div>
              <div className="flex flex-wrap gap-1">
                {connector.tools.slice(0, 3).map((tool, toolIndex) => (
                  <span
                    key={toolIndex}
                    className={`px-2 py-0.5 rounded text-xs ${
                      isDarkMode
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    title={tool.description}
                  >
                    {tool.name}
                  </span>
                ))}
                {connector.tools.length > 3 && (
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    +{connector.tools.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Allow Tools Management */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium">Allowed Tools ({connector.allow_tools?.length || 0})</div>
              {managingAllowTools !== connector.name && (
                <button
                  onClick={() => handleManageAllowTools(connector.name, connector.allow_tools || null)}
                  className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'}`}
                >
                  Manage
                </button>
              )}
            </div>
            
            {managingAllowTools === connector.name ? (
              <div className={`p-3 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                {/* Tags display */}
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(editingAllowTools[connector.name] || []).map((toolName, toolIndex) => (
                      <span
                        key={toolIndex}
                        className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                          isDarkMode
                            ? 'bg-gray-700 text-gray-300'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {toolName}
                        <button
                          onClick={() => handleRemoveAllowTool(connector.name, toolName)}
                          className="ml-1 text-xs hover:text-red-300"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Dropdown to add tools */}
                {connector.tools && connector.tools.length > 0 && (
                  <select
                    className={`w-full px-2 py-1 text-xs rounded mb-2 ${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'} border`}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddAllowTool(connector.name, e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">Add tool...</option>
                    {connector.tools
                      .filter(tool => !(editingAllowTools[connector.name] || []).includes(tool.name))
                      .map((tool, toolIndex) => (
                        <option key={toolIndex} value={tool.name}>
                          {tool.name} - {tool.description.slice(0, 50)}{tool.description.length > 50 ? '...' : ''}
                        </option>
                      ))}
                  </select>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveAllowTools(connector.name)}
                    className={`px-2 py-1 text-xs rounded ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'}`}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelAllowToolsEdit}
                    className={`px-2 py-1 text-xs rounded ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {(connector.allow_tools?.length || 0) > 0 ? (
                  connector.allow_tools!.map((toolName, toolIndex) => (
                    <span
                      key={toolIndex}
                      className={`px-2 py-0.5 rounded text-xs ${
                        isDarkMode
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {toolName}
                    </span>
                  ))
                ) : (
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    isDarkMode
                      ? 'bg-yellow-700 text-yellow-200'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    All tools need confirmation
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleToggleConnector(connector.name, connector.status || '')}
          disabled={togglingConnector === connector.name}
          className={`px-3 py-1.5 text-sm ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed`}
          title={connector.status === 'connected' ? 'Disconnect connector' : 'Connect connector'}
        >
          {togglingConnector === connector.name
            ? 'Toggling...'
            : connector.status === 'connected'
              ? 'Disconnect'
              : 'Connect'
          }
        </button>
        {!isDefault && (
          <>
            <button
              onClick={() => handleEditConnector(connector)}
              className={`px-3 py-1.5 text-sm ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-md`}
              title="Edit connector"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteConfirm(connector.name)}
              className={`px-3 py-1.5 text-sm ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-md`}
              title="Delete connector"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );

  // Render connector list
  const renderConnectorList = (connectorList: McpServer[], isDefault: boolean = false, emptyMessage?: string) => (
    <div className={`${isDarkMode ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden`}>
      {connectorList.length > 0 ? (
        connectorList.map((connector, index, filteredConnectors) => (
          <div key={connector.name} className={`${index !== filteredConnectors.length - 1 ? isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200' : ''} p-4`}>
            {renderConnectorItem(connector, isDefault)}
          </div>
        ))
      ) : emptyMessage ? (
        <div className="p-4 text-center">
          <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{emptyMessage}</div>
        </div>
      ) : null}
    </div>
  );

  const defaultConnectors = connectors?.filter(connector => connector.is_default || connector.name === 'default') || [];
  const userConnectors = connectors?.filter(connector => !connector.is_default && connector.name !== 'default') || [];

  return (
    <div className="mb-12">
      {/* Connector form modal */}
      <ConnectorFormModal
        isOpen={isConnectorFormOpen}
        onClose={() => {
          setIsConnectorFormOpen(false);
          setSelectedConnector(undefined);
        }}
        onSubmit={handleConnectorSubmit}
        initialServer={selectedConnector}
        isDarkMode={isDarkMode}
      />

      {/* Confirmation dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={handleDeleteConnector}
        title="Delete Connector"
        message={`Are you sure you want to delete this connector? This action cannot be undone.`}
        isDarkMode={isDarkMode}
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl sm:text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} sm:hidden`}>Connectors</h2>
        <h2 className={`hidden sm:block text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Connectors</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedConnector(undefined);
              setIsConnectorFormOpen(true);
            }}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-md text-sm sm:text-base`}
          >
            Add Connector
          </button>
        </div>
      </div>

      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-6 text-sm sm:text-base`}>Manage your connector configurations</p>

      {connectorLoading ? (
        <div className={`${isDarkMode ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden p-4 text-center`}>
          <div className={`animate-pulse ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading connector configurations...</div>
        </div>
      ) : connectorError ? (
        <div className={`${isDarkMode ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden p-4 text-center`}>
          <div className="text-red-500">Error loading connector configurations</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-blue-500 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : connectors ? (
        <>
          {/* Default Connectors Section */}
          {defaultConnectors.length > 0 && (
            <div className="mb-6">
              {renderConnectorList(defaultConnectors, true)}
            </div>
          )}

          {/* User-Configured Connectors Section */}
          {userConnectors.length > 0 && defaultConnectors.length > 0 && (
            <div className={`w-full h-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} mb-6`}></div>
          )}
          {renderConnectorList(userConnectors, false, "No custom connector configurations found")}
        </>
      ) : (
        <div className={`${isDarkMode ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden p-4 text-center`}>
          <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No connector configurations found</div>
        </div>
      )}
    </div>
  );
};
