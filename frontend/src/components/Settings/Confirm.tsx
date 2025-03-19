import React, { useEffect, useState } from 'react';
import { BotConfig, McpServerConfig } from '../../../../shared/types';

// Confirmation dialog component
interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isDarkMode: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isDarkMode
}) => {
  if (!isOpen) return null;

  return (
	<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
	  <div className={`relative w-full max-w-md ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-lg`}>
		<div className="p-6">
		  <h3 className="text-xl font-semibold mb-4">{title}</h3>
		  <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{message}</p>

		  <div className="flex justify-end space-x-3">
			<button
			  onClick={onClose}
			  className={`px-4 py-2 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-md`}
			>
			  Cancel
			</button>
			<button
			  onClick={() => {
				onConfirm();
				onClose();
			  }}
			  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
			>
			  Delete
			</button>
		  </div>
		</div>
	  </div>
	</div>
  );
};
