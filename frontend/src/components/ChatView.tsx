import React from 'react';
import { Chat, ChatMessage } from '@shared/types';

interface ChatViewProps {
  chat: Chat;
  onUpdate: () => void;
}

export default function ChatView({ chat, onUpdate }: ChatViewProps) {
  const [message, setMessage] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [chat.messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const timestamp = new Date().toISOString();
    const newMessage: ChatMessage = {
      role: 'user',
      content: message.trim(),
      timestamp,
      unix_timestamp: Date.now()
    };

    const updatedChat: Chat = {
      ...chat,
      messages: [...chat.messages, newMessage],
      update_time: timestamp
    };

    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/chats/${chat.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(updatedChat)
    });

    if (response.ok) {
      setMessage('');
      onUpdate();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chat.messages.map((msg, index) => (
          <div
            key={`${msg.unix_timestamp}-${index}`}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.reasoning_content && (
                <div className="mt-2 text-sm italic text-gray-600 border-t border-gray-200 pt-2">
                  Reasoning: {msg.reasoning_content}
                </div>
              )}
              <div className="text-xs mt-2 space-y-1 opacity-75">
                <div>{new Date(msg.timestamp).toLocaleString()}</div>
                {msg.model && (
                  <div className="text-blue-600">Model: {msg.model}</div>
                )}
                {msg.provider && (
                  <div className="text-green-600">Provider: {msg.provider}</div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
