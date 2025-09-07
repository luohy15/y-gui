import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useBot } from '../../contexts/BotContext';
import { useToc } from '../../contexts/TocContext';
import { useAuthenticatedSWR, useApi } from '../../utils/api';
import { Chat, Message, McpServer } from '@shared/types';
import { mutate } from 'swr';
import useSWR, { SWRConfiguration } from 'swr';
import { useAuth0 } from '@auth0/auth0-react';
import { useMcpStatus } from '../../hooks/useMcpStatus';
import MessageInput from '../MessageInput';
import MessageItem from './MessageItem';
import McpLogsDisplay from './McpLogsDisplay';
import TableOfContents from './TableOfContents';
import TableOfContentsDrawer from './TableOfContentsDrawer';

export default function ChatView() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getAccessTokenSilently } = useAuth0();
  const api = useApi();
  const { isTocOpen, setIsTocOpen, currentMessageId, setCurrentMessageId } = useToc();
  const messageRefs = useRef<Record<string, HTMLDivElement>>({});

  // Map to store child messageIds for each parent message
  const [messageIdsMap, setMessageIdsMap] = useState<Record<string, string[]>>({});

  // Determine if we're in shared mode based on URL path
  const isSharedMode = location.pathname.startsWith('/share/');

  // State for message input and bot selection
  const [message, setMessage] = useState('');
  const { selectedBot, setSelectedBot } = useBot();

  // Message streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // MCP logs state from hook
  const {
    mcpLogs,
    isLogVisible,
    handleMcpStatus,
    closeLog
  } = useMcpStatus();

  // Tool execution state - unified state for tool info and results
  const [toolState, setToolState] = useState<{
    plain_content: string | undefined;
    server: string | undefined;
    tool: string | undefined;
    arguments: any | undefined;
    messageId: string | undefined;
    result: string | undefined;
  }>({
    plain_content: undefined,
    server: undefined,
    tool: undefined,
    arguments: undefined,
    messageId: undefined,
    result: undefined
  });

  // Store tool results mapped to the assistant message IDs
  const [toolResults, setToolResults] = useState<Record<string, string | object>>({});

  const [expandedToolInfo, setExpandedToolInfo] = useState<Record<string, boolean>>({});

  // Tool execution loading state
  const [isToolExecuting, setIsToolExecuting] = useState(false);

  // executedTools state removed - isStreaming check prevents duplicates

  // isManuallyExecuting state removed - auto-execution now handled directly in handleToolInfo

  // Configure SWR options
  const swrConfig: SWRConfiguration = {
    revalidateOnFocus: false,
    revalidateOnReconnect: isSharedMode ? false : true,
    refreshInterval: 0,
    dedupingInterval: 2000,
  };

  // Non-authenticated fetcher for public access in shared mode
  const publicFetcher = async (url: string) => {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = new Error('An error occurred while fetching the data.');
      (error as any).status = response.status;
      throw error;
    }

    return response.json();
  };

  // Fetch chat data based on mode
  const { data: chat, error } = isSharedMode
    ? useSWR<Chat>(
        id ? `/api/share/${id}` : null,
        publicFetcher,
        swrConfig
      )
    : useAuthenticatedSWR<Chat>(
        id ? `/api/chats/${id}` : null,
        swrConfig
      );

  // Only fetch MCP servers in regular mode
  const { data: mcpServers } = !isSharedMode
    ? useAuthenticatedSWR<McpServer[]>('/api/mcp-servers', swrConfig)
    : { data: undefined };

  /****************************
   * Message Handling Functions
   ****************************/

  // Add a new message to the chat
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
          unix_timestamp: Date.now(),
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

  // Update the last message in the chat with new content chunks
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
  };

  /****************************
   * Selected Message Path Functions
   ****************************/

  // Build a path from root to leaf through the selected message
  const buildSelectedMessagePath = (chat: Chat): string[] => {
    if (!chat.selected_message_id) return [];

    const allMessages = chat.messages;
    const result: string[] = [chat.selected_message_id];

    // First, traverse UP to root (follow parent_id chain)
    let currentId = chat.selected_message_id;
    let currentMsg = allMessages.find(msg => msg.id === currentId);

    // Traverse up parent_id chain until we reach a message without a parent_id
    while (currentMsg && currentMsg.parent_id) {
      result.unshift(currentMsg.parent_id); // Add parent to beginning of array
      currentId = currentMsg.parent_id;
      currentMsg = allMessages.find(msg => msg.id === currentId);
    }

    return result;
  };

  // Use useMemo to compute the selected message path efficiently
  const selectedMessagePath = useMemo(() => {
    if (!chat?.selected_message_id || !chat) return null;
    return buildSelectedMessagePath(chat);
  }, [chat?.selected_message_id, chat]);

  // Use useMemo to filter messages for both chat display and TOC
  const filteredMessages = useMemo(() => {
    if (!chat?.messages) return [];

    return chat.messages.filter((msg: Message) => {
      // Original filter logic: show assistant messages and user messages without server/tool
      const passesOriginalFilter = msg.role === 'assistant' || (!msg.server && !msg.tool);

      // If we have a selected path, only show messages in that path
      if (selectedMessagePath && msg.id) {
        return passesOriginalFilter && selectedMessagePath.includes(msg.id);
      }

      // Otherwise use the original filter
      return passesOriginalFilter;
    });
  }, [chat?.messages, selectedMessagePath]);

  // Update the last message with new properties
  const updateLastMessage = async (
    content?: string,
    role?: 'user' | 'assistant',
    additionalProps: Partial<Message> = {}
  ) => {
    await mutate(
      `/api/chats/${id}`,
      (cachedChat: Chat | undefined) => {
        if (!cachedChat) return cachedChat;

        // Create a deep copy of the chat
        const updatedChat = JSON.parse(JSON.stringify(cachedChat));

        // Get the last message
        const lastMessage = updatedChat.messages[updatedChat.messages.length - 1];

        // Update content if provided
        if (content !== undefined) {
          lastMessage.content = content;
        }

        // Update role if provided
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

  /****************************
   * MCP Status Handling
   ****************************/

  // Using useMcpStatus hook for MCP status handling

  /****************************
   * Tool Execution Functions
   ****************************/

  // Check if a tool requires confirmation
  const needsConfirmation = (serverName: string, toolName: string): boolean => {
    if (!mcpServers) return true;

    const server = mcpServers.find(s => s.name === serverName);
    if (!server) return true;

    if (!server.allow_tools || server.allow_tools.length === 0) {
      return true;
    }

    return !server.allow_tools.includes(toolName);
  };

  // Handle tool information
  const handleToolInfo = async (
    plainContent: string,
    server: string,
    tool: string,
    args: any
  ) => {
    // Find the latest assistant message ID (this will be associated with tool results)
    let messageId: string | undefined = undefined;
    if (chat && chat.messages.length > 0) {
      const assistantMessages = chat.messages.filter(m => m.role === 'assistant');
      if (assistantMessages.length > 0) {
        const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
        messageId = lastAssistantMessage.unix_timestamp.toString();
      }
    }

    setToolState({
      plain_content: plainContent,
      server: server,
      tool: tool,
      arguments: args,
      messageId,
      result: undefined
    });
  };

  // Handle tool result
  const handleToolResult = async (content: string) => {
    // Update the tool state with result information
    setToolState(prev => ({
      ...prev,
      result: content
    }));

    // If we have a message ID, associate this result with it
    if (toolState.messageId) {
      setToolResults(prev => ({
        ...prev,
        [toolState.messageId!]: content
      }));
    }
  };

  // Process pending tool info when streaming ends (avoids race conditions)
  useEffect(() => {
    const executePendingTool = async () => {
      // When streaming ends and we have pending tool info
      if (!isStreaming &&
          toolState.server &&
          toolState.tool &&
          toolState.arguments &&
          !toolState.result) { // Only execute if we don't already have a result

        const { server, tool, arguments: args } = toolState;

        // Auto-execute if tool doesn't need confirmation
        if (!needsConfirmation(server, tool)) {
          console.log(`Auto-executing tool: ${tool} on server: ${server}`);

          // Execute the tool
          await executeToolConfirm(server, tool, args);

        }
      }
    };

    executePendingTool();
  }, [isStreaming, toolState, needsConfirmation]);

  // Process tool result when streaming ends - now integrated into main tool processing
  useEffect(() => {
    const processPendingToolResult = async () => {
      // When streaming ends and we have pending tool result
      if (!isStreaming &&
          toolState.result &&
          toolState.server) {

        const { result, server } = toolState;

        // Send the message immediately
        await sendUserMessage(result, { server });

        // Clear the tool state
				setToolState({
					plain_content: undefined,
					server: undefined,
					tool: undefined,
					arguments: undefined,
					messageId: undefined,
					result: undefined
				});
      }
    };

    processPendingToolResult();
  }, [isStreaming, toolState]);

  // This useEffect is no longer needed since we removed isManuallyExecuting state

  // Toggle tool information expand state
  const toggleToolInfo = (messageId: string) => {
    setExpandedToolInfo(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  /****************************
   * Stream Response Processing
   ****************************/

  // Cancel ongoing streaming response
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
		mutate(`/api/chats/${id}`);
    setIsStreaming(false);
  };

  // Stream response from the API
  const streamResponse = async (url: string, body: string) => {
    setIsStreaming(true);

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Get Auth0 token
      const accessToken = await getAccessTokenSilently();
      if (!accessToken) {
        throw new Error('Failed to get access token');
      }

      // Make the API request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: body,
        signal
      });

      if (!response.ok) {
        throw new Error(`Error sending message: ${response.statusText}`);
      }

      // Check if the response is a stream
      if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('Response body is not readable');
        }

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              if (data === '[DONE]') {
                reader.cancel();
                break;
              }

              try {
                const parsedData = JSON.parse(data);

                if (parsedData.error) {
                  const errorMessage = `**Error:** ${parsedData.error.message || 'Unknown error occurred'}`;
                  await updateLastMessage(errorMessage);
                  reader.cancel();
                  break;
                }

                // Handle MCP status messages
                if (parsedData.type === "mcp_status") {
                  handleMcpStatus(
                    parsedData.status || "info",
                    parsedData.server || "unknown",
                    parsedData.message || "",
                    false
                  );
                }
                // Handle content chunks
                else if (parsedData.choices?.[0]?.delta?.content) {
                  await updateLastMessageChunk(parsedData.choices[0].delta.content);
                }

                // Set model and provider info
                const model = parsedData.model;
                const provider = parsedData.provider;
                await updateLastMessage(undefined, undefined, { model, provider });

                // Handle tool info
                if (parsedData.server && !parsedData.type) {
                  await handleToolInfo(
                    parsedData.plainContent || '',
                    parsedData.server,
                    parsedData.tool || '',
                    parsedData.arguments
                  );
                  await updateLastMessage(parsedData.plainContent, 'assistant', {
                    server: parsedData.server,
                    tool: parsedData.tool,
                    arguments: parsedData.arguments
                  });
                }

                // Handle tool result
                if (parsedData.role === 'user') {
                  await handleToolResult(parsedData.content || '');
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }

          buffer = lines[lines.length - 1];
        }
      }
			mutate(`/api/chats/${id}`);
    } catch (error) {
      console.error('Error streaming response:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  /****************************
   * Main User Action Handlers
   ****************************/

  // Send a user message and get response
  const sendUserMessage = async (content: string, additionalProps: Partial<Message> = {}) => {
    if (!id || !selectedBot) return;

    // No need to clear executed tools - isStreaming check prevents duplicates

    await addMessageToChat(content, 'user', additionalProps);
    await addMessageToChat('', 'assistant');

    await streamResponse(
      '/api/chat/completions',
      JSON.stringify({
        content,
        botName: selectedBot,
        chatId: id,
        server: additionalProps?.server
      })
    );
  };

  const refreshResponse = async (messageId?: string) => {
    if (!id || !selectedBot || !chat || !messageId) return;

    // Find the user message with the given ID
    const assistantMessage = chat.messages.find(msg => msg.id === messageId && msg.role === 'assistant');
    if (!assistantMessage) return;

		// Get the user message ID from the assistant message
		const userMessageId = assistantMessage.parent_id;

    // Clear assistant message content
		assistantMessage.content = '';

    await streamResponse(
      '/api/chat/completions',
      JSON.stringify({
        userMessageId,
        botName: selectedBot,
        chatId: id
      })
    );
  };

	async function selectResponse(chatId: string, messageId: string) {
		try {
			return await api.post('/api/chat/select-response', { chatId, messageId });
		} catch (error) {
			console.error('Error selecting response:', error);
		}
	}

  // Execute a confirmed tool
  const executeToolConfirm = async (server: string, tool: string, args: any) => {
    if (!selectedBot) return;

    setIsToolExecuting(true);
    try {
      await streamResponse(
        '/api/tool/confirm',
        JSON.stringify({
          botName: selectedBot,
          server,
          tool,
          args
        })
      );
    } finally {
      setIsToolExecuting(false);
    }
  };

  // Handle allowing a tool always - add to allow_tools list and execute
  const handleAllowAlways = async (server: string, tool: string, args: any) => {
    if (!selectedBot || !mcpServers) return;

    try {
      // Find the server configuration
      const serverConfig = mcpServers.find(s => s.name === server);
      if (!serverConfig) {
        console.error(`Server ${server} not found in MCP servers`);
        return;
      }

      // Add the tool to allow_tools list if not already present
      const currentAllowTools = serverConfig.allow_tools || [];
      if (!currentAllowTools.includes(tool)) {
        const updatedAllowTools = [...currentAllowTools, tool];

        // Update the server configuration
        const updatedServer = {
          ...serverConfig,
          allow_tools: updatedAllowTools
        };

        // Call the update API
        await api.put(`/api/mcp-server/${server}`, updatedServer);

        // Refresh MCP servers list to reflect the change
        mutate('/api/mcp-servers');
      }

    } catch (error) {
      console.error('Error in handleAllowAlways:', error);
    }

    // Execute the tool
    await executeToolConfirm(server, tool, args);
  };

  // Handle form submission from message input
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedBot || !id) return;

    const messageCopy = message;
    setMessage('');

    await sendUserMessage(messageCopy);
  };

  // Handle tool denial
  const handleToolDeny = async () => {
    if (!id) return;

    await addMessageToChat('cancel', 'user');
    await addMessageToChat('', 'assistant');

    await streamResponse(
      '/api/chat/completions',
      JSON.stringify({
        content: 'cancel',
        botName: selectedBot,
        chatId: id
      })
    );
  };

  /****************************
   * Initialization and Effects
   ****************************/

  // Build messageIds map - mapping parent messages to their child message IDs
  useEffect(() => {
    if (!chat) return;

    const newMessageIdsMap: Record<string, string[]> = {};

    // Iterate through all messages that have an id and parent_id
    chat.messages.forEach((message) => {
      if (message.id && message.parent_id) {
        // If this parent ID doesn't have an entry yet, create one
        if (!newMessageIdsMap[message.parent_id]) {
          newMessageIdsMap[message.parent_id] = [];
        }

        // Add this message's ID to its parent's array
        newMessageIdsMap[message.parent_id].push(message.id);
      }
    });

    setMessageIdsMap(newMessageIdsMap);
  }, [chat]);

  // Initialize tool results when chat loads
  useEffect(() => {
    if (!chat) return;

    const newToolResults: Record<string, string | object> = {};
    const assistantMessages = chat.messages.filter(msg => msg.role === 'assistant' && msg.tool && msg.server);

    // For each assistant message with tool information
    assistantMessages.forEach(assistantMsg => {
      const assistantIndex = chat.messages.findIndex(msg =>
        msg.unix_timestamp === assistantMsg.unix_timestamp
      );

      // Look for the next user message that could be a tool result
      if (assistantIndex >= 0 && assistantIndex < chat.messages.length - 1) {
        // Check messages after this assistant message for a possible tool result
        for (let i = assistantIndex + 1; i < chat.messages.length; i++) {
          const msg = chat.messages[i];

          // If we find a user message with a server property, it's likely a tool result
          if (msg.role === 'user' && msg.server) {
            const assistantId = assistantMsg.unix_timestamp.toString();
            newToolResults[assistantId] = msg.content;
            break; // Found a result for this assistant message, move to the next one
          }

          // If we encounter another assistant message, stop looking
          if (msg.role === 'assistant' && i > assistantIndex + 1) {
            break;
          }
        }
      }
    });

    // Set the tool results
    setToolResults(newToolResults);
  }, [chat]);

  // Initialize new chat if data exists in localStorage
  useEffect(() => {
    const initializeNewChat = async () => {
      if (!chat || !id || isStreaming) return;

      // Check if this is a new chat from Home component
      const storedMessage = localStorage.getItem(`newChat_${id}_message`);
      const storedBot = localStorage.getItem(`newChat_${id}_bot`);

      if (storedMessage && storedBot && chat.messages.length === 0) {
        // Set the selected bot
        setSelectedBot(storedBot);

        // Save to the format MessageInput expects
        localStorage.setItem(`chat_${id}_selectedBot`, storedBot);

        // Send the stored message
        await sendUserMessage(storedMessage);

        // Clear localStorage
        localStorage.removeItem(`newChat_${id}_message`);
        localStorage.removeItem(`newChat_${id}_bot`);
      }
    };

    initializeNewChat();
  }, [chat, id, isStreaming, selectedBot]);

  // Check for 404 error and redirect to home
  useEffect(() => {
    if (error?.status === 404) {
      navigate('/');
    }
  }, [error, navigate]);

  // Scroll to a specific message by ID
  const scrollToMessage = useCallback((messageId: string) => {
    if (messageRefs.current[messageId]) {
      messageRefs.current[messageId].scrollIntoView({ behavior: 'smooth' });
      setCurrentMessageId(messageId);
    }
  }, [setCurrentMessageId]);

  // Track visible messages on scroll
  useEffect(() => {
    if (!chat) return;

    const handleScroll = () => {
      // Find which message is most visible in the viewport
      const messageElements = Object.entries(messageRefs.current);
      if (messageElements.length === 0) return;

      let bestVisibleMessage = null;
      let bestVisibleArea = 0;

      messageElements.forEach(([id, element]) => {
        const rect = element.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);

        if (visibleHeight > bestVisibleArea) {
          bestVisibleArea = visibleHeight;
          bestVisibleMessage = id;
        }
      });

      if (bestVisibleMessage && bestVisibleMessage !== currentMessageId) {
        setCurrentMessageId(bestVisibleMessage);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [chat, currentMessageId, setCurrentMessageId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages]);

  // Error handling for shared mode
  if (isSharedMode && error) {
    return (
      <div className={`flex items-center justify-center h-screen ${isDarkMode ? 'bg-[#1a1a1a] text-white' : 'bg-white text-gray-800'}`}>
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Chat Not Found</h2>
          <p>This shared chat may have been removed or the link is invalid.</p>
        </div>
      </div>
    );
  }

  // Render loading state while chat is being fetched
  if (!chat) {
    return (
      <div className={`flex items-center justify-center h-screen ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Loading...</div>
      </div>
    );
  }

  // Dummy functions for tool handling in shared mode
  const handleToolConfirmShared = () => {};
  const handleToolDenyShared = () => {};
  const checkNeedsConfirmationShared = () => false;

  // Main component render
  return (
    <div className={`flex flex-col relative ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
      {/* Table of Contents Drawer (Mobile) */}
      <TableOfContentsDrawer
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        messages={filteredMessages}
        isDarkMode={isDarkMode}
        onScrollToMessage={scrollToMessage}
        currentMessageId={currentMessageId}
      />

      {/* MCP Status Logs - Only in regular mode */}
      {!isSharedMode && (
				<div
					className="hidden sm:block sm:w-[20%] h-[calc(50vh)] fixed right-8 top-20 2xl:right-40"
				>
					<McpLogsDisplay
						logs={mcpLogs}
						isVisible={isLogVisible}
						onClose={closeLog}
						isDarkMode={isDarkMode}
					/>
				</div>
      )}

      {/* Main content with messages and TOC */}
      <div className="flex justify-center">

				{/* Table of Contents (Desktop) */}
        <div
					className="hidden sm:block sm:w-[20%] h-[calc(50vh)] fixed left-8 top-20 2xl:left-40"
				>
          <TableOfContents
            messages={filteredMessages}
            isDarkMode={isDarkMode}
            onScrollToMessage={scrollToMessage}
            currentMessageId={currentMessageId}
          />
        </div>

        {/* Messages (centered) */}
        <div className={`flex flex-col px-4 sm:px-0 pt-20 pb-28 sm:pt-4 w-full sm:w-[50%] 2xl:w-[40%] max-w-[100%] space-y-4`}>
          {filteredMessages
          .map((msg: Message, index: number) => (
            <div
              key={`${msg.unix_timestamp}-${index}`}
              ref={el => {
                if (el && msg.role === 'user') {
                  messageRefs.current[msg.unix_timestamp.toString()] = el;
                }
              }}
              className="scroll-mt-20 sm:scroll-mt-4" /* Add scroll margin for better spacing when scrolling to messages */
            >
              <MessageItem
                isDarkMode={isDarkMode}
                isStreaming={isSharedMode ? false : isStreaming}
                isSharedMode={isSharedMode}
                message={msg}
                messageIds={msg.parent_id ? messageIdsMap[msg.parent_id] || [] : []}
                chatId={id}
                onRefresh={() => refreshResponse(msg.id)}
                onSelectMessage={async (messageId: string) => {
                  if (!id || !messageId) return;
                  try {
                    const result = await selectResponse(id, messageId);
                    if (result) {
                      // Force refetch to update the selected_message_id in chat
                      mutate(`/api/chats/${id}`);
                    }
                  } catch (error) {
                    console.error('Error selecting message:', error);
                  }
                }}
                isLastMessage={index === chat.messages.length - 1}
                onToolConfirm={isSharedMode
                  ? handleToolConfirmShared
                  : (server, tool, args) => {
                      if (!id) return;
                      executeToolConfirm(server, tool, args);
                    }
                }
                onToolDeny={isSharedMode ? handleToolDenyShared : handleToolDeny}
                onAllowAlways={isSharedMode ? undefined : handleAllowAlways}
                needsConfirmation={isSharedMode ? checkNeedsConfirmationShared : needsConfirmation}
                expandedToolInfo={expandedToolInfo}
                onToggleToolInfo={toggleToolInfo}
                toolResults={toolResults}
                isToolExecuting={isToolExecuting}
              />
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

      </div>

      {/* Shared Mode Footer */}
      {isSharedMode && (
        <div className={`py-3 px-6 border-t ${isDarkMode ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          <div className="text-center">
            <p className="mb-4">This is a shared chat view. The content is read-only.</p>
            <Link
              to="/"
              className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-base font-medium transition-all duration-200 ${
                isDarkMode
                  ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-md'
                  : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md'
              }`}
            >
              Go to Yovy home page
            </Link>
          </div>
        </div>
      )}

      {/* Message Input - Only in regular mode */}
      {!isSharedMode && (
        <div className=''>
          <MessageInput
            message={message}
            setMessage={setMessage}
            selectedBot={selectedBot}
            setSelectedBot={setSelectedBot}
            isLoading={isStreaming}
            handleSubmit={handleSubmit}
            isFixed={true}
            onStop={handleStopGeneration}
          />
        </div>
      )}
    </div>
  );
}
