import React from 'react';
import { ContentBlock } from '@shared/types';
import RefreshNavigation from './RefreshNavigation';
import MessageCopyButton from './MessageCopyButton';
import ShareButton from './ShareButton';

interface MessageActionsProps {
	messageIds: string[];
  messageId: string;
  chatId?: string;
  messageContent: string | ContentBlock[];
  onRefresh: () => Promise<void>;
  onSelectMessage: (messageId: string) => Promise<void>;
}

export default function MessageActions({
  messageIds,
  messageId,
  chatId,
  messageContent,
  onRefresh,
  onSelectMessage,
}: MessageActionsProps) {

  return (
    <div className="flex items-center">
      {/* Refresh button and navigation */}
      <RefreshNavigation
        messageIds={messageIds}
        messageId={messageId}
        onRefresh={onRefresh}
        onSelectMessage={onSelectMessage}
      />

      {/* Copy button */}
      <MessageCopyButton messageContent={messageContent} />

      {/* Share button */}
      <ShareButton chatId={chatId} messageId={messageId} />
    </div>
  );
}
