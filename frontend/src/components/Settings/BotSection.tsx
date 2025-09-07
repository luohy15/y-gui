import React, { useState, useRef, useEffect } from 'react';
import { BotConfig } from '../../../../shared/types';
import { BotFormModal } from './BotForm';
import { ConfirmationDialog } from './Confirm';
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


  // API functions
  const api = useApi();

  // Fetch configurations using authenticated SWR
  const { data: bots, error: botsError, isLoading: botsLoading, mutate: mutateBots } =
    useAuthenticatedSWR<BotConfig[]>('/api/bots');

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
		console.log("handleEditBot", bot);
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
        <h2 className={`text-xl sm:text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} sm:hidden`}>Bots</h2>
        <h2 className={`hidden sm:block text-2xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Bots</h2>
        <button
          onClick={() => {
            setSelectedBot(undefined);
            setIsBotFormOpen(true);
          }}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-md text-sm sm:text-base`}
        >
          Add Bot
        </button>
      </div>

      <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-6 text-sm sm:text-base`}>Manage your bot configurations</p>

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
                  <span>{bot.model}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditBot(bot)}
                  className={`px-3 py-1.5 text-sm ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-md`}
                  title="Edit bot"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteConfirm(bot.name)}
                  className={`px-3 py-1.5 text-sm ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-md`}
                  title="Delete bot"
                >
                  Delete
                </button>
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
