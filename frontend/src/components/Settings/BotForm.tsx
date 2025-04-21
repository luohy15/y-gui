import React, { useEffect, useState } from 'react';
import { BotConfig, McpServerConfig } from '../../../../shared/types';

// Bot form modal component
interface BotFormModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (bot: BotConfig) => void;
	initialBot?: BotConfig;
	mcpServers?: McpServerConfig[];
	isDarkMode: boolean;
}

export const BotFormModal: React.FC<BotFormModalProps> = ({
	isOpen,
	onClose,
	onSubmit,
	initialBot,
	mcpServers,
	isDarkMode
}) => {
	const [formData, setFormData] = useState<BotConfig>(
		initialBot || {
			name: '',
			model: '',
			base_url: '',
			api_key: '',
			mcp_servers: []
		}
	);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showCustomKey, setShowCustomKey] = useState(false);
	const [showOptionalFields, setShowOptionalFields] = useState(false);

	useEffect(() => {
		if (initialBot) {
			setFormData(initialBot);
			// Set the checkbox states based on initial values
			setShowCustomKey(!!(initialBot.base_url || initialBot.api_key));
			setShowOptionalFields(!!(initialBot.api_type || initialBot.custom_api_path || initialBot.max_tokens));
		}
	}, [initialBot]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
		const { name, value, type } = e.target;

		if (name === 'mcp_servers') {
			// Handle multi-select for MCP servers
			const select = e.target as HTMLSelectElement;
			const selectedOptions = Array.from(select.selectedOptions).map(option => option.value);
			setFormData(prev => ({ ...prev, [name]: selectedOptions }));
		} else {
			setFormData(prev => ({ ...prev, [name]: value }));
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);

		// Validate required fields
		if (!formData.name || !formData.model) {
			setError('Please fill in all required fields');
			setIsSubmitting(false);
			return;
		}

		onSubmit(formData);
		setIsSubmitting(false);
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
			<div className={`relative w-full max-w-2xl ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-lg max-h-[90vh] flex flex-col`}>
				<div className="p-4 sm:p-6 overflow-y-auto">
					<div className="flex justify-between items-center mb-4">
						<h3 className="text-xl font-semibold">
							{initialBot ? 'Edit Bot' : 'Add New Bot'}
						</h3>
						<button
							onClick={onClose}
							className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
						>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					{error && (
						<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
							{error}
						</div>
					)}

					<form onSubmit={handleSubmit}>
						<div className="space-y-3 sm:space-y-4">
							<div>
								<label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
									Name *
								</label>
								<input
									type="text"
									name="name"
									value={formData.name}
									onChange={handleChange}
									className={`w-full px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
									required
								/>
							</div>

							<div>
								<label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
									Model *
								</label>
								<input
									type="text"
									name="model"
									value={formData.model}
									onChange={handleChange}
									className={`w-full px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
									required
								/>
							</div>

							{mcpServers && mcpServers.length > 0 && (
								<div>
									<label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
										MCP Servers
									</label>
									<select
										name="mcp_servers"
										multiple
										value={formData.mcp_servers || []}
										onChange={handleChange}
										className={`w-full px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
										size={Math.min(3, mcpServers.length)}
									>
										{mcpServers.map(server => (
											<option key={server.name} value={server.name}>
												{server.name}
											</option>
										))}
									</select>
									<p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
										Hold Ctrl/Cmd to select multiple servers
									</p>
								</div>
							)}

							<div>
								<div className="flex items-center mb-2">
									<input
										type="checkbox"
										id="showCustomKey"
										checked={showCustomKey}
										onChange={(e) => {
											setShowCustomKey(e.target.checked);
											if (!e.target.checked) {
												// Clear base_url and api_key fields when unchecked
												setFormData(prev => ({
													...prev,
													base_url: '',
													api_key: ''
												}));
											}
										}}
										className={`mr-2 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
									/>
									<label
										htmlFor="showCustomKey"
										className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
									>
										Provide your own key
									</label>
								</div>

								{showCustomKey && (
									<>
										<div className="mt-3">
											<label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
												Base URL
											</label>
											<input
												type="text"
												name="base_url"
												value={formData.base_url || ''}
												onChange={handleChange}
												className={`w-full px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
											/>
										</div>

										<div className="mt-3">
											<label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
												API Key
											</label>
											<input
												type="password"
												name="api_key"
												value={formData.api_key || ''}
												onChange={handleChange}
												className={`w-full px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
											/>
											<p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
												Your key is visible to site admin, please provide key with Credit limit
											</p>
										</div>
									</>
								)}
							</div>

							<div>
								<div className="flex items-center mb-2">
									<input
										type="checkbox"
										id="showOptionalFields"
										checked={showOptionalFields}
										onChange={(e) => {
											setShowOptionalFields(e.target.checked);
											if (!e.target.checked) {
												// Clear optional fields when unchecked
												setFormData(prev => ({
													...prev,
													api_type: '',
													custom_api_path: '',
													max_tokens: undefined
												}));
											}
										}}
										className={`mr-2 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
									/>
									<label
										htmlFor="showOptionalFields"
										className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
									>
										Optional settings
									</label>
								</div>

								{showOptionalFields && (
									<>
										<div className="mt-3">
											<label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
												API Type
											</label>
											<input
												type="text"
												name="api_type"
												value={formData.api_type || ''}
												onChange={handleChange}
												className={`w-full px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
											/>
										</div>

										<div className="mt-3">
											<label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
												Custom API Path
											</label>
											<input
												type="text"
												name="custom_api_path"
												value={formData.custom_api_path || ''}
												onChange={handleChange}
												className={`w-full px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
											/>
										</div>

										<div className="mt-3">
											<label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
												Max Tokens
											</label>
											<input
												type="number"
												name="max_tokens"
												value={formData.max_tokens || ''}
												onChange={handleChange}
												className={`w-full px-3 py-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
											/>
										</div>
									</>
								)}
							</div>
						</div>

						<div className="mt-4 sm:mt-6 flex justify-end space-x-3">
							<button
								type="button"
								onClick={onClose}
								className={`px-4 py-2 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-md`}
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting}
								className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
							>
								{isSubmitting ? 'Saving...' : initialBot ? 'Update Bot' : 'Add Bot'}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};
