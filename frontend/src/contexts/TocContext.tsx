import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TocContextType {
  isTocOpen: boolean;
  setIsTocOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleToc: () => void;
  currentMessageId: string | undefined;
  setCurrentMessageId: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const TocContext = createContext<TocContextType | undefined>(undefined);

export const useToc = (): TocContextType => {
  const context = useContext(TocContext);
  if (!context) {
    throw new Error('useToc must be used within a TocProvider');
  }
  return context;
};

interface TocProviderProps {
  children: ReactNode;
}

export const TocProvider: React.FC<TocProviderProps> = ({ children }) => {
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<string | undefined>(undefined);

  const toggleToc = () => {
    setIsTocOpen(prev => !prev);
  };

  return (
    <TocContext.Provider
      value={{
        isTocOpen,
        setIsTocOpen,
        toggleToc,
        currentMessageId,
        setCurrentMessageId
      }}
    >
      {children}
    </TocContext.Provider>
  );
};
