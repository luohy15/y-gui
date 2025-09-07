import React, { useState, useRef, useEffect } from 'react';
import { McpServer } from '../../../../shared/types';
import { useAuthenticatedSWR, useApi } from '../../utils/api';
import { ConnectorFormModal } from './ConnectorForm';
import { BrowseConnectorsModal } from './BrowseConnectorsModal';
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
  
  // Browse connectors modal state
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false);

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [connectorToDelete, setConnectorToDelete] = useState<string | null>(null);

  // Toggle state
  const [togglingConnector, setTogglingConnector] = useState<string | null>(null);
  
  // Allow tools management state
  const [managingAllowTools, setManagingAllowTools] = useState<string | null>(null);
  const [editingAllowTools, setEditingAllowTools] = useState<{[key: string]: string[]}>({});

  // Tools configuration modal state
  const [toolsConfigModal, setToolsConfigModal] = useState<string | null>(null);
  const [toolSearchQuery, setToolSearchQuery] = useState<string>('');

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

  // Handle adding server from browse modal
  const handleAddServerFromBrowse = async (server: McpServer) => {
    try {
      await api.post('/api/mcp-server', server);
      setStatusMessage({ type: 'success', text: `Connector "${server.name}" added successfully` });
      mutateConnectors();
    } catch (error) {
      console.error('Error adding server:', error);
      setStatusMessage({ type: 'error', text: `Failed to add connector: ${error instanceof Error ? error.message : 'Unknown error'}` });
      throw error; // Re-throw to let the modal handle the error state
    }
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
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setToolsConfigModal(connector.name)}
          className={`px-3 py-1.5 text-sm ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-md`}
          title="Configure tools"
        >
          Configure
        </button>
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

      {/* Browse connectors modal */}
      <BrowseConnectorsModal
        isOpen={isBrowseModalOpen}
        onClose={() => setIsBrowseModalOpen(false)}
        onAddServer={handleAddServerFromBrowse}
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

      {/* Tools Configuration Modal */}
      {toolsConfigModal && (() => {
        const connector = connectors?.find(c => c.name === toolsConfigModal);
        return connector ? (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Configure Tools - {connector.name}
                </h3>
                <button
                  onClick={() => {
                    setToolsConfigModal(null);
                    setToolSearchQuery('');
                  }}
                  className={`text-gray-400 hover:text-gray-600 text-xl font-bold`}
                >
                  ×
                </button>
              </div>

              {/* Allow Tools Management */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-md font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Allowed Tools ({connector.allow_tools?.length || 0})
                  </h4>
                  {managingAllowTools !== connector.name && (
                    <button
                      onClick={() => handleManageAllowTools(connector.name, connector.allow_tools || null)}
                      className={`px-3 py-1.5 text-sm rounded ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'}`}
                    >
                      Manage
                    </button>
                  )}
                </div>
                
                {managingAllowTools === connector.name ? (
                  <div className={`p-4 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    {/* Tags display */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(editingAllowTools[connector.name] || []).map((toolName, toolIndex) => (
                          <span
                            key={toolIndex}
                            className={`px-3 py-1.5 rounded text-sm flex items-center gap-2 ${
                              isDarkMode
                                ? 'bg-gray-800 text-gray-300 border border-gray-600'
                                : 'bg-white text-gray-700 border border-gray-200'
                            }`}
                          >
                            {toolName}
                            <button
                              onClick={() => handleRemoveAllowTool(connector.name, toolName)}
                              className="text-red-400 hover:text-red-300 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Search and add tools */}
                    {connector.tools && connector.tools.length > 0 && (
                      <div className="mb-3">
                        <input
                          type="text"
                          placeholder="Search tools to add..."
                          value={toolSearchQuery}
                          onChange={(e) => setToolSearchQuery(e.target.value)}
                          className={`w-full px-3 py-2 text-sm rounded mb-2 ${isDarkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'} border`}
                        />
                        {toolSearchQuery && (
                          <div className={`max-h-32 overflow-y-auto border rounded ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'}`}>
                            {connector.tools
                              .filter(tool => 
                                !(editingAllowTools[connector.name] || []).includes(tool.name) &&
                                (tool.name.toLowerCase().includes(toolSearchQuery.toLowerCase()) ||
                                 tool.description.toLowerCase().includes(toolSearchQuery.toLowerCase()))
                              )
                              .slice(0, 10) // Limit to 10 results
                              .map((tool, toolIndex) => (
                                <button
                                  key={toolIndex}
                                  onClick={() => {
                                    handleAddAllowTool(connector.name, tool.name);
                                    setToolSearchQuery('');
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-opacity-80 ${isDarkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-900'} border-b last:border-b-0 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}
                                >
                                  <div className="font-medium">{tool.name}</div>
                                  <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {tool.description.slice(0, 80)}{tool.description.length > 80 ? '...' : ''}
                                  </div>
                                </button>
                              ))}
                            {connector.tools
                              .filter(tool => 
                                !(editingAllowTools[connector.name] || []).includes(tool.name) &&
                                (tool.name.toLowerCase().includes(toolSearchQuery.toLowerCase()) ||
                                 tool.description.toLowerCase().includes(toolSearchQuery.toLowerCase()))
                              ).length === 0 && (
                              <div className={`px-3 py-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                No tools found matching "{toolSearchQuery}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveAllowTools(connector.name)}
                        className={`px-4 py-2 text-sm rounded ${isDarkMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancelAllowToolsEdit}
                        className={`px-4 py-2 text-sm rounded ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`p-4 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex flex-wrap gap-2">
                      {(connector.allow_tools?.length || 0) > 0 ? (
                        connector.allow_tools!.map((toolName, toolIndex) => (
                          <span
                            key={toolIndex}
                            className={`px-3 py-1.5 rounded text-sm ${
                              isDarkMode
                                ? 'bg-gray-800 text-gray-300 border border-gray-600'
                                : 'bg-white text-gray-700 border border-gray-200'
                            }`}
                          >
                            {toolName}
                          </span>
                        ))
                      ) : (
                        <span className={`px-3 py-1.5 rounded text-sm ${
                          isDarkMode
                            ? 'bg-yellow-700 text-yellow-200'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          All tools need confirmation
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Available Tools Section */}
              {connector.tools && connector.tools.length > 0 && (
                <div>
                  <h4 className={`text-md font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Available Tools ({connector.tools.length})
                  </h4>
                  <div className={`p-4 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {connector.tools.map((tool, toolIndex) => (
                        <div
                          key={toolIndex}
                          className={`p-3 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}
                        >
                          <div className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {tool.name}
                          </div>
                          <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {tool.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null;
      })()}

      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl sm:text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} sm:hidden`}>Connectors</h2>
        <h2 className={`hidden sm:block text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Connectors</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsBrowseModalOpen(true)}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-md text-sm sm:text-base`}
          >
            Browse Connectors
          </button>
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
