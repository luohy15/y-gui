import React, { useState } from 'react';
import { IntegrationConfig } from '../../../../shared/types';
import { useAuthenticatedSWR, useApi } from '../../utils/api';
import { ConfirmationDialog } from './Confirm';
import { IntegrationFormModal } from './IntegrationForm';

interface IntegrationItemProps {
  integration: IntegrationConfig;
  isDarkMode: boolean;
  onConnect: (integration: IntegrationConfig) => void;
  onDisconnect: (integration: IntegrationConfig) => void;
  onUpdateApiKey: (integration: IntegrationConfig, apiKey: string) => void;
  isLoading: boolean;
  hasError: boolean;
}

const IntegrationItem: React.FC<IntegrationItemProps> = ({
  integration,
  isDarkMode,
  onConnect,
  onDisconnect,
  onUpdateApiKey,
  isLoading,
  hasError
}) => {
  const [apiKey, setApiKey] = useState(integration.api_key || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveApiKey = () => {
    onUpdateApiKey(integration, apiKey);
    setIsEditing(false);
  };

  const getDescription = () => {
    switch(integration.name) {
      case 'google-calendar':
        return 'Connect your Google Calendar to access your events';
      case 'google-gmail':
        return 'Connect your Gmail account to access your emails';
      default:
        return `Connect to ${integration.name}`;
    }
  };

  const renderConnectionUI = () => {
    if (isLoading) {
      return (
        <div className={`animate-pulse ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Loading...
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="text-red-500 text-sm">
          Error loading integrations
        </div>
      );
    }

    if (integration.connected) {
      return (
        <button
          onClick={() => onDisconnect(integration)}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-sm sm:text-base`}
        >
          Disconnect
        </button>
      );
    }

    // For API key based integrations
    if (integration.auth_type === 'api_key') {
      return (
        <div className="flex flex-col items-end">
          {isEditing ? (
            <div className="flex items-center mb-2">
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className={`mr-2 px-2 py-1 border rounded-md ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                placeholder="Enter API Key"
              />
              <button
                onClick={handleSaveApiKey}
                className={`px-3 py-1 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md text-sm`}
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md text-sm sm:text-base mb-2`}
            >
              {integration.api_key ? 'Update API Key' : 'Add API Key'}
            </button>
          )}
          {integration.api_key && (
            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              API Key: {integration.api_key.substring(0, 4)}...{integration.api_key.substring(integration.api_key.length - 4)}
            </div>
          )}
        </div>
      );
    }

    // For OAuth based integrations (auth_type === 'oauth')
    return (
      <button
        onClick={() => onConnect(integration)}
        className={`px-3 py-1.5 sm:px-4 sm:py-2 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md text-sm sm:text-base`}
      >
        Connect
      </button>
    );
  };

  return (
    <div className={`${isDarkMode ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden mb-6`}>
      <div className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{integration.name}</h3>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {getDescription()}
            </div>
          </div>
          <div>
            {renderConnectionUI()}
          </div>
        </div>
      </div>
    </div>
  );
};

interface IntegrationSectionProps {
  isDarkMode: boolean;
  setStatusMessage: (message: {type: 'success' | 'error', text: string} | null) => void;
}

export const IntegrationSection: React.FC<IntegrationSectionProps> = ({
  isDarkMode,
  setStatusMessage
}) => {
  // Form modal state
  const [isIntegrationFormOpen, setIsIntegrationFormOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | undefined>(undefined);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    integration: IntegrationConfig | null;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    integration: null,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // API utilities
  const api = useApi();

  // Fetch integrations using authenticated SWR
  const { data: integrations, error: integrationsError, isLoading: integrationsLoading, mutate: mutateIntegrations } =
    useAuthenticatedSWR<IntegrationConfig[]>('/api/integrations');

  // Handle integrations connect
  const handleConnect = async (integration: IntegrationConfig) => {
    // For API key based integrations, we don't call the auth API
    // This is handled directly in the IntegrationItem component with the Update API Key button

    // Only for OAuth-based integrations, redirect to the authentication URL
    if (integration.auth_type === 'oauth') {
      try {
        const { authUrl } = await api.get(`/api/integration/auth/${integration.name}`);

        // Redirect to the OAuth URL
        window.location.href = authUrl;

      } catch (error) {
        console.error(`Error starting ${integration.name} auth:`, error);
        setStatusMessage({ type: 'error', text: `Failed to initiate ${integration.name} authentication` });
      }
    }
  };

  // Handle integration disconnection
  const handleDisconnect = (integration: IntegrationConfig) => {
    setConfirmDialog({
      isOpen: true,
      integration,
      title: `Disconnect ${integration.name}`,
      message: `Are you sure you want to disconnect ${integration.name}? You will need to re-authenticate to use it again.`,
      onConfirm: () => confirmDisconnect(integration)
    });
  };

  // Confirm disconnection
  const confirmDisconnect = async (integration: IntegrationConfig) => {
    try {
      await api.post(`/api/integration/disconnect/${integration.name}`, {});
      setStatusMessage({ type: 'success', text: `${integration.name} disconnected successfully` });
      mutateIntegrations();
    } catch (error) {
      console.error(`Error disconnecting ${integration.name}:`, error);
      setStatusMessage({ type: 'error', text: `Failed to disconnect ${integration.name}` });
    } finally {
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Handle API key update
  const handleUpdateApiKey = async (integration: IntegrationConfig, apiKey: string) => {
    try {
      const updatedIntegration: IntegrationConfig = {
        ...integration,
        api_key: apiKey,
        connected: !!apiKey // Consider connected if API key is provided
      };

      await api.put(`/api/integration/${integration.name}`, updatedIntegration);
      setStatusMessage({ type: 'success', text: `${integration.name} API key updated successfully` });
      mutateIntegrations();
    } catch (error) {
      console.error(`Error updating ${integration.name} API key:`, error);
      setStatusMessage({ type: 'error', text: `Failed to update ${integration.name} API key` });
    }
  };

  // Handle integration form submission
  const handleIntegrationSubmit = async (integration: IntegrationConfig) => {
    try {
      if (selectedIntegration) {
        // Update existing integration
        await api.put(`/api/integration/${selectedIntegration.name}`, integration);
        setStatusMessage({ type: 'success', text: `Integration "${integration.name}" updated successfully` });
      } else {
        // Add new integration
        await api.post('/api/integration', integration);
        setStatusMessage({ type: 'success', text: `Integration "${integration.name}" added successfully` });
      }

      // Close the form and refresh the integrations list
      setIsIntegrationFormOpen(false);
      setSelectedIntegration(undefined);
      mutateIntegrations();
    } catch (error) {
      console.error('Error saving integration:', error);
      setStatusMessage({ type: 'error', text: `Failed to save integration: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  return (
    <div className="mb-12">
      {/* Dynamic confirmation dialog for disconnecting any integration */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDarkMode={isDarkMode}
      />

      {/* Integration form modal */}
      <IntegrationFormModal
        isOpen={isIntegrationFormOpen}
        onClose={() => {
          setIsIntegrationFormOpen(false);
          setSelectedIntegration(undefined);
        }}
        onSubmit={handleIntegrationSubmit}
        initialIntegration={selectedIntegration}
        isDarkMode={isDarkMode}
        existingIntegrations={integrations || []}
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl sm:text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} sm:hidden`}>Integrations</h2>
        <h2 className={`hidden sm:block text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Integrations</h2>
        <button
          onClick={() => {
            setSelectedIntegration(undefined);
            setIsIntegrationFormOpen(true);
          }}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md text-sm sm:text-base`}
        >
          Add Integration
        </button>
      </div>

      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-6 text-sm sm:text-base`}>Manage your external service integrations</p>

      {/* Dynamically render all integrations */}
      {integrationsLoading ? (
        <div className={`animate-pulse ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} p-4`}>
          Loading integrations...
        </div>
      ) : integrationsError ? (
        <div className="text-red-500 p-4">
          Error loading integrations. Please try again later.
        </div>
      ) : integrations && integrations.length > 0 ? (
        integrations.map((integration) => (
          <IntegrationItem
            key={integration.name}
            integration={integration}
            isDarkMode={isDarkMode}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onUpdateApiKey={handleUpdateApiKey}
            isLoading={integrationsLoading}
            hasError={!!integrationsError}
          />
        ))
      ) : (
        <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} p-4`}>
          No integrations available.
        </div>
      )}
    </div>
  );
};
