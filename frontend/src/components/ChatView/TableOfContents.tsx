import React, { useEffect, useState } from 'react';
import { Message } from '@shared/types';
import { formatDateTime } from '../../utils/formatters';

interface TableOfContentsProps {
  messages: Message[];
  isDarkMode: boolean;
  onScrollToMessage: (id: string) => void;
  currentMessageId?: string;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({
  messages,
  isDarkMode,
  onScrollToMessage,
  currentMessageId
}) => {
  // Group messages into conversation rounds (user + assistant pairs)
  const [conversationRounds, setConversationRounds] = useState<{
    id: string;
    userMessage: Message;
    assistantMessage?: Message;
    roundNumber: number;
  }[]>([]);

  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const rounds: {
      id: string;
      userMessage: Message;
      assistantMessage?: Message;
      roundNumber: number;
    }[] = [];

    let roundNumber = 1;

    // Group messages into user-assistant pairs
    for (let i = 0; i < messages.length; i++) {
      const currentMessage = messages[i];

      // Skip tool-related messages
      if (currentMessage.server || currentMessage.tool) continue;

      if (currentMessage.role === 'user') {
        const nextMessage = i + 1 < messages.length ? messages[i + 1] : undefined;
        const assistantMessage = nextMessage && nextMessage.role === 'assistant' ? nextMessage : undefined;

        rounds.push({
          id: currentMessage.unix_timestamp.toString(),
          userMessage: currentMessage,
          assistantMessage,
          roundNumber
        });

        roundNumber++;
      }
    }

    setConversationRounds(rounds);
  }, [messages]);

  // Get a preview of the message content
  const getMessagePreview = (message: Message): string => {
    if (!message.content) return '';

    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);

    // Remove markdown formatting and limit length
    const plainText = content
      .replace(/#{1,6}\s/g, '') // Remove headings
      .replace(/\*\*/g, '')     // Remove bold
      .replace(/\*/g, '')       // Remove italic
      .replace(/`{1,3}/g, '')   // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with just the text
      .trim();

    // Increase preview length for better readability
    return plainText.length > 40 ? plainText.substring(0, 40) + '...' : plainText;
  };


  return (
    <div
      className={`w-full sm:w-[80%] h-full overflow-x-hidden overflow-y-auto ${isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'} sm:rounded-lg`}
      onScroll={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="p-4 space-y-1.5">
        {conversationRounds.map((round) => (
          <div key={round.id} className="mb-1 last:mb-0">
            {/* User message */}
            <button
              onClick={() => onScrollToMessage(round.id)}
              className={`w-full p-3 pl-4 rounded-lg cursor-pointer transition-all duration-200 ${
                currentMessageId === round.id
                  ? (isDarkMode ? 'bg-gray-800 text-white shadow-sm' : 'bg-[#4285f4] text-white shadow-sm')
                  : (isDarkMode
                      ? 'hover:bg-gray-800/70 text-gray-100 border border-transparent hover:border-gray-700'
                      : 'hover:bg-gray-200/80 text-gray-700 border border-transparent hover:border-gray-200')
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="text-sm font-medium line-clamp-1 text-left max-w-[70%] pr-1 pl-0">{getMessagePreview(round.userMessage)}</div>
                <div className={`text-xs whitespace-nowrap text-right ${
                  currentMessageId === round.id
                    ? 'text-white/80'
                    : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
                }`}>
                  {round.userMessage.unix_timestamp === 0 ? '' : formatDateTime(round.userMessage.unix_timestamp)}
                </div>
              </div>
            </button>
          </div>
        ))}

        {conversationRounds.length === 0 && (
          <div className={`p-4 text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            No messages yet
          </div>
        )}
      </div>
    </div>
  );
};

export default TableOfContents;
