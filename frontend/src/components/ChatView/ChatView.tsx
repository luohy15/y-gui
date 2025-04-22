import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useBot } from '../../contexts/BotContext';
import { useToc } from '../../contexts/TocContext';
import { useMcp } from '../../contexts/McpContext';
import { useAuthenticatedSWR } from '../../utils/api';
import { Chat, Message, McpServerConfig } from '@shared/types';
import { mutate } from 'swr';
import useSWR, { SWRConfiguration } from 'swr';
import { useAuth0 } from '@auth0/auth0-react';
import { useMcpStatus } from '../../hooks/useMcpStatus';
import MessageInput from '../MessageInput';
import MessageActions from './MessageActions';
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
  const { isTocOpen, setIsTocOpen, currentMessageId, setCurrentMessageId } = useToc();
  const messageRefs = useRef<Record<string, HTMLDivElement>>({});

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

  // Tool execution state
  const [toolInfoState, setToolInfoState] = useState<{
    plain_content: string | undefined;
    server: string | undefined;
    tool: string | undefined;
    arguments: any | undefined;
    messageId: string | undefined;
  }>({
    plain_content: undefined,
    server: undefined,
    tool: undefined,
    arguments: undefined,
    messageId: undefined
  });

  const [toolResultState, setToolResultState] = useState<{
    content: string | undefined;
    server: string | undefined;
    targetMessageId: string | undefined;
  }>({
    content: undefined,
    server: undefined,
    targetMessageId: undefined
  });

  // Store tool results mapped to the assistant message IDs
  const [toolResults, setToolResults] = useState<Record<string, string | object>>({});

  const [expandedToolInfo, setExpandedToolInfo] = useState<Record<string, boolean>>({});
  const [expandedToolResults, setExpandedToolResults] = useState<Record<string, boolean>>({});

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
    ? useAuthenticatedSWR<McpServerConfig[]>('/api/mcp-servers', swrConfig)
    : { data: undefined };

  // Debug selectedBot changes
  useEffect(() => {
    console.log('selectedBot changed:', selectedBot);
  }, [selectedBot]);

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

    if (!server.need_confirm || server.need_confirm.length === 0) {
      return false;
    }

    return server.need_confirm.includes(toolName);
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

    setToolInfoState({
      plain_content: plainContent,
      server: server,
      tool: tool,
      arguments: args,
      messageId
    });
  };

  // Handle tool result
  const handleToolResult = async (content: string, server: string) => {
    // Find the target message ID from the last tool info state
    const targetMessageId = toolInfoState.messageId;
    setToolResultState({ content, server, targetMessageId });

    // If we have a target message ID, associate this result with it
    if (targetMessageId) {
      setToolResults(prev => ({
        ...prev,
        [targetMessageId]: content
      }));
    }
  };

  // Process tool info when streaming ends
  useEffect(() => {
    const executePendingTool = async () => {
      // When streaming ends and we have pending tool info
      if (!isStreaming &&
          toolInfoState.server &&
          toolInfoState.tool &&
          toolInfoState.arguments) {

        const { server, tool, arguments: args } = toolInfoState;

        // Check if this tool needs confirmation
        if (!needsConfirmation(server, tool)) {
          console.log(`Auto-executing tool: ${tool} on server: ${server}`);

          // Execute the tool
          await executeToolConfirm(server, tool, args);

          // Clear the tool info state
          setToolInfoState({
            plain_content: undefined,
            server: undefined,
            tool: undefined,
            arguments: undefined,
            messageId: undefined
          });
        }
      }
    };

    executePendingTool();
  }, [isStreaming, toolInfoState, needsConfirmation]);

  // Process tool result when streaming ends
  useEffect(() => {
    const processPendingToolResult = async () => {
      // When streaming ends and we have pending tool result
      if (!isStreaming &&
          toolResultState.content &&
          toolResultState.server) {

        const { content, server } = toolResultState;

        // Send the message immediately
        console.log(`Sending tool result: ${content}`);
        await sendUserMessage(content, { server });

        // Clear the tool result state
        setToolResultState({
          content: undefined,
          server: undefined,
          targetMessageId: undefined
        });
      }
    };

    processPendingToolResult();
  }, [isStreaming, toolResultState]);

  // Toggle tool information expand state
  const toggleToolInfo = (messageId: string) => {
    setExpandedToolInfo(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  // Toggle tool result expand state
  const toggleToolResult = (messageId: string) => {
    setExpandedToolResults(prev => ({
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
                  // Signal that real content is coming in
                  handleMcpStatus(
                    "info",
                    "system",
                    "Receiving message content",
                    true
                  );
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
                  await handleToolResult(parsedData.content || '', parsedData.server || '');
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }

          buffer = lines[lines.length - 1];
        }
      } else {
        const updatedChat = await response.json();
        mutate(`/api/chats/${id}`, updatedChat, false);
      }
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

  // Execute a confirmed tool
  const executeToolConfirm = async (server: string, tool: string, args: any) => {
    if (!selectedBot) return;

    await streamResponse(
      '/api/tool/confirm',
      JSON.stringify({
        botName: selectedBot,
        server,
        tool,
        args
      })
    );
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
        messages={chat?.messages || []}
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
            messages={chat.messages}
            isDarkMode={isDarkMode}
            onScrollToMessage={scrollToMessage}
            currentMessageId={currentMessageId}
          />
        </div>

        {/* Messages (centered) */}
        <div className={`flex flex-col px-4 sm:px-0 pt-20 pb-28 sm:pt-4 w-full sm:w-[50%] 2xl:w-[40%] max-w-[100%] space-y-4`}>
          {chat.messages
          .filter((msg: Message) => msg.role === 'assistant' || (!msg.server && !msg.tool))
          .map((msg: Message, index: number) => (
            <div
              key={`${msg.unix_timestamp}-${index}`}
              ref={el => {
                if (el && msg.role === 'user') {
                  messageRefs.current[msg.unix_timestamp.toString()] = el;
                }
              }}
            >
              <MessageItem
                message={msg}
                isLastMessage={index === chat.messages.length - 1}
                isDarkMode={isDarkMode}
                onToolConfirm={isSharedMode
                  ? handleToolConfirmShared
                  : (server, tool, args) => {
                      if (!id) return;
                      executeToolConfirm(server, tool, args);
                    }
                }
                onToolDeny={isSharedMode ? handleToolDenyShared : handleToolDeny}
                needsConfirmation={isSharedMode ? checkNeedsConfirmationShared : needsConfirmation}
                expandedToolInfo={expandedToolInfo}
                expandedToolResults={expandedToolResults}
                onToggleToolInfo={toggleToolInfo}
                onToggleToolResult={toggleToolResult}
                isStreaming={isSharedMode ? false : isStreaming}
                toolResults={toolResults}
              />
            </div>
          ))}

          {/* Message Actions - Only in regular mode */}
          {!isSharedMode && chat.messages.length > 0 && (
						<MessageActions
							chatId={id!}
							messageContent={
								typeof chat.messages[chat.messages.length - 1].content === 'string'
									? chat.messages[chat.messages.length - 1].content
									: JSON.stringify(chat.messages[chat.messages.length - 1].content)
							}
						/>
          )}

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
