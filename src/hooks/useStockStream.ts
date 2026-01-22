/**
 * useStockStream Hook
 * 
 * @description
 * Connects to SSE endpoint for real-time stock updates.
 * Automatically updates CustomerDataContext when stock changes.
 * 
 * Features:
 * - Auto-connect when merchant code is provided
 * - Auto-reconnect on connection loss
 * - Debounced updates to prevent UI thrashing
 * - Clean disconnect on unmount
 * 
 * @specification copilot-instructions.md - Performance Optimization
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { buildOrderApiUrl } from '@/lib/utils/orderApiBase';
import { useCustomerData, type StockUpdate } from '@/context/CustomerDataContext';

interface UseStockStreamOptions {
  /** Merchant code to connect to */
  merchantCode: string | null;
  /** Enable/disable the stream (default: true) */
  enabled?: boolean;
  /** Reconnect delay in ms after connection loss (default: 3000) */
  reconnectDelay?: number;
  /** Max reconnect attempts (default: 5) */
  maxReconnectAttempts?: number;
}

interface UseStockStreamReturn {
  /** Whether connected to SSE stream */
  isConnected: boolean;
  /** Connection error if any */
  error: string | null;
  /** Number of reconnect attempts */
  reconnectAttempts: number;
  /** Manually disconnect */
  disconnect: () => void;
  /** Manually reconnect */
  reconnect: () => void;
}

/**
 * Hook to connect to real-time stock updates via SSE
 * 
 * Usage:
 * ```tsx
 * const { isConnected, error } = useStockStream({
 *   merchantCode: 'wellard-kebab',
 *   enabled: true,
 * });
 * ```
 */
export function useStockStream({
  merchantCode,
  enabled = true,
  reconnectDelay = 3000,
  maxReconnectAttempts = 5,
}: UseStockStreamOptions): UseStockStreamReturn {
  const { updateStockFromSSE } = useCustomerData();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Handle stock update messages
  const handleStockUpdate = useCallback((event: MessageEvent) => {
    try {
      const stockUpdates: StockUpdate[] = JSON.parse(event.data);
      console.log('📡 [SSE] Stock update received:', stockUpdates.length, 'items');
      updateStockFromSSE(stockUpdates);
    } catch (err) {
      console.error('📡 [SSE] Failed to parse stock update:', err);
    }
  }, [updateStockFromSSE]);

  // Handle initial data
  const handleInitialData = useCallback((event: MessageEvent) => {
    try {
      const initialStock: StockUpdate[] = JSON.parse(event.data);
      console.log('📡 [SSE] Initial stock data received:', initialStock.length, 'items');
      // Initial data is for reference - SWR has already loaded the full menu
    } catch (err) {
      console.error('📡 [SSE] Failed to parse initial data:', err);
    }
  }, []);

  // Connect to SSE
  const connect = useCallback(() => {
    if (!merchantCode || !enabled) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    console.log('📡 [SSE] Connecting to stock stream...');
    const url = buildOrderApiUrl(`/api/public/merchants/${merchantCode}/stock-stream`);
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('📡 [SSE] Connected');
      setIsConnected(true);
      setError(null);
      setReconnectAttempts(0);
    };

    eventSource.onerror = () => {
      console.error('📡 [SSE] Connection error');
      setIsConnected(false);
      setError('Connection lost');
      
      // Auto-reconnect with exponential backoff
      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = reconnectDelay * Math.pow(2, reconnectAttempts);
        console.log(`📡 [SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connect();
        }, delay);
      } else {
        setError('Max reconnect attempts reached');
      }
    };

    // Listen for stock updates
    eventSource.addEventListener('stock-update', handleStockUpdate);
    eventSource.addEventListener('initial', handleInitialData);

  }, [merchantCode, enabled, reconnectAttempts, maxReconnectAttempts, reconnectDelay, handleStockUpdate, handleInitialData]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      console.log('📡 [SSE] Disconnected');
    }
    
    setIsConnected(false);
  }, []);

  // Reconnect manually
  const reconnect = useCallback(() => {
    setReconnectAttempts(0);
    disconnect();
    connect();
  }, [connect, disconnect]);

  // Effect to manage connection lifecycle
  useEffect(() => {
    if (enabled && merchantCode) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [merchantCode, enabled]); // Only reconnect when these change

  return {
    isConnected,
    error,
    reconnectAttempts,
    disconnect,
    reconnect,
  };
}

export default useStockStream;
