import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chat, Message } from '@shared/types';
import MessageInput from './MessageInput';
import useSWR, { SWRConfiguration, mutate } from 'swr';
import { useTheme } from '../contexts/ThemeContext';
import AssistantAvatar from './AssistantAvatar';
import CompactMarkdown from './Markdown';
import { useApi, useAuthenticatedSWR } from '../utils/api';
import { useAuth0 } from '@auth0/auth0-react';

export default function ChatView() {
	const { isDarkMode } = useTheme();
	const navigate = useNavigate();
	const { id } = useParams<{ id: string }>();
	// Configure SWR options for proper revalidation
	const swrConfig: SWRConfiguration = {
		revalidateOnFocus: true,
		revalidateOnReconnect: true,
		refreshInterval: 0, // Disable auto refresh
		dedupingInterval: 2000, // Dedupe requests within 2 seconds
	};

	// State for message input
	const [message, setMessage] = useState('');
	const [selectedBot, setSelectedBot] = useState<string>('');
	const [isLoading, setIsLoading] = useState(false);
	const [isStreaming, setIsStreaming] = useState(false);

	// StreamBuffer for character-by-character printing
	const [printSpeed, setPrintSpeed] = useState<number>(1000); // Default speed: 100 chars per second
	const streamBufferRef = React.useRef<{
		buffer: string;
		maxCharsPerSecond: number;
		lastUpdateTime: number;
		lastPosition: number;

		addContent: (content: string) => void;
		getNextChunk: () => string;
		hasMoreContent: () => boolean;
	}>({
		buffer: "",
		maxCharsPerSecond: 50,
		lastUpdateTime: Date.now(),
		lastPosition: 0,

		addContent(content: string) {
			this.buffer += content;
		},

		getNextChunk() {
			const currentTime = Date.now();
			const timeDiff = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
			const maxChars = Math.floor(this.maxCharsPerSecond * timeDiff);

			if (maxChars > 0) {
				const chunk = this.buffer.substring(this.lastPosition, this.lastPosition + maxChars);
				this.lastPosition += chunk.length;
				this.lastUpdateTime = currentTime;
				return chunk;
			}
			return "";
		},

		hasMoreContent() {
			return this.lastPosition < this.buffer.length;
		}
	});

	const { data: chat, error } = useAuthenticatedSWR<Chat>(
		id ? `/api/chats/${id}` : null,
		swrConfig
	);
	const messagesEndRef = React.useRef<HTMLDivElement>(null);
	const [collapsedReasoning, setCollapsedReasoning] = React.useState<{ [key: string]: boolean }>({});
	const [collapsedToolInfo, setCollapsedToolInfo] = React.useState<{ [key: string]: boolean }>({});
	const [collapsedToolResults, setCollapsedToolResult] = React.useState<{ [key: string]: boolean }>({});

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

	useEffect(() => {
		if (error?.status === 404) {
			navigate('/');
		}
	}, [error, navigate]);

	// Scroll to bottom when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [chat?.messages]);

	// StreamBuffer effect with small delay when no content
	useEffect(() => {
		if (!id) return;

		// Update the streamBuffer's max chars per second when printSpeed changes
		streamBufferRef.current.maxCharsPerSecond = printSpeed;

		let isRunning = true;
		let collectionTaskDone = false;

		const updateDisplay = async () => {
			while (isRunning) {
				if (collectionTaskDone) {
					break;
				}

				const chunk = streamBufferRef.current.getNextChunk();
				if (chunk) {
					await updateLastMessageChunk(chunk);
				} else {
					// Small delay only when no content to display
					await new Promise(resolve => setTimeout(resolve, 50)); // 0.05 seconds
				}

				// Check if we've processed all content and streaming is complete
				if (!streamBufferRef.current.hasMoreContent() && !isStreaming) {
					collectionTaskDone = true;
				}
			}
		};

		// Start the update loop
		updateDisplay();

		return () => {
			isRunning = false; // Stop the loop when component unmounts
		};
	}, [id, printSpeed, isStreaming]);

	// Check for new chat data in localStorage or handle existing chat with no assistant response
	useEffect(() => {
		if (!chat || !id || isLoading || isStreaming) return;

		// Only proceed if we're not already loading or streaming
		(async () => {
			// Check if this is a new chat from Home component
			const storedMessage = localStorage.getItem(`newChat_${id}_message`);
			const storedBot = localStorage.getItem(`newChat_${id}_bot`);

			if (storedMessage && storedBot && chat.messages.length === 0) {
				// Set the selected bot
				setSelectedBot(storedBot);

				// Add user message to chat
				await addMessageToChat(storedMessage, 'user');

				// Add empty assistant message to start streaming into
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
	}, [chat, id, isLoading, isStreaming]);

	// Get the API utility for authenticated requests
	const { getIdTokenClaims } = useAuth0();

	// Function to stream response from API
	const streamResponse = async (url: string, body: string) => {
		if (!id) return;

		setIsStreaming(true);

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
				body: body
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

								// Handle the new SSE data format
								if (parsedData.choices && parsedData.choices[0]?.delta?.content) {
									// Add content to the stream buffer
									streamBufferRef.current.addContent(parsedData.choices[0].delta.content);
								}

								// Set model and provider info if not already set
								const model = parsedData.model;
								const provider = parsedData.provider;
								await updateLastMessage('', undefined, {model, provider});

								// Assistant message set tool info
								if (parsedData.tool) {
									await updateLastMessage(parsedData.plainContent, undefined, {tool: parsedData.tool, server: parsedData.server, arguments: parsedData.arguments});
								}

								// Check if user message appear
								if (parsedData.role && parsedData.role === 'user') {
									await handleUserMessage(parsedData.content, parsedData);
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

	const handleUserMessage = async (messageContent: string,
		additionalProps: Partial<Message> = {}
	) => {
		setIsLoading(true);

		try {
			// Add user message to chat immediately
			await addMessageToChat(messageContent, 'user', additionalProps);
			// Add assistant message to chat immediately
			await addMessageToChat('', 'assistant');

			await streamResponse(`/api/chat/completions`, JSON.stringify({
				content: messageContent,
				botName: selectedBot,
				chatId: id,
				tool: additionalProps ? additionalProps.tool : undefined
			}));
		} catch (error) {
			console.error('Error sending message:', error);
			// Handle error (could show a toast notification)
		} finally {
			setIsLoading(false);
		}
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
		if (!id) return;

		await addMessageToChat('Tool calling ...', 'user', { server, tool, arguments: tool_args });

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
		<div className={`flex flex-col ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
			<div className={`flex-1 px-2 sm:px-4 py-4 space-y-6 sm:space-y-8 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'} overflow-x-hidden overflow-y-auto`}>
				{chat.messages.map((msg, index) => (
					<div
						key={`${msg.unix_timestamp}-${index}`}
						className={`flex items-start space-x-4 ${msg.role === 'user' && !msg.tool ? 'flex-row-reverse space-x-reverse' : ''}`}
					>
						<div className="flex-shrink-0">
							{msg.role === 'user' && !msg.tool ? (
								<div className={`h-10 w-10 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} flex items-center justify-center`}>
									<span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-medium`}>U</span>
								</div>
							) : (
								<AssistantAvatar model={msg.model} />
							)}
						</div>
						<div className={`max-w-full flex-1 space-y-2 ${msg.role === 'user' && !msg.tool ? 'items-end' : 'items-start'}`}>
							<div className={`rounded-lg px-4 py-3 sm:px-6 sm:py-4 break-words whitespace-pre-wrap max-w-[85%] ${msg.role === 'user' && !msg.tool
									? 'bg-[#4285f4] text-white ml-auto'
									: isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-700'
								}`}>
								{/* assistant info */}
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
									<div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
										<span className="text-sm font-medium">{msg.role === 'user' && !msg.tool ? 'You' : 'Assistant'}</span>
										<span className="text-xs opacity-75">
											{new Date(msg.timestamp).toLocaleString()}
										</span>
										<div className="flex flex-wrap items-center gap-1">
											{msg.model && (
												<span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${msg.role === 'user' && !msg.tool
														? 'bg-blue-400 text-white'
														: isDarkMode ? 'bg-purple-900 text-purple-100' : 'bg-purple-100 text-purple-800'
													}`}>
													{msg.model}
												</span>
											)}
											{msg.provider && (
												<span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${msg.role === 'user' && !msg.tool
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
									<div className={`mb-3 text-sm ${msg.role === 'user' && !msg.tool
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
								{/* content */}
								{msg.role === 'user' && msg.tool ? (
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
									className={msg.role === 'user' && !msg.tool ? 'prose-invert' : 'prose-gray'}
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
												{/* Only show approval buttons for the last assistant message */}
												{index === chat.messages.length - 1 && msg.role === 'assistant' && (
													<div className="flex space-x-3">
														<button
															onClick={() => handleToolConfirmation(msg.server, msg.tool, msg.arguments)}
															className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
														>
															Approve
														</button>
														<button
															onClick={() => handleUserMessage("cancel")}
															className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
																isDarkMode
																	? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
																	: 'bg-gray-200 hover:bg-gray-300 text-gray-700'
															}`}
														>
															Deny
														</button>
													</div>
												)}
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					</div>
				))}
				<div ref={messagesEndRef} />
				<div className="pb-12"></div>
			</div>
			<MessageInput
				message={message}
				setMessage={setMessage}
				selectedBot={selectedBot}
				setSelectedBot={setSelectedBot}
				isLoading={isLoading}
				handleSubmit={handleSubmit}
				isFixed={true} // Keep this input fixed at the bottom of the screen
			/>
		</div>
	);
}
