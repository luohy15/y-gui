import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ContentBlock } from '@shared/types';

interface MessageCopyButtonProps {
  messageContent: string | ContentBlock[];
}

export default function MessageCopyButton({
  messageContent,
}: MessageCopyButtonProps) {
  const { isDarkMode } = useTheme();
  const [isCopying, setIsCopying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Reset copied state after timeout
  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  const handleCopy = async () => {
    if (!messageContent) return;

    setIsCopying(true);
    try {
      const textContent = Array.isArray(messageContent)
        ? messageContent.map(block => block.text).join('\n')
        : messageContent;
      await navigator.clipboard.writeText(textContent);
      setIsCopied(true);
    } catch (err) {
      console.error('Failed to copy text:', err);
    } finally {
      setIsCopying(false);
    }
  };

  const baseButtonClass = "p-1 rounded-full transition-all transform";
  const activeButtonClass = `${baseButtonClass} ${
    isDarkMode
      ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-300 active:scale-90 active:bg-gray-700'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800 active:scale-90 active:bg-gray-200'
  }`;

  return (
    <button
      className={activeButtonClass + " min-w-[28px] min-h-[28px] flex items-center justify-center" + (isCopying ? ' cursor-not-allowed opacity-75' : '')}
      onClick={handleCopy}
      disabled={isCopying}
      title={isCopied ? "Copied!" : "Copy"}
    >
      {isCopying ? (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : isCopied ? (
        <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}
