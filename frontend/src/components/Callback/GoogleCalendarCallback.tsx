import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../utils/api';
import { useTheme } from '../../contexts/ThemeContext';

export const GoogleCalendarCallback: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Google Calendar authorization...');
  const [hasProcessed, setHasProcessed] = useState(false);
  const navigate = useNavigate();
  const api = useApi();

  useEffect(() => {
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

        // Send the code to the backend
        await api.post('/api/integration/google-calendar/callback', { code });

        setStatus('success');
        setMessage('Google Calendar connected successfully!');

        // Redirect back to settings page after a brief delay
        setTimeout(() => {
          navigate('/settings/integrations');
        }, 1500);

      } catch (error) {
        console.error('Error processing Google Calendar authorization:', error);
        setStatus('error');
        setMessage('Failed to connect Google Calendar. Please try again.');

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
        <h1 className="text-xl font-semibold mb-4 text-center">Google Calendar Integration</h1>

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

export default GoogleCalendarCallback;
