import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from '../../config/socket.config';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const s = io(SOCKET_CONFIG.url, {
      reconnectionAttempts: SOCKET_CONFIG.reconnectAttempts,
      reconnectionDelay: SOCKET_CONFIG.reconnectDelay
    });
    s.on('connect', () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));
    setSocket(s);
    return () => s.disconnect();
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
