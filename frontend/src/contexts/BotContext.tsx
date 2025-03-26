import React, { createContext, useContext, useState } from 'react';
import { BotConfig } from '@shared/types';
import { useAuthenticatedSWR } from '../utils/api';

interface BotContextType {
  bots: BotConfig[] | undefined;
  selectedBot: string | undefined;
  setSelectedBot: React.Dispatch<React.SetStateAction<string | undefined>>;
  isLoading: boolean;
}

const BotContext = createContext<BotContextType | undefined>(undefined);

export function BotProvider({ children }: { children: React.ReactNode }) {
  const [selectedBot, setSelectedBot] = useState<string | undefined>(undefined);

  const { data: bots, isLoading } = useAuthenticatedSWR<BotConfig[]>('/api/bots', {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 0,
    dedupingInterval: 2000,
    onSuccess: (data) => {
      // Set the first bot as default if nothing is selected yet
      if (!selectedBot && data && data.length > 0) {
        setSelectedBot(data[0].name);
      }
    }
  });

  return (
    <BotContext.Provider value={{ bots, selectedBot, setSelectedBot, isLoading }}>
      {children}
    </BotContext.Provider>
  );
}

export function useBot() {
  const context = useContext(BotContext);
  if (context === undefined) {
    throw new Error('useBot must be used within a BotProvider');
  }
  return context;
}
