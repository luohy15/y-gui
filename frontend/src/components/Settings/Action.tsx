import React, { useEffect, useState } from 'react';
import { BotConfig, McpServerConfig } from '../../../../shared/types';

// Action menu component
interface ActionMenuProps {
	isOpen: boolean;
	onClose: () => void;
	onEdit: () => void;
	onDelete: () => void;
	isDarkMode: boolean;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
	isOpen,
	onClose,
	onEdit,
	onDelete,
	isDarkMode
}) => {
	if (!isOpen) return null;

	return (
		<div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-10 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
			}`}>
			<button
				onClick={() => {
					onEdit();
					onClose();
				}}
				className={`block w-full text-left px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
					}`}
			>
				Edit
			</button>
			<button
				onClick={() => {
					onDelete();
					onClose();
				}}
				className={`block w-full text-left px-4 py-2 text-sm ${isDarkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-gray-100'
					}`}
			>
				Delete
			</button>
		</div>
	);
};
