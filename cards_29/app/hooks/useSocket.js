import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

let socket = null;

export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!socketRef.current) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
      
      socketRef.current = io(socketUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected:', socketRef.current.id);
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    }

    socket = socketRef.current;

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
      socket = null;
    }
  }, []);

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
    disconnect,
    isConnected: socketRef.current?.connected || false,
  };
}

export function getSocket() {
  return socket;
}
