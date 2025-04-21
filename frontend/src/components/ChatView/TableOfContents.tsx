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

    return plainText.length > 20 ? plainText.substring(0, 20) + '...' : plainText;
  };


  return (
    <div
      className={`w-full sm:w-[80%] h-full overflow-x-hidden overflow-y-auto ${isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'} sm:rounded-lg`}
      onScroll={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="p-4">
        {conversationRounds.map((round) => (
          <div key={round.id}>
            {/* User message */}
            <div
              onClick={() => onScrollToMessage(round.id)}
              className={`p-2 rounded-lg cursor-pointer transition-colors ${
                currentMessageId === round.id
                  ? (isDarkMode ? 'bg-gray-800 text-white' : 'bg-[#4285f4] text-white')
                  : (isDarkMode ? 'hover:bg-gray-800 text-gray-100' : 'hover:bg-gray-50 text-gray-700')
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex-grow">{getMessagePreview(round.userMessage)}</div>
                <div className={`text-xs opacity-75 ${
									currentMessageId === round.id
										? 'text-white'
										: (isDarkMode ? 'text-gray-400' : 'text-gray-500')}`}>
                  {round.userMessage.unix_timestamp === 0 ? '' : formatDateTime(round.userMessage.unix_timestamp)}
                </div>
              </div>
            </div>
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
