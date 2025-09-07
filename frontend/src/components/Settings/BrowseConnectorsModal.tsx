import React, { useState, useEffect } from 'react';
import { McpServer } from '../../../../shared/types';
import { useApi } from '../../utils/api';

interface ServerFromAPI {
  uuid: string;
  name: string;
  author_name: string;
  title: string;
  description: string;
  server_key: string;
  config_name: string;
  server_url: string;
  is_openapi: boolean;
}

interface BrowseConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddServer: (server: McpServer) => Promise<void>;
  isDarkMode: boolean;
}

export const BrowseConnectorsModal: React.FC<BrowseConnectorsModalProps> = ({
  isOpen,
  onClose,
  onAddServer,
  isDarkMode
}) => {
  const [servers, setServers] = useState<ServerFromAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingServer, setAddingServer] = useState<string | null>(null);
  
  // API functions
  const api = useApi();

  useEffect(() => {
    if (isOpen) {
      fetchServers();
    }
  }, [isOpen]);

  const fetchServers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/browse-connectors');
      setServers(response.data?.servers || []);
    } catch (err) {
      console.error('Error fetching servers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch servers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddServer = async (serverFromAPI: ServerFromAPI) => {
    setAddingServer(serverFromAPI.name);
    
    const mcpServer: McpServer = {
      name: serverFromAPI.config_name || serverFromAPI.name,
      url: serverFromAPI.server_url,
      status: 'disconnected',
      is_default: false
    };

    try {
      await onAddServer(mcpServer);
      onClose();
    } catch (error) {
      console.error('Error adding server:', error);
    } finally {
      setAddingServer(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`${isDarkMode ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden`}>
        <div className={`flex justify-between items-center p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Browse Available Connectors
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-md ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8">
                <svg className={`h-8 w-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <span className={`ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading servers...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">{error}</div>
              <button
                onClick={fetchServers}
                className={`px-4 py-2 rounded-md ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {servers.map((server) => (
                <div
                  key={server.uuid}
                  className={`${isDarkMode ? 'bg-[#2a2a2a] border-gray-600' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {server.title || server.name}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                          by {server.author_name}
                        </span>
                      </div>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-3`}>
                        {server.description}
                      </p>
                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Config: {server.config_name}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddServer(server)}
                      disabled={addingServer === server.name}
                      className={`ml-4 px-3 py-1.5 text-sm rounded-md ${
                        isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'
                      } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {addingServer === server.name ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`flex justify-end gap-2 p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm rounded-md ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};