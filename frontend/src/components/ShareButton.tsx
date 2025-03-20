import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth0 } from '@auth0/auth0-react';

interface ShareButtonProps {
  chatId?: string;
}

export default function ShareButton({ chatId }: ShareButtonProps) {
  const { isDarkMode } = useTheme();
  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { getIdTokenClaims } = useAuth0();

  // Reset copied state after timeout
  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  const handleShare = async () => {
    if (!chatId) return;

    setIsSharing(true);
    try {
      // Get Auth0 token
      const claims = await getIdTokenClaims();
      if (!claims || !claims.__raw) {
        throw new Error('Failed to get ID token');
      }

      const idToken = claims.__raw;

      // Call the API to generate a share link
      const response = await fetch(`/api/share/${chatId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate share link');
      }

      const data = await response.json();

      // Construct the full share URL and copy directly to clipboard
      const shareUrl = `${window.location.origin}/share/${data.shareId}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
    } catch (error) {
      console.error('Error sharing chat:', error);
      // Could show an error toast here
    } finally {
      setIsSharing(false);
    }
  };

  // Don't render if no chatId is provided
  if (!chatId) return null;

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleShare}
        disabled={isSharing}
        className={`p-2 rounded-md transition-colors ${
          isDarkMode
            ? 'hover:bg-gray-700 text-gray-300'
            : 'hover:bg-gray-200 text-gray-600'
        }`}
        title={isCopied ? "Copied!" : "Share"}
      >
        {isSharing ? (
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : isCopied ? (
          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
          </svg>
        )}
      </button>
    </div>
  );
}
