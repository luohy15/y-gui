import React, { useEffect, useState } from 'react';

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
	isDarkMode,
}) => {
	// Render the menu directly in the component tree
	return (
		<div
			style={{
				position: 'fixed',
				zIndex: 9999
			}}
			className={`w-48 rounded-md shadow-lg py-1 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
		>
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
