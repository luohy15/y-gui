import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../utils/api';
import { useTheme } from '../../contexts/ThemeContext';

export const OAuthCallback: React.FC = () => {
  // Extract service type from URL path parameter
  const { service } = useParams<{ service: string }>();
  const { isDarkMode } = useTheme();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState(`Processing ${service} authorization...`);
  const [hasProcessed, setHasProcessed] = useState(false);
  const navigate = useNavigate();
  const api = useApi();

  // Format display name with proper capitalization
  const formatDisplayName = (serviceName: string): string => {
    if (!serviceName) return 'Service';

    // Handle special cases like 'gmail' -> 'Gmail' or 'googleCalendar' -> 'Google Calendar'
    return serviceName
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .split('-') // Split by dashes if any
      .map(part => part.charAt(0).toUpperCase() + part.slice(1)) // Capitalize each part
      .join(' ') // Join with spaces
      .trim(); // Remove extra spaces
  };

  const displayName = formatDisplayName(service || '');

  useEffect(() => {
    if (!service) {
      setStatus('error');
      setMessage('Invalid service specified.');
      setTimeout(() => navigate('/settings/integrations'), 3000);
      return;
    }

    // Only process if we haven't already
    if (!hasProcessed) {
      const processAuthCode = async () => {
        try {
          // Extract the authorization code from the URL
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');

          if (!code) {
            setStatus('error');
            setMessage('No authorization code found in the callback URL.');
            return;
          }

          // Mark as processed immediately to prevent duplicate calls
          setHasProcessed(true);

          // Construct the endpoint from the service name
          // Get the service type based on the callback path
          // We need to match the backend's expectations: 'google-gmail' and 'google-calendar'
          let serviceType = service;
          if (service === 'gmail') {
            serviceType = 'google-gmail';
          } else if (service === 'google-calendar') {
            serviceType = 'google-calendar';
          }

          const endpoint = `/api/integration/callback/${serviceType}`;

          // Send the code to the backend
          await api.post(endpoint, { code });

          setStatus('success');
          setMessage(`${displayName} connected successfully!`);

          // Redirect back to settings page after a brief delay
          setTimeout(() => {
            navigate('/settings/integrations');
          }, 1500);

        } catch (error) {
          console.error(`Error processing ${displayName} authorization:`, error);
          setStatus('error');
          setMessage(`Failed to connect ${displayName}. Please try again.`);

          // Redirect back to settings page after showing the error
          setTimeout(() => {
            navigate('/settings/integrations');
          }, 3000);
        }
      };

      processAuthCode();
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className={`max-w-md w-full p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-[#1a1a1a] text-white' : 'bg-white text-gray-900'}`}>
        <h1 className="text-xl font-semibold mb-4 text-center">{displayName} Integration</h1>

        <div className="flex flex-col items-center justify-center py-8">
          {status === 'loading' && (
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          )}

          {status === 'success' && (
            <div className="text-green-500 text-5xl mb-4">✓</div>
          )}

          {status === 'error' && (
            <div className="text-red-500 text-5xl mb-4">✗</div>
          )}

          <p className={`text-center ${status === 'error' ? 'text-red-500' : status === 'success' ? 'text-green-500' : isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;
