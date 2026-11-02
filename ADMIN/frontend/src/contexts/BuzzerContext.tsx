import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { useBuzzer } from '@/hooks/useBuzzer';

// ---------------------------------------------------------------------------
// BuzzerContext — global audio alert system for the admin dashboard.
//
// Provides:
//   play(type)  — play 'safety' (loud siren) or 'complaint' (short chime)
//   stop()      — immediately stop all playing tones
//   toggle()    — mute/unmute the buzzer
//   enabled     — whether the buzzer is currently enabled
//
// Mounted in App.tsx so it persists across all pages.
// ---------------------------------------------------------------------------

interface BuzzerContextValue {
  play: (type?: 'safety' | 'complaint') => Promise<void>;
  stop: () => void;
  toggle: () => void;
  unlock: () => Promise<boolean>;
  enabled: boolean;
  isPlaying: boolean;
  audioUnlocked: boolean;
}

const BuzzerContext = createContext<BuzzerContextValue | undefined>(undefined);

export function BuzzerProvider({ children }: { children: ReactNode }) {
  const buzzer = useBuzzer();

  return (
    <BuzzerContext.Provider value={buzzer}>
      {children}
    </BuzzerContext.Provider>
  );
}

export function useBuzzerContext(): BuzzerContextValue {
  const ctx = useContext(BuzzerContext);
  if (ctx === undefined) {
    throw new Error('useBuzzerContext must be used within a BuzzerProvider');
  }
  return ctx;
}
