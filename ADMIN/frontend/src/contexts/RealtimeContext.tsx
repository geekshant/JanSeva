import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// RealtimeContext — tracks the global Supabase Realtime connection state
// and provides it to the RealtimeIndicator in the top bar.
//
// A single sentinel channel is used to monitor the overall connection.
// Individual pages create their own channels via useRealtimeSubscription,
// but the connection state is shared (Supabase multiplexes all channels
// over one WebSocket).
// ---------------------------------------------------------------------------

export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'error';

interface RealtimeContextValue {
  status: ConnectionStatus;
  activeSubscriptions: number;
  trackSubscription: () => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);

  // Sentinel channel to monitor the global WebSocket connection.
  useEffect(() => {
    const channel = supabase.channel('realtime-status');

    channel.subscribe((state: REALTIME_SUBSCRIBE_STATES) => {
      if (state === 'SUBSCRIBED') setStatus('connected');
      else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT')
        setStatus('error');
      else if (state === 'CLOSED') setStatus('disconnected');
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  // Reconnection — Supabase auto-reconnects, but we reset the status.
  useEffect(() => {
    if (status === 'error' || status === 'disconnected') {
      const timer = setTimeout(() => setStatus('connecting'), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Track active subscriptions for the indicator badge.
  const trackSubscription = useCallback(() => {
    setActiveSubscriptions((n) => n + 1);
    return () => {
      setActiveSubscriptions((n) => Math.max(0, n - 1));
    };
  }, []);

  return (
    <RealtimeContext.Provider
      value={{ status, activeSubscriptions, trackSubscription }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (ctx === undefined) {
    throw new Error('useRealtimeContext must be used within a RealtimeProvider');
  }
  return ctx;
}
