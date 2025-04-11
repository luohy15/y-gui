import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useBot } from '../../contexts/BotContext';
import { useAuthenticatedSWR } from '../../utils/api';
import { Chat, Message, McpServerConfig } from '@shared/types';
import { mutate } from 'swr';
import { useAuth0 } from '@auth0/auth0-react';
import { useMcp } from '../../contexts/McpContext';
import { useMcpStatus } from '../../hooks/useMcpStatus';
import MessageInput from '../MessageInput';
import MessageActions from './MessageActions';
import MessageItem from './MessageItem';
import McpLogsDisplay from './McpLogsDisplay';

export default function ChatView() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getIdTokenClaims } = useAuth0();
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
  const swrConfig = {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 0,
    dedupingInterval: 2000,
  };

  // Fetch chat and MCP servers data
  const { data: chat, error } = useAuthenticatedSWR<Chat>(
    id ? `/api/chats/${id}` : null,
    swrConfig
  );
  const { data: mcpServers } = useAuthenticatedSWR<McpServerConfig[]>('/api/mcp-servers', swrConfig);

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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages]);

  // Render loading state while chat is being fetched
  if (!chat) {
    return (
      <div className={`flex items-center justify-center h-screen ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
        <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Loading...</div>
      </div>
    );
  }

  // Main component render
  return (
    <div className={`flex flex-col relative ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
      {/* MCP Status Logs */}
      <McpLogsDisplay
        logs={mcpLogs}
        isVisible={isLogVisible}
        onClose={closeLog}
        isDarkMode={isDarkMode}
      />

      {/* Messages */}
      <div className={`w-[60%] mx-auto flex-1 px-2 sm:px-4 py-4 space-y-6 sm:space-y-8 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'} overflow-x-hidden overflow-y-auto`}>
                {chat.messages
								.filter((msg: Message) => msg.role === 'assistant' || !msg.server)
								.map((msg: Message, index: number) => (
          <MessageItem
            key={`${msg.unix_timestamp}-${index}`}
            message={msg}
            isLastMessage={index === chat.messages.length - 1}
            isDarkMode={isDarkMode}
            onToolConfirm={(server, tool, args) => {
              if (!id) return;
              executeToolConfirm(server, tool, args);
            }}
            onToolDeny={handleToolDeny}
            needsConfirmation={needsConfirmation}
            expandedToolInfo={expandedToolInfo}
            expandedToolResults={expandedToolResults}
            onToggleToolInfo={toggleToolInfo}
            onToggleToolResult={toggleToolResult}
            isStreaming={isStreaming}
            toolResults={toolResults}
          />
        ))}

        {/* Message Actions */}
        {chat.messages.length > 0 && (
          <div className="ml-14">
            <MessageActions
              chatId={id!}
              messageContent={
                typeof chat.messages[chat.messages.length - 1].content === 'string'
                  ? chat.messages[chat.messages.length - 1].content
                  : JSON.stringify(chat.messages[chat.messages.length - 1].content)
              }
            />
          </div>
        )}

        <div className="pb-12" />
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex flex-col">
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
    </div>
  );
}
