import React, { useEffect, useState } from 'react';
import { IntegrationConfig } from '../../../../shared/types';
import { useAuthenticatedSWR } from '../../utils/api';

interface IntegrationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (integration: IntegrationConfig) => void;
  initialIntegration?: IntegrationConfig;
  isDarkMode: boolean;
  existingIntegrations?: IntegrationConfig[];
}

export const IntegrationFormModal: React.FC<IntegrationFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialIntegration,
  isDarkMode,
  existingIntegrations = []
}) => {
  const [formData, setFormData] = useState<IntegrationConfig>(
    initialIntegration || {
      name: '',
      auth_type: 'api_key',
      connected: false,
      api_key: ''
    }
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available integration types from MCP servers
  const { data: availableIntegrationTypes, error: fetchError, isLoading: isLoadingIntegrations } =
    useAuthenticatedSWR<string[]>('/api/integration/types');

  // All available integration types
  const allIntegrationNames = availableIntegrationTypes || [];

  // Filter out integrations that already exist in the list
  const integrationNames = initialIntegration
    ? allIntegrationNames // Show all options when editing
    : allIntegrationNames.filter(
        integration => !existingIntegrations.some(
          existing => existing.name === integration
        )
      );

  useEffect(() => {
    if (initialIntegration) {
      setFormData(initialIntegration);
    } else {
      setFormData({
        name: '',
        auth_type: 'api_key',
        connected: false,
        api_key: ''
      });
    }
  }, [initialIntegration]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Auto-determine auth_type based on integration name
    if (name === 'name') {
      const isOAuthIntegration = value === 'google-gmail' || value === 'google-calendar';
      setFormData(prev => ({
        ...prev,
        [name]: value,
        auth_type: isOAuthIntegration ? 'oauth' : 'api_key'
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validate required fields
    if (!formData.name) {
      setError('Integration name is required');
      setIsSubmitting(false);
      return;
    }


    if (!formData.auth_type) {
      setError('Authentication type is required');
      setIsSubmitting(false);
      return;
    }

    // Only validate API key if auth_type is 'api_key'
    if (formData.auth_type === 'api_key' && !formData.api_key) {
      setError('API key is required for API Key authentication');
      setIsSubmitting(false);
      return;
    }

    onSubmit({
      ...formData,
      // For API key auth, consider connected if API key is provided
      // For OAuth, the connected status will be managed by the backend during the OAuth flow
      connected: formData.auth_type === 'api_key' ? !!formData.api_key : false
    });
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className={`relative w-full max-w-2xl ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-lg max-h-[90vh] flex flex-col`}>
        <div className="p-4 sm:p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">
              {initialIntegration ? 'Edit Integration' : 'Add New Integration'}
            </h3>
            <button
              onClick={onClose}
              className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Integration *
                </label>
                {isLoadingIntegrations ? (
                  <div className={`p-3 ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'} rounded-md animate-pulse`}>
                    Loading available integrations...
                  </div>
                ) : fetchError ? (
                  <div className={`p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md`}>
                    Error loading integrations. Please try again.
                  </div>
                ) : integrationNames.length > 0 ? (
                  <select
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    required
                  >
                    <option value="">Select an integration</option>
                    {integrationNames.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                ) : (
                  <div className={`p-3 ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'} rounded-md`}>
                    All available integrations have already been added.
                  </div>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Authentication Type
                </label>
                <div className={`px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md text-sm`}>
                  {formData.auth_type === 'oauth' ? 'OAuth (Google Login)' : 'API Key'}
                </div>
                <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {formData.auth_type === 'oauth'
                    ? 'Authentication via Google login'
                    : 'Authentication via API key'}
                </p>
              </div>

              {formData.auth_type === 'api_key' && (
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    API Key *
                  </label>
                  <input
                    type="password"
                    name="api_key"
                    value={formData.api_key || ''}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    required={formData.auth_type === 'api_key'}
                  />
                  <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    API key for authentication with the service
                  </p>
                </div>
              )}

              {formData.auth_type === 'oauth' && (
                <div className={`p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  <p>After adding this integration, you'll be redirected to authenticate with the service provider.</p>
                </div>
              )}
            </div>

            <div className="mt-4 sm:mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-md`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Saving...' : initialIntegration ? 'Update Integration' : 'Add Integration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
