import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chat, Message, McpServerConfig } from '@shared/types';
import MessageInput from './MessageInput';
import useSWR, { SWRConfiguration, mutate } from 'swr';
import { useTheme } from '../contexts/ThemeContext';
import AssistantAvatar from './AssistantAvatar';
import CompactMarkdown from './Markdown';
import { useApi, useAuthenticatedSWR } from '../utils/api';
import { useAuth0 } from '@auth0/auth0-react';
import ShareButton from './ShareButton';
import MessageActions from './MessageActions';

// Copy button component
const CopyButton = ({ content, isDarkMode, isRight }: { content: string; isDarkMode: boolean; isRight: boolean }) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(content);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};

	return (
		<button
			onClick={handleCopy}
			className={`absolute ${isRight ? '-right-12' : '-left-12'} top-0 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100
        ${isDarkMode
					? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
					: 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`}
			title={copied ? 'Copied!' : 'Copy message'}
		>
			{copied ? (
				<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
				</svg>
			) : (
				<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
						d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
				</svg>
			)}
		</button>
	);
};

export default function ChatView() {
	const { isDarkMode } = useTheme();
	const navigate = useNavigate();
	const { id } = useParams<{ id: string }>();
	// Configure SWR options for proper revalidation
	const swrConfig: SWRConfiguration = {
		revalidateOnFocus: false,
		revalidateOnReconnect: true,
		refreshInterval: 0, // Disable auto refresh
		dedupingInterval: 2000, // Dedupe requests within 2 seconds
	};

	// State for message input
	const [message, setMessage] = useState('');
	const [selectedBot, setSelectedBot] = useState<string>('');
	const [isStreaming, setIsStreaming] = useState(false);
	const abortControllerRef = React.useRef<AbortController | null>(null);
	const [toolInfoState, setToolInfoState] = useState<{
		plain_content: string | undefined;
		server: string | undefined;
		tool: string | undefined;
		arguments: any | undefined;
	}>({
		plain_content: undefined,
		server: undefined,
		tool: undefined,
		arguments: undefined
	});
	const [toolResultState, setToolResultState] = useState<{
		content: string | undefined;
		server: string | undefined;
	}>({
		content: undefined,
		server: undefined
	});

	// State for MCP status logs
	const [mcpLogs, setMcpLogs] = useState<Array<{
		status: "connecting" | "connected" | "error" | "info" | "summary";
		message: string;
		timestamp: string;
	}>>([]);
	const [isLogVisible, setIsLogVisible] = useState(false);
	const [serverStatus, setServerStatus] = useState<Record<string, {
		status: "connected" | "connecting" | "error" | "disconnected";
		lastUpdated: string;
		message?: string;
	}>>({});

	const { data: chat, error } = useAuthenticatedSWR<Chat>(
		id ? `/api/chats/${id}` : null,
		swrConfig
	);

	// Fetch MCP servers to check need_confirm list
	const { data: mcpServers } = useAuthenticatedSWR<McpServerConfig[]>(
		'/api/mcp-servers',
		swrConfig
	);

	// Get the bot data for the selected bot
	const selectedBotData = React.useMemo(() => {
		if (!selectedBot || !mcpServers?.length) return null;
		return mcpServers.find(b => b.name === selectedBot);
	}, [selectedBot, mcpServers]);

	// Filter for relevant MCP servers
	const relevantMcpServers = React.useMemo(() => {
		if (!selectedBotData || !mcpServers?.length) return [];
		return mcpServers;
	}, [selectedBotData, mcpServers]);
	const messagesEndRef = React.useRef<HTMLDivElement>(null);
	const [collapsedReasoning, setCollapsedReasoning] = React.useState<{ [key: string]: boolean }>({});
	const [collapsedToolInfo, setCollapsedToolInfo] = React.useState<{ [key: string]: boolean }>({});
	// Initialize tool results as collapsed by default
	const [collapsedToolResults, setCollapsedToolResult] = React.useState<{ [key: string]: boolean }>(() => ({}));

	// Common method to add messages to chat
	const addMessageToChat = async (
		content: string,
		role: 'user' | 'assistant',
		additionalProps: Partial<Message> = {}
	) => {
		await mutate(
			`/api/chats/${id}`,
			(cachedChat: Chat | undefined) => {
				if (!cachedChat) return cachedChat;

				// Create a deep copy of the chat
				const updatedChat = JSON.parse(JSON.stringify(cachedChat));

				// Create message with common and role-specific properties
				const message: Message = {
					role: role,
					content: content,
					timestamp: new Date().toISOString(),
					unix_timestamp: Math.floor(Date.now() / 1000),
					...additionalProps
				};

				// Add message to chat
				updatedChat.messages.push(message);
				updatedChat.update_time = new Date().toISOString();

				return updatedChat;
			},
			false
		);
	};

	const updateLastMessageChunk = async (chunk: string) => {
		await mutate(
			`/api/chats/${id}`,
			(cachedChat: Chat | undefined) => {
				if (!cachedChat) return cachedChat;

				// Create a deep copy of the chat
				const updatedChat = JSON.parse(JSON.stringify(cachedChat));

				// Get the last message (which should be the assistant's message)
				const lastMessage = updatedChat.messages[updatedChat.messages.length - 1];

				// Only update if it's an assistant message
				if (lastMessage && lastMessage.role === 'assistant' && chunk) {
					lastMessage.content = (lastMessage.content || '') + chunk;
				}

				return updatedChat;
			},
			false
		);
	}

	const updateLastMessage = async (content?: string,
		role?: 'user' | 'assistant',
		additionalProps: Partial<Message> = {}
	) => {
		await mutate(
			`/api/chats/${id}`,
			(cachedChat: Chat | undefined) => {
				if (!cachedChat) return cachedChat;

				// Create a deep copy of the chat
				const updatedChat = JSON.parse(JSON.stringify(cachedChat));

				// Get the last message (which should be the assistant's message)
				const lastMessage = updatedChat.messages[updatedChat.messages.length - 1];

				// Only update if it's an assistant message
				if (content) {
					lastMessage.content = content;
				}

				if (role) {
					lastMessage.role = role;
				}

				// Update model and provider if needed
				if (additionalProps.model && !lastMessage.model) {
					lastMessage.model = additionalProps.model;
				}

				if (additionalProps.provider && !lastMessage.provider) {
					lastMessage.provider = additionalProps.provider;
				}

				// Update tool info if needed
				if (additionalProps.tool && additionalProps.server && additionalProps.arguments) {
					lastMessage.tool = additionalProps.tool;
					lastMessage.server = additionalProps.server;
					lastMessage.arguments = additionalProps.arguments;
				}

				return updatedChat;
			},
			false
		);
	};

	// Check for 404 error and redirect to home
	useEffect(() => {
		if (error?.status === 404) {
			navigate('/');
		}
	}, [error, navigate]);

	// Check for new chat: data in localStorage or handle existing chat with no assistant response
	useEffect(() => {
		if (!chat || !id || isStreaming) return;

		// Only proceed if we're not already loading or streaming
		(async () => {
			// Check if this is a new chat from Home component
			const storedMessage = localStorage.getItem(`newChat_${id}_message`);
			const storedBot = localStorage.getItem(`newChat_${id}_bot`);

			if (storedMessage && storedBot && chat.messages.length === 0) {
				// Set the selected bot
				setSelectedBot(storedBot);

				// Save to the format MessageInput expects
				localStorage.setItem(`chat_${id}_selectedBot`, storedBot);

				// Add user message to chat
				await addMessageToChat(storedMessage, 'user');

				// Add empty assistant message to start streaming
				await addMessageToChat('', 'assistant');

				// Start streaming the response
				streamResponse(`/api/chat/completions`, JSON.stringify({
					content: storedMessage,
					botName: storedBot,
					chatId: id
				}));

				// Clear localStorage
				localStorage.removeItem(`newChat_${id}_message`);
				localStorage.removeItem(`newChat_${id}_bot`);
			}
		})();
	}, [chat, id, isStreaming]);

	// Scroll to bottom when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [chat?.messages]);


	// Check for auto tool call
	useEffect(() => {
		if (isStreaming) return;
		(async () => {
			if (!toolInfoState.server || !toolInfoState.tool || !toolInfoState.arguments) return;
			// Check if tool needs confirmation
			if (!needsConfirmation(toolInfoState.server, toolInfoState.tool)) {
				await handleToolConfirmation(
					toolInfoState.server,
					toolInfoState.tool,
					toolInfoState.arguments
				);
			}
			// Reset tool state
			setToolInfoState({
				plain_content: undefined,
				server: undefined,
				tool: undefined,
				arguments: undefined
			});
		})();
	}, [isStreaming]);

	// Check for auto user message
	useEffect(() => {
		if (isStreaming) return;
		(async () => {
			// Check if tool needs confirmation
			if (!toolResultState.content) return;
			// Send tool result as user input
			await handleUserMessage(toolResultState.content, { server: toolResultState.server });
			// Reset tool result state
			setToolResultState({ content: undefined, server: undefined });
		})();

	}, [isStreaming]);

	// Handle tool information default display
	useEffect(() => {
		// Only proceed if we have messages and MCP servers data
		if (!chat?.messages.length || !mcpServers) return;

		// Create new state objects to update all at once
		const newToolInfoState = { ...collapsedToolInfo };
		const newToolResultsState = { ...collapsedToolResults };
		let stateChanged = false;

		// Process all messages with tool information
		chat.messages.forEach(msg => {
			// Only process assistant messages with tool info
			if (msg.server) {
				const messageId = msg.unix_timestamp.toString();

				// Ensure tool info are always collapsed initially
				if (newToolInfoState[messageId] !== true) {
					newToolInfoState[messageId] = true; // Collapsed
					stateChanged = true;
				}

				// Ensure tool results are always collapsed initially
				if (newToolResultsState[messageId] !== true) {
					newToolResultsState[messageId] = true; // Collapsed
					stateChanged = true;
				}
			}
		});

		// Only update state if changes were made
		if (stateChanged) {
			setCollapsedToolInfo(newToolInfoState);
			setCollapsedToolResult(newToolResultsState);
		}
	}, [chat?.messages, mcpServers]);



	// Get the API utility for authenticated requests
	const { getIdTokenClaims } = useAuth0();

	// Function to handle stopping the stream
	const handleStopGeneration = () => {
		// Cancel the fetch request if it's active
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}

		// Set streaming to false
		setIsStreaming(false);
	};

	// Function to stream response from API
	const streamResponse = async (url: string, body: string) => {
		if (!id) return;

		setIsStreaming(true);

		// Create a new AbortController for this request
		abortControllerRef.current = new AbortController();
		const signal = abortControllerRef.current.signal;

		try {
			// Get Auth0 token
			const claims = await getIdTokenClaims();
			if (!claims || !claims.__raw) {
				throw new Error('Failed to get ID token');
			}

			const idToken = claims.__raw;

			// Make the API request
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${idToken}`
				},
				body: body,
				signal // Add the AbortController signal to make the request abortable
			});

			if (!response.ok) {
				throw new Error(`Error sending message: ${response.statusText}`);
			}

			// Check if the response is a stream
			if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
				// Handle streaming response
				const reader = response.body?.getReader();
				const decoder = new TextDecoder();

				if (!reader) {
					throw new Error('Response body is not readable');
				}

				// Create a buffer to accumulate incomplete chunks
				let buffer = '';

				// Process the stream
				while (true) {
					const { done, value } = await reader.read();

					if (done) {
						break;
					}

					// Decode the chunk and append to buffer
					buffer += decoder.decode(value, { stream: true });

					// Process SSE format - split by event delimiter
					const lines = buffer.split('\n\n');

					// Process all complete events (all except the last one which might be incomplete)
					for (let i = 0; i < lines.length - 1; i++) {
						const line = lines[i];
						if (line.startsWith('data: ')) {
							const data = line.slice(6);

							if (data === '[DONE]') {
								console.log('Received [DONE], stopping stream processing');
								reader.cancel(); // Cancel the stream reading
								break;
							}

							try {
								// Parse the JSON data
								const parsedData = JSON.parse(data);

								// Check for error messages in the response
								if (parsedData.error) {
									const errorMessage = `**Error:** ${parsedData.error.message || 'Unknown error occurred'}`;
									await updateLastMessage(errorMessage);
									// Cancel stream reading on error
									reader.cancel();
									break;
								}

                // Handle MCP status messages
                if (parsedData.type === "mcp_status") {
                  type McpStatus = "connecting" | "connected" | "error" | "info" | "summary";
                  const status = parsedData.status as McpStatus;
                  const serverName = parsedData.server || "unknown";
                  const timestamp = new Date().toLocaleTimeString();

                  // Update server status
                  setServerStatus(prev => ({
                    ...prev,
                    [serverName]: {
                      status: status === "connected" ? "connected" :
                              status === "connecting" ? "connecting" :
                              status === "error" ? "error" : "disconnected",
                      lastUpdated: timestamp,
                      message: parsedData.message
                    }
                  }));

                  setMcpLogs(prev => [...prev, {
                    status,
                    message: parsedData.message,
                    timestamp
                  }]);
                  setIsLogVisible(true); // Show log area when new message arrives
                }
                // Handle the new SSE data format
                else if (parsedData.choices && parsedData.choices[0]?.delta?.content) {
                  // Update the message directly with the new content
                  await updateLastMessageChunk(parsedData.choices[0].delta.content);
                  // Auto-close log when real message content starts
                  setIsLogVisible(false);
                }

                // Set model and provider info if not already set
                const model = parsedData.model;
                const provider = parsedData.provider;
                await updateLastMessage('', undefined, { model, provider });

                // Assistant message has tool info
                if (parsedData.server && !parsedData.type) {
									let plain_content = parsedData.plainContent;
									let server = parsedData.server;
									let tool = parsedData.tool;
									let tool_args = parsedData.arguments;
									await updateLastMessage(plain_content, 'assistant', {
										server: server,
										tool: tool,
										arguments: tool_args
									});
									setToolInfoState({ plain_content: plain_content, server: server, tool: tool, arguments: tool_args });
								}

								// Tool result
								if (parsedData.role && parsedData.role === 'user') {
									setToolResultState({ content: parsedData.content, server: parsedData.server });
								}
							} catch (e) {
								console.error('Error parsing SSE data:', e);
								console.log('data:', data);
							}
						}
					}

					// Keep the last (potentially incomplete) part for the next iteration
					buffer = lines[lines.length - 1];
				}
			} else {
				// Handle non-streaming response (fallback)
				const updatedChat = await response.json();
				mutate(`/api/chats/${id}`, updatedChat, false);
			}
		} catch (error) {
			console.error('Error streaming response:', error);
		} finally {
			setIsStreaming(false);
		}
	};

	const toggleReasoning = (messageId: string) => {
		setCollapsedReasoning(prev => ({
			...prev,
			[messageId]: !prev[messageId]
		}));
	};

	const toggleToolInfo = (messageId: string) => {
		setCollapsedToolInfo(prev => ({
			...prev,
			[messageId]: !prev[messageId]
		}));
	};

	const toggleToolResult = (messageId: string) => {
		setCollapsedToolResult(prev => ({
			...prev,
			[messageId]: !prev[messageId]
		}));
	};

	// Check if a tool requires confirmation based on the MCP server's need_confirm list
	const needsConfirmation = (serverName: string, toolName: string): boolean => {
		if (!mcpServers) return true; // Default to requiring confirmation if servers aren't loaded yet

		const server = mcpServers.find(s => s.name === serverName);
		if (!server) return true; // Default to requiring confirmation if server not found

		// If need_confirm is null or empty array, no confirmation needed
		if (!server.need_confirm || server.need_confirm.length === 0) {
			return false;
		}

		// Check if the tool name is in the need_confirm list
		return server.need_confirm.includes(toolName);
	};

	const handleUserMessage = async (messageContent: string,
		additionalProps: Partial<Message> = {}
	) => {
		// Add user message to chat immediately
		await addMessageToChat(messageContent, 'user', additionalProps);
		// Add assistant message to chat immediately
		await addMessageToChat('', 'assistant');

		await streamResponse(`/api/chat/completions`, JSON.stringify({
			content: messageContent,
			botName: selectedBot,
			chatId: id,
			server: additionalProps ? additionalProps.server : undefined
		}));
	}

	// Handle sending a message
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!message.trim() || !selectedBot || !id) {
			return;
		}

		// Copy the message
		const messageCopy = message;
		setMessage('');
		// Clear the input immediately to improve UX
		await handleUserMessage(messageCopy);
	};


	// Function to handle tool execution confirmation
	const handleToolConfirmation = async (server?: string, tool?: string, tool_args?: any) => {
		console.log("Handling tool confirmation");
		if (!id) return;

		await streamResponse(`/api/tool/confirm`, JSON.stringify({
			chatId: id,
			botName: selectedBot,
			server: server,
			tool: tool,
			args: tool_args
		}));
	};


	if (!chat) {
		return (
			<div className={`flex items-center justify-center h-screen ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
				<div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Loading...</div>
			</div>
		);
	}

	return (
		<div className={`flex flex-col relative ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
			{/* MCP Status Log Area */}
			{isLogVisible && (
				<div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-80 h-64">
					<div className={`relative w-full h-full rounded-lg shadow-lg overflow-hidden ${
						isDarkMode ? 'bg-gray-800' : 'bg-white'
					}`}>
						<div className={`absolute top-0 left-0 right-0 p-2 flex justify-between items-center ${
							isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
						}`}>
							<span className={`text-sm font-medium ${
								isDarkMode ? 'text-gray-200' : 'text-gray-700'
							}`}>
								MCP Status Logs
							</span>
							<div className="flex items-center space-x-2">
								<button
									onClick={() => setIsLogVisible(false)}
									className={`p-1 rounded hover:bg-opacity-20 ${
										isDarkMode ? 'hover:bg-white text-gray-300' : 'hover:bg-black text-gray-600'
									}`}
									title="Close"
								>
									<svg
										className="w-4 h-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							</div>
						</div>

						<div className={`absolute top-10 bottom-0 left-0 right-0 overflow-y-auto p-2 ${
							isDarkMode ? 'bg-gray-800' : 'bg-white'
						}`}>
							{mcpLogs.map((log, index) => {
								const statusEmoji: Record<typeof log.status, string> = {
									"connecting": "🔄",
									"connected": "✅",
									"error": "❌",
									"info": "ℹ️",
									"summary": "📊"
								};

								return (
									<div
										key={index}
										className={`mb-2 p-2 rounded text-sm ${
											isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
										} ${
											log.status === 'error'
												? isDarkMode
													? 'text-red-300'
													: 'text-red-600'
												: isDarkMode
													? 'text-gray-200'
													: 'text-gray-700'
										}`}
									>
										<div className="flex items-center justify-between">
											<span className="flex items-center gap-2">
												{statusEmoji[log.status]}
												<span className="truncate">{log.message}</span>
											</span>
											<span className={`text-xs ${
												isDarkMode ? 'text-gray-400' : 'text-gray-500'
											}`}>
												{log.timestamp}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			)}
			<div className={`flex-1 px-2 sm:px-4 py-4 space-y-6 sm:space-y-8 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'} overflow-x-hidden overflow-y-auto`}>
				{chat.messages.map((msg, index) => (
					<div
						key={`${msg.unix_timestamp}-${index}`}
						className={`flex items-start space-x-4 ${msg.role === 'user' && !msg.server ? 'flex-row-reverse space-x-reverse' : ''}`}
					>
						<div className="flex-shrink-0">
							{msg.role === 'user' && !msg.server ? (
								<div className={`h-10 w-10 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} flex items-center justify-center`}>
									<span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-medium`}>U</span>
								</div>
							) : (
								<AssistantAvatar model={msg.model} />
							)}
						</div>
						<div className={`max-w-full flex-1 space-y-2 ${msg.role === 'user' && !msg.server ? 'items-end' : 'items-start'}`}>
							<div className={`group relative rounded-lg px-4 py-3 sm:px-6 sm:py-4 break-words whitespace-pre-wrap max-w-[85%] ${msg.role === 'user' && !msg.server
								? 'bg-[#4285f4] text-white ml-auto'
								: isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-700'
								}`}>
								<CopyButton
									content={typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2)}
									isDarkMode={isDarkMode}
									isRight={!!(msg.role === 'assistant' || msg.server)}
								/>
								{/* assistant info */}
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
									<div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
										<span className="text-sm font-medium">{msg.role === 'user' && !msg.server ? 'You' : 'Assistant'}</span>
										<span className="text-xs opacity-75">
											{new Date(msg.timestamp).toLocaleString()}
										</span>
										<div className="flex flex-wrap items-center gap-1">
											{msg.model && (
												<span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${msg.role === 'user' && !msg.server
													? 'bg-blue-400 text-white'
													: isDarkMode ? 'bg-purple-900 text-purple-100' : 'bg-purple-100 text-purple-800'
													}`}>
													{msg.model}
												</span>
											)}
											{msg.provider && (
												<span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${msg.role === 'user' && !msg.server
													? 'bg-blue-400 text-white'
													: isDarkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'
													}`}>
													{msg.provider}
												</span>
											)}
										</div>
									</div>
								</div>
								{/* reasoning content */}
								{msg.reasoning_content && (
									<div className={`mb-3 text-sm ${msg.role === 'user' && !msg.server
										? 'border-blue-400 text-blue-100'
										: isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
										}`}>
										<button
											onClick={() => toggleReasoning(msg.unix_timestamp.toString())}
											className="flex items-center space-x-1 mb-1 opacity-80 hover:opacity-100"
										>
											<svg
												className={`h-4 w-4 transform transition-transform ${!collapsedReasoning[msg.unix_timestamp.toString()] ? 'rotate-90' : ''
													}`}
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
											</svg>
											<span>Reasoning</span>
										</button>
										{!collapsedReasoning[msg.unix_timestamp.toString()] && (
											<div className="pl-5 italic">
												{msg.reasoning_content}
											</div>
										)}
									</div>
								)}
								{/* Loading animation for empty assistant message */}
								{msg.role === 'assistant' && !msg.content && isStreaming && (
									<div className="flex items-center space-x-3 h-8 my-2">
										<span className="animate-pulse text-2xl font-bold">•</span>
										<span className="animate-pulse text-2xl font-bold animation-delay-200">•</span>
										<span className="animate-pulse text-2xl font-bold animation-delay-400">•</span>
									</div>
								)}

								{/* content */}
								{msg.role === 'user' && msg.server ? (
									<div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
										<button
											onClick={() => toggleToolResult(msg.unix_timestamp.toString())}
											className="flex items-center space-x-1 mb-2 opacity-80 hover:opacity-100 text-sm font-medium"
										>
											<svg
												className={`h-4 w-4 transform transition-transform ${!collapsedToolResults[msg.unix_timestamp.toString()] ? 'rotate-90' : ''}`}
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
											</svg>
											<span>Tool Result</span>
										</button>
										{!collapsedToolResults[msg.unix_timestamp.toString()] && (
											<div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
												{typeof msg.content === 'string' ? (
													msg.content.trim().startsWith('{') && msg.content.trim().endsWith('}') ? (
														<pre className="text-xs overflow-x-auto whitespace-pre-wrap">{msg.content}</pre>
													) : (
														<div className="whitespace-pre-wrap">{msg.content}</div>
													)
												) : (
													<div className="whitespace-pre-wrap">
														{JSON.stringify(msg.content, null, 2)}
													</div>
												)}
											</div>
										)}
									</div>
								) : (
									<CompactMarkdown
										content={typeof msg.content === 'string' ? msg.content : ''}
										className={msg.role === 'user' && !msg.server ? 'prose-invert' : 'prose-gray'}
									/>
								)}
								{/* Tool information */}
								{msg.tool && msg.server && msg.arguments && msg.role === 'assistant' && (
									<div className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
										<button
											onClick={() => toggleToolInfo(msg.unix_timestamp.toString())}
											className="flex items-center space-x-1 mb-1 opacity-80 hover:opacity-100"
										>
											<svg
												className={`h-4 w-4 transform transition-transform ${!collapsedToolInfo[msg.unix_timestamp.toString()] ? 'rotate-90' : ''}`}
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
											</svg>
											<span>{index === chat.messages.length - 1 && msg.role === 'assistant' ? 'Tool Execution Request' : 'Tool Information'}</span>
										</button>
										{!collapsedToolInfo[msg.unix_timestamp.toString()] && (
											<div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
												<div className="mb-2">
													<span className="text-sm font-semibold">Server:</span>
													<span className="ml-2 text-sm">{msg.server}</span>
												</div>
												<div className="mb-2">
													<span className="text-sm font-semibold">Tool:</span>
													<span className="ml-2 text-sm">{msg.tool}</span>
												</div>
												<div className="mb-3">
													<span className="text-sm font-semibold">Arguments:</span>
													<pre className={`mt-1 p-2 rounded text-xs overflow-x-auto ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
														{typeof msg.arguments === 'string'
															? msg.arguments
															: JSON.stringify(msg.arguments, null, 2)}
													</pre>
												</div>
												{/* Only show approval buttons for the last assistant message if tool needs confirmation */}
												{index === chat.messages.length - 1 && msg.role === 'assistant' && (
													needsConfirmation(msg.server, msg.tool) && (
														<div className="flex space-x-3">
															<button
																onClick={() => handleToolConfirmation(msg.server, msg.tool, msg.arguments)}
																className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
															>
																Approve
															</button>
															<button
																onClick={() => handleUserMessage("cancel")}
																className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isDarkMode
																		? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
																		: 'bg-gray-200 hover:bg-gray-300 text-gray-700'
																	}`}
															>
																Deny
															</button>
														</div>
													)
												)}
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					</div>
				))}
				{/* Add MessageActions below the last message */}
				{chat.messages.length > 0 && (
					<div className="ml-14">
						<MessageActions
							chatId={id}
							messageContent={typeof chat.messages[chat.messages.length - 1].content === 'string'
								? chat.messages[chat.messages.length - 1].content
								: JSON.stringify(chat.messages[chat.messages.length - 1].content)}
						/>
					</div>
				)}
				<div className="pb-12"></div>
				<div ref={messagesEndRef} />
			</div>
			<div className="flex flex-col">
				<MessageInput
					message={message}
					setMessage={setMessage}
					selectedBot={selectedBot}
					setSelectedBot={setSelectedBot}
					isLoading={isStreaming}
					handleSubmit={handleSubmit}
					isFixed={true} // Keep this input fixed at the bottom of the screen
					onStop={handleStopGeneration} // Add onStop handler to cancel the request
				/>

				{/* MCP Servers Information - Below Input Box */}
				{selectedBot && mcpServers && mcpServers.length > 0 && (
					<div className={`w-full mt-2 mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
						<div className={`rounded-lg p-2 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
							<div className="flex flex-wrap gap-2">
								{mcpServers.map((server) => (
									<div key={server.name} className={`rounded-md p-1.5 text-xs ${isDarkMode ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
										<div className="flex items-center gap-2">
											{/* Status indicator */}
											<div className={`w-2 h-2 rounded-full ${
												serverStatus[server.name]?.status === "connected" ? "bg-green-500" :
												serverStatus[server.name]?.status === "connecting" ? "bg-yellow-500" :
												serverStatus[server.name]?.status === "error" ? "bg-red-500" :
												"bg-gray-500"
											}`}
											title={serverStatus[server.name]?.message || "Unknown status"}
											/>

											<span className={`font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
												{server.name}
											</span>

											{serverStatus[server.name] && (
												<span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
													{serverStatus[server.name].lastUpdated}
												</span>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
