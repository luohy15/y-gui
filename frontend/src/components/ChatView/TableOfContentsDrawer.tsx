import React from 'react';
import { Message } from '@shared/types';
import TableOfContents from './TableOfContents';

interface TableOfContentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  isDarkMode: boolean;
  onScrollToMessage: (id: string) => void;
  currentMessageId?: string;
}

const TableOfContentsDrawer: React.FC<TableOfContentsDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  isDarkMode,
  onScrollToMessage,
  currentMessageId
}) => {
  // Handle clicking on a TOC item
  const handleTocItemClick = (id: string) => {
    onScrollToMessage(id);
    onClose(); // Close the drawer after clicking
  };

  return (
    <>
      {/* Overlay - only visible when drawer is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-[280px] z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } sm:hidden`}
      >
        <div className="h-full flex flex-col">
          {/* Close button */}
          <div className={`p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} flex justify-between items-center`}>
            <button
              onClick={onClose}
              className={`p-1 rounded-full ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
              aria-label="Close table of contents"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Table of contents content */}
          <div className="flex-1 overflow-hidden">
            <TableOfContents
              messages={messages}
              isDarkMode={isDarkMode}
              onScrollToMessage={handleTocItemClick}
              currentMessageId={currentMessageId}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default TableOfContentsDrawer;
