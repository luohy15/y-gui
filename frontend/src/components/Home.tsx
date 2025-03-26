import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Chat, ListChatsResult, BotConfig, McpServerConfig } from '@shared/types';
import { useAuthenticatedSWR, useApi } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth0 } from '@auth0/auth0-react';
import AssistantAvatar from './AssistantAvatar';
import MessageInput from './MessageInput';

interface HomeProps {
}


export default function Home({ }: HomeProps) {
  const { user } = useAuth0();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const limit = 5;

  // New chat creation states
  const [newMessage, setNewMessage] = React.useState('');
  const [selectedBot, setSelectedBot] = React.useState('');
  const [isCreatingChat, setIsCreatingChat] = React.useState(false);
  const [isNavigatingToNewChat, setIsNavigatingToNewChat] = React.useState(false);
  const [isProcessingMessage, setIsProcessingMessage] = React.useState(false);
  const [currentMcpServers, setCurrentMcpServers] = React.useState<McpServerConfig[]>([]);

  const [currentPage, setCurrentPage] = React.useState(1);


  // Get the API utility for authenticated requests
  const api = useApi();

  // Fetch bot configurations
  const { data: botsData } = useAuthenticatedSWR<BotConfig[]>('/api/bots');
  const bots = botsData || [];

  // Fetch MCP server configurations
  const { data: mcpServersData } = useAuthenticatedSWR<McpServerConfig[]>('/api/mcp-servers');
  const mcpServers = mcpServersData || [];

  // Handle creating a new chat with a message
  const handleNewChatWithMessage = async (content: string, botName: string) => {
    if (!content.trim() || !botName) return;

    setIsCreatingChat(true);

    try {
      // First, create a new chat ID using the authenticated API
      const { id } = await api.get('/api/chat/id');

      // Navigate to the new chat page
      navigate(`/chat/${id}`);

      // Store the message and bot in localStorage so ChatView can use it
      localStorage.setItem(`newChat_${id}_message`, content);
      localStorage.setItem(`newChat_${id}_bot`, botName);

      // The ChatView component will detect this and handle the streaming
    } catch (error) {
      console.error('Error creating chat with message:', error);
    } finally {
      setIsCreatingChat(false);
      setIsProcessingMessage(false);
      setNewMessage('');
    }
  };

  // Update current MCP servers when selected bot changes
  React.useEffect(() => {
    if (selectedBot && bots.length > 0 && mcpServers.length > 0) {
      // Find the selected bot
      const bot = bots.find(b => b.name === selectedBot);

      if (bot && bot.mcp_servers && bot.mcp_servers.length > 0) {
        // Filter MCP servers that are associated with the selected bot
        const botMcpServers = mcpServers.filter(server =>
          bot.mcp_servers?.includes(server.name)
        );
        setCurrentMcpServers(botMcpServers);
      } else {
        setCurrentMcpServers([]);
      }
    } else {
      setCurrentMcpServers([]);
    }
  }, [selectedBot, bots, mcpServers]);

  return (
    <div className={`max-w-full flex flex-col h-full ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
      <main className="max-w-full mx-4 sm:mx-6 lg:mx-8 flex flex-col h-full justify-center">
        {/* Greeting */}
        <div className={`w-full max-w-3xl mx-auto mb-6 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          <h1 className="text-4xl mb-2">Welcome, {user?.name || 'there'}.</h1>
          <p className="text-2xl text-gray-500">How can I help you today?</p>
        </div>
        {/* New Chat Input */}
        <div className={`w-full max-w-3xl mx-auto ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          <div className="py-4">
            <MessageInput
              message={newMessage}
              setMessage={setNewMessage}
              selectedBot={selectedBot}
              setSelectedBot={setSelectedBot}
              isLoading={isCreatingChat || isProcessingMessage}
              handleSubmit={async () => Promise.resolve()} // Not used since we're using onSendMessage
              onSendMessage={handleNewChatWithMessage}
              isFixed={false} // Don't fix this input to the bottom of the screen
            />
          </div>
        </div>

        {/* MCP Servers Information - Compact Version */}
        {selectedBot && (
          <div className={`w-full max-w-3xl mx-auto mt-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <div className={`rounded-lg p-3 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center text-sm mb-2">
                <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>MCP Servers:</span>
                <span className={`ml-1 font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{selectedBot}</span>
              </div>

              {currentMcpServers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {currentMcpServers.map((server) => (
                    <div key={server.name} className={`rounded-md p-2 text-xs ${isDarkMode ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
                      <div className="flex flex-col">
                        <span className={`font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {server.name}
                        </span>
                        <div className={`text-xs mt-1 truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {server.command ? (
                            <span className="flex items-center">
                              <code className={`px-1 py-0.5 rounded text-xs truncate ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                {server.command} {server.args?.join(' ')}
                              </code>
                            </span>
                          ) : server.url ? (
                            <span className="flex items-center">
                              <code className={`px-1 py-0.5 rounded text-xs truncate ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                {server.url}
                              </code>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No MCP servers configured
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
