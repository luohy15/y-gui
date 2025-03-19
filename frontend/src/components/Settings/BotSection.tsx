import React, { useState, useRef, useEffect } from 'react';
import { BotConfig, McpServerConfig } from '../../../../shared/types';
import { BotFormModal } from './Bot';
import { ConfirmationDialog } from './Confirm';
import { ActionMenu } from './Action';
import { useAuthenticatedSWR, useApi } from '../../utils/api';

interface BotSectionProps {
  isDarkMode: boolean;
  setStatusMessage: (message: {type: 'success' | 'error', text: string} | null) => void;
}

export const BotSection: React.FC<BotSectionProps> = ({
  isDarkMode,
  setStatusMessage
}) => {
  // Bot form modal state
  const [isBotFormOpen, setIsBotFormOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<BotConfig | undefined>(undefined);

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<string | null>(null);

  // Action menu state
  const [actionMenuBot, setActionMenuBot] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // API functions
  const api = useApi();

  // Fetch configurations using authenticated SWR
  const { data: bots, error: botsError, isLoading: botsLoading, mutate: mutateBots } =
    useAuthenticatedSWR<BotConfig[]>('/api/bots');
  const { data: mcpServers, error: mcpError, isLoading: mcpLoading } =
    useAuthenticatedSWR<McpServerConfig[]>('/api/mcp-servers');

  // Close action menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Close action menu when clicking outside
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActionMenuBot(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionMenuRef]);

  // Handle bot form submission
  const handleBotSubmit = async (bot: BotConfig) => {
    try {
      if (selectedBot) {
        // Update existing bot
        await api.put(`/api/bot/${selectedBot.name}`, bot);
        setStatusMessage({ type: 'success', text: `Bot "${bot.name}" updated successfully` });
      } else {
        // Add new bot
        await api.post('/api/bot', bot);
        setStatusMessage({ type: 'success', text: `Bot "${bot.name}" added successfully` });
      }

      // Close the form and refresh the bot list
      setIsBotFormOpen(false);
      setSelectedBot(undefined);
      mutateBots();
    } catch (error) {
      console.error('Error saving bot:', error);
      setStatusMessage({ type: 'error', text: `Failed to save bot: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  // Handle bot deletion
  const handleDeleteBot = async () => {
    if (!botToDelete) return;

    try {
      await api.delete(`/api/bot/${botToDelete}`);
      setStatusMessage({ type: 'success', text: `Bot deleted successfully` });
      mutateBots();
    } catch (error) {
      console.error('Error deleting bot:', error);
      setStatusMessage({ type: 'error', text: `Failed to delete bot: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }

    setBotToDelete(null);
    setIsConfirmDialogOpen(false);
  };

  // Open edit form for a bot
  const handleEditBot = (bot: BotConfig) => {
    setSelectedBot(bot);
    setIsBotFormOpen(true);
  };

  // Open delete confirmation for a bot
  const handleDeleteConfirm = (botName: string) => {
    setBotToDelete(botName);
    setIsConfirmDialogOpen(true);
  };

  return (
    <div className="mb-12">
      {/* Bot form modal */}
      <BotFormModal
        isOpen={isBotFormOpen}
        onClose={() => {
          setIsBotFormOpen(false);
          setSelectedBot(undefined);
        }}
        onSubmit={handleBotSubmit}
        initialBot={selectedBot}
        mcpServers={mcpServers}
        isDarkMode={isDarkMode}
      />

      {/* Confirmation dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={handleDeleteBot}
        title="Delete Bot"
        message={`Are you sure you want to delete this bot? This action cannot be undone.`}
        isDarkMode={isDarkMode}
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl md:text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} md:hidden`}>Bots</h2>
        <h2 className={`hidden md:block text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Bots</h2>
        <button
          onClick={() => {
            setSelectedBot(undefined);
            setIsBotFormOpen(true);
          }}
          className={`px-3 py-1.5 md:px-4 md:py-2 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md text-sm md:text-base`}
        >
          Add Bot
        </button>
      </div>

      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-6 text-sm md:text-base`}>Manage your bot configurations</p>

      <div className={`${isDarkMode ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden`}>
        {botsLoading ? (
          <div className="p-4 text-center">
            <div className={`animate-pulse ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading bot configurations...</div>
          </div>
        ) : botsError ? (
          <div className="p-4 text-center">
            <div className="text-red-500">Error loading bot configurations</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-blue-500 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : bots && bots.length > 0 ? (
          bots.map((bot, index) => (
          <div key={bot.name} className={`${index !== bots.length - 1 ? isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200' : ''} p-4`}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{bot.name}</h3>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <span>{bot.model} {bot.mcp_servers && bot.mcp_servers.length > 0 && `• MCPs: ${bot.mcp_servers.join(', ')}`}</span>
                </div>
              </div>
              <div className="relative" ref={actionMenuBot === bot.name ? actionMenuRef : undefined}>
                <button
                  onClick={() => setActionMenuBot(actionMenuBot === bot.name ? null : bot.name)}
                  className={`p-2 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                </button>

                {actionMenuBot === bot.name && (
                  <ActionMenu
                    isOpen={true}
                    onClose={() => setActionMenuBot(null)}
                    onEdit={() => handleEditBot(bot)}
                    onDelete={() => handleDeleteConfirm(bot.name)}
                    isDarkMode={isDarkMode}
                  />
                )}
              </div>
            </div>
          </div>
          ))
        ) : (
          <div className="p-4 text-center">
            <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No bot configurations found</div>
          </div>
        )}
      </div>
    </div>
  );
};
