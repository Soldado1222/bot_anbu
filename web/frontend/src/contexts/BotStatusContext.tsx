import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../lib/axios';

interface BotUser {
  id: string;
  username: string;
  avatar: string;
  tag: string;
}

interface BotStatusType {
  connected: boolean;
  user: BotUser | null;
  uptime: number;
  ping: number;
}

interface BotStatusContextType {
  botStatus: BotStatusType | null;
  refreshStatus: () => void;
}

const BotStatusContext = createContext<BotStatusContextType>({
  botStatus: null,
  refreshStatus: () => {},
});

export function BotStatusProvider({ children }: { children: React.ReactNode }) {
  const [botStatus, setBotStatus] = useState<BotStatusType | null>(null);

  const refreshStatus = async () => {
    try {
      const res = await axios.get('/api/bot/status');
      setBotStatus(res.data);
    } catch {
      setBotStatus(null);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BotStatusContext.Provider value={{ botStatus, refreshStatus }}>
      {children}
    </BotStatusContext.Provider>
  );
}

export function useBotStatus() {
  return useContext(BotStatusContext);
}
