import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

let socket = null;

export function useSocket() {
  const socketRef = useRef(null);
  const [socketInstance, setSocketInstance] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socketRef.current) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

      const nextSocket = io(socketUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      nextSocket.on('connect', () => {
        setIsConnected(true);
        console.log('Socket connected:', nextSocket.id);
      });

      nextSocket.on('disconnect', () => {
        setIsConnected(false);
        console.log('Socket disconnected');
      });

      nextSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      socketRef.current = nextSocket;
      setSocketInstance(nextSocket);
      socket = nextSocket;
    } else {
      setSocketInstance(socketRef.current);
      setIsConnected(socketRef.current.connected);
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive
    };
  }, []);

  const emit = useCallback((event, data, callback) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data, callback);
    } else {
      console.warn('Socket not connected');
    }
  }, []);

  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocketInstance(null);
      setIsConnected(false);
      socket = null;
    }
  }, []);

  return {
    socket: socketInstance,
    emit,
    on,
    off,
    disconnect,
    isConnected,
  };
}

export function getSocket() {
  return socket;
}
