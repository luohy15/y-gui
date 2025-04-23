import React, { useState, useEffect } from 'react';
import { IntegrationConfig } from '../../../../shared/types';
import { useAuthenticatedSWR, useApi } from '../../utils/api';
import { ConfirmationDialog } from './Confirm';

interface IntegrationSectionProps {
  isDarkMode: boolean;
  setStatusMessage: (message: {type: 'success' | 'error', text: string} | null) => void;
}

export const IntegrationSection: React.FC<IntegrationSectionProps> = ({
  isDarkMode,
  setStatusMessage
}) => {
  const [isConfirmDisconnectCalendarOpen, setIsConfirmDisconnectCalendarOpen] = useState(false);
  const [isConfirmDisconnectGmailOpen, setIsConfirmDisconnectGmailOpen] = useState(false);

  // API utilities
  const api = useApi();

  // Fetch integrations using authenticated SWR
  const { data: integrations, error: integrationsError, isLoading: integrationsLoading, mutate: mutateIntegrations } =
    useAuthenticatedSWR<IntegrationConfig[]>('/api/integrations');

  // Handle Google Calendar authentication
  const handleConnectGoogleCalendar = async () => {
    try {
      const { authUrl } = await api.get('/api/integration/google-calendar/auth');

      // Redirect to the OAuth URL instead of opening a popup
      window.location.href = authUrl;

    } catch (error) {
      console.error('Error starting Google Calendar auth:', error);
      setStatusMessage({ type: 'error', text: 'Failed to initiate Google Calendar authentication' });
    }
  };

  // Handle Google Calendar disconnection
  const handleDisconnectGoogleCalendar = async () => {
    try {
      await api.post('/api/integration/google-calendar/disconnect', {});
      setStatusMessage({ type: 'success', text: 'Google Calendar disconnected successfully' });
      mutateIntegrations();
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      setStatusMessage({ type: 'error', text: 'Failed to disconnect Google Calendar' });
    } finally {
      setIsConfirmDisconnectCalendarOpen(false);
    }
  };

  // Handle Gmail authentication
  const handleConnectGmail = async () => {
    try {
      const { authUrl } = await api.get('/api/integration/gmail/auth');

      // Redirect to the OAuth URL
      window.location.href = authUrl;

    } catch (error) {
      console.error('Error starting Gmail auth:', error);
      setStatusMessage({ type: 'error', text: 'Failed to initiate Gmail authentication' });
    }
  };

  // Handle Gmail disconnection
  const handleDisconnectGmail = async () => {
    try {
      await api.post('/api/integration/gmail/disconnect', {});
      setStatusMessage({ type: 'success', text: 'Gmail disconnected successfully' });
      mutateIntegrations();
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      setStatusMessage({ type: 'error', text: 'Failed to disconnect Gmail' });
    } finally {
      setIsConfirmDisconnectGmailOpen(false);
    }
  };

  // Find integrations
  const googleCalendarIntegration = integrations?.find(i => i.type === 'google-calendar');
  const gmailIntegration = integrations?.find(i => i.type === 'google-gmail');

  return (
    <div className="mb-12">
      {/* Confirmation dialog for disconnecting Google Calendar */}
      <ConfirmationDialog
        isOpen={isConfirmDisconnectCalendarOpen}
        onClose={() => setIsConfirmDisconnectCalendarOpen(false)}
        onConfirm={handleDisconnectGoogleCalendar}
        title="Disconnect Google Calendar"
        message="Are you sure you want to disconnect Google Calendar? You will need to re-authenticate to use it again."
        isDarkMode={isDarkMode}
      />

      {/* Confirmation dialog for disconnecting Gmail */}
      <ConfirmationDialog
        isOpen={isConfirmDisconnectGmailOpen}
        onClose={() => setIsConfirmDisconnectGmailOpen(false)}
        onConfirm={handleDisconnectGmail}
        title="Disconnect Gmail"
        message="Are you sure you want to disconnect Gmail? You will need to re-authenticate to use it again."
        isDarkMode={isDarkMode}
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl sm:text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} sm:hidden`}>Integrations</h2>
        <h2 className={`hidden sm:block text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Integrations</h2>
      </div>

      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-6 text-sm sm:text-base`}>Manage your external service integrations</p>

      {/* Google Calendar Integration */}
      <div className={`${isDarkMode ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden mb-6`}>
        <div className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Google Calendar</h3>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Connect your Google Calendar to access your events
              </div>
            </div>

            <div>
              {integrationsLoading ? (
                <div className={`animate-pulse ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Loading...
                </div>
              ) : integrationsError ? (
                <div className="text-red-500 text-sm">
                  Error loading integrations
                </div>
              ) : googleCalendarIntegration && googleCalendarIntegration.connected ? (
                <button
                  onClick={() => setIsConfirmDisconnectCalendarOpen(true)}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-sm sm:text-base`}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnectGoogleCalendar}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md text-sm sm:text-base`}
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gmail Integration */}
      <div className={`${isDarkMode ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden mb-6`}>
        <div className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Gmail</h3>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Connect your Gmail account to access your emails
              </div>
            </div>

            <div>
              {integrationsLoading ? (
                <div className={`animate-pulse ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Loading...
                </div>
              ) : integrationsError ? (
                <div className="text-red-500 text-sm">
                  Error loading integrations
                </div>
              ) : gmailIntegration && gmailIntegration.connected ? (
                <button
                  onClick={() => setIsConfirmDisconnectGmailOpen(true)}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-sm sm:text-base`}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnectGmail}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md text-sm sm:text-base`}
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
