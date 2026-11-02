import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// useRealtimeSubscription — generic realtime subscription hook.
//
// Features:
//   - Deduplication: a Set of seen event IDs prevents duplicate processing
//   - Cleanup: channels are removed on unmount
//   - Reconnection: Supabase auto-reconnects; on reconnect, the callback fires
//     for any events that arrived during the disconnect (via WALR)
//   - RLS: subscriptions respect the user's RLS policies — if a user can't
//     read a row, they won't receive events for it
//   - Instance isolation: each hook call gets a unique channel name so the
//     same hook can be mounted in multiple components (or survive React
//     StrictMode's async cleanup/re-mount) without hitting "cannot add
//     postgres_changes callbacks after subscribe()" errors.
//
// Usage:
//   useRealtimeSubscription({
//     channelName: 'complaints-changes',
//     event: 'INSERT',
//     schema: 'public',
//     table: 'complaints',
//     onEvent: (payload) => { ... },
//   });
// ---------------------------------------------------------------------------

// Monotonic counter for unique channel names per subscription instance.
let channelCounter = 0;

interface SubscriptionConfig {
  channelName: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table?: string;
  filter?: string;
  onEvent: (payload: unknown) => void;
}

export function useRealtimeSubscription({
  channelName,
  event = '*',
  schema = 'public',
  table,
  filter,
  onEvent,
}: SubscriptionConfig) {
  const seenIds = useRef<Set<string>>(new Set());
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    // Append a unique suffix so two components subscribing with the same base
    // channelName get separate channels. The supabase-js client returns the
    // existing channel if `.channel(name)` is called with a duplicate name,
    // and calling `.on('postgres_changes')` on an already-subscribed channel
    // throws. A per-instance name avoids this entirely.
    const uniqueChannelName = `${channelName}-${++channelCounter}`;

    // Build the postgres_changes config. Supabase expects this as a typed
    // object — using a const-asserted shape so the overload resolves.
    const config = {
      event,
      schema,
      ...(table ? { table } : {}),
      ...(filter ? { filter } : {}),
    };

    const channel = supabase
      .channel(uniqueChannelName)
      .on('postgres_changes', config, (payload: { new?: { id?: string }; old?: { id?: string }; eventType: string; table: string; schema: string }) => {
        // Deduplicate by row id (new record) or old id (delete).
        const id = payload.new?.id ?? payload.old?.id;
        if (id) {
          if (seenIds.current.has(id)) return;
          seenIds.current.add(id);
          // Prevent unbounded growth — keep last 500 IDs.
          if (seenIds.current.size > 500) {
            const first = seenIds.current.values().next().value;
            if (first) seenIds.current.delete(first);
          }
        }
        onEventRef.current(payload);
      })
      .subscribe((state) => {
        if (state === 'CHANNEL_ERROR') {
          console.warn(`[Realtime] Channel "${channelName}" error — will auto-retry.`);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelName, event, schema, table, filter]);
}
