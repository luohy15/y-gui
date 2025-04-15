import React from 'react';

interface TocToggleButtonProps {
  onClick: () => void;
  isDarkMode: boolean;
}

const TocToggleButton: React.FC<TocToggleButtonProps> = ({ onClick, isDarkMode }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-full transition-colors ${
        isDarkMode
          ? 'text-gray-400 hover:text-white hover:bg-gray-800'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
      aria-label="Toggle Table of Contents"
    >
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4 6h16M4 12h16M4 18h7"
        />
      </svg>
    </button>
  );
};

export default TocToggleButton;
