import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth0 } from '@auth0/auth0-react';

interface ShareButtonProps {
  chatId?: string;
}

export default function ShareButton({ chatId }: ShareButtonProps) {
  const { isDarkMode } = useTheme();
  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  // Reset copied state after timeout
  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  // Create a ref for the temporary input element
  const tempInputRef = useRef<HTMLInputElement | null>(null);

  // Fallback copy function for mobile browsers
  const fallbackCopyToClipboard = (text: string): boolean => {
    try {
      // Create a temporary input if it doesn't exist
      if (!tempInputRef.current) {
        const input = document.createElement('input');
        input.style.position = 'absolute';
        input.style.left = '-9999px';
        input.style.fontSize = '12pt'; // Larger font size helps on some mobile devices
        document.body.appendChild(input);
        tempInputRef.current = input;
      }

      const input = tempInputRef.current;
      input.value = text;
      input.focus();
      input.select();
      input.setSelectionRange(0, text.length); // For mobile devices

      // Execute the copy command
      const successful = document.execCommand('copy');
      return successful;
    } catch (err) {
      console.error('Fallback clipboard copy failed:', err);
      return false;
    }
  };

  // Clean up the temporary input on component unmount
  useEffect(() => {
    return () => {
      if (tempInputRef.current) {
        document.body.removeChild(tempInputRef.current);
        tempInputRef.current = null;
      }
    };
  }, []);

  // Try to use the native Web Share API if available
  const useNativeShare = async (shareUrl: string): Promise<boolean> => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shared Chat',
          url: shareUrl
        });
        return true;
      } catch (err) {
        // User may have canceled or sharing failed
        console.log('Native share was canceled or failed');
        return false;
      }
    }
    return false;
  };

  const handleShare = async () => {
    if (!chatId) return;

    setIsSharing(true);
    try {
      // Get Auth0 token
      const accessToken = await getAccessTokenSilently();
      if (!accessToken) {
        throw new Error('Failed to get access token');
      }

      // Call the API to generate a share link
      const response = await fetch(`/api/share/${chatId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate share link');
      }

      const data = await response.json();

      // Construct the full share URL
      const shareUrl = `${window.location.origin}/share/${data.shareId}`;

      // First try native sharing (on mobile)
      const sharedNatively = await useNativeShare(shareUrl);

      if (!sharedNatively) {
        // Then try clipboard API with fallback
        let copySucceeded = false;

        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(shareUrl);
            copySucceeded = true;
          } catch (err) {
            console.warn('Modern clipboard API failed, trying fallback');
          }
        }

        // If modern API failed, try fallback
        if (!copySucceeded) {
          copySucceeded = fallbackCopyToClipboard(shareUrl);
        }

        if (copySucceeded) {
          setIsCopied(true);
        } else {
          console.error('All clipboard methods failed');
          // Could show an error toast here
        }
      } else {
        // If we used native sharing, we can still show copied message
        setIsCopied(true);
      }
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
    <div className="flex items-center space-x-2 relative">
      <button
        onClick={handleShare}
        disabled={isSharing}
        className={`p-2 rounded-full transition-all transform min-w-[44px] min-h-[44px] flex items-center justify-center ${
          isDarkMode
            ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-300 active:scale-90 active:bg-gray-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800 active:scale-90 active:bg-gray-200'
        } ${isSharing ? 'cursor-not-allowed opacity-75' : ''}`}
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

      {/* Mobile-friendly tooltip */}
      {isCopied && (
        <div
          className={`absolute top-[-40px] left-1/2 transform -translate-x-1/2 px-3 py-1 rounded text-sm ${
            isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
          } shadow-md z-10`}
        >
          Copied to clipboard!
          <div className={`absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-3 h-3 rotate-45 ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
          }`}></div>
        </div>
      )}
    </div>
  );
}
