import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface WebSocketContextType {
  connected: boolean;
  lastMessage: WebSocketMessage | null;
  messages: WebSocketMessage[];
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  const connect = useCallback(() => {
    if (!user) return;

    // En production, utiliser l'URL du backend configurée
    const backendUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
    const wsUrl = backendUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';
    
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('✅ WebSocket connecté');
      setConnected(true);
    };

    websocket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        setLastMessage(message);
        setMessages(prev => [...prev.slice(-99), message]); // Garder les 100 derniers messages
      } catch (error) {
        console.error('Erreur parsing message WebSocket:', error);
      }
    };

    websocket.onclose = () => {
      console.log('❌ WebSocket déconnecté');
      setConnected(false);
      
      // Reconnexion automatique après 5 secondes
      setTimeout(() => {
        connect();
      }, 5000);
    };

    websocket.onerror = (error) => {
      console.error('❌ Erreur WebSocket:', error);
    };

    return () => {
      websocket.close();
    };
  }, [user]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      if (cleanup) cleanup();
    };
  }, [connect]);

  return (
    <WebSocketContext.Provider value={{ connected, lastMessage, messages }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
