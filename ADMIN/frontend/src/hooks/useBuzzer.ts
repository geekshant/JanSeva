import { useState, useRef, useCallback, useEffect } from 'react';

// ---------------------------------------------------------------------------
// useBuzzer — Web Audio API alarm system for the admin dashboard.
//
// Two tones:
//   - 'safety'  = loud 10-second two-tone siren (1000Hz ↔ 600Hz) for SOS alerts
//   - 'complaint' = short 2-beep chime (880Hz) for new complaints
// ---------------------------------------------------------------------------

type BuzzerType = 'safety' | 'complaint';

export function useBuzzer() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<Set<OscillatorNode>>(new Set());
  const [enabled, setEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Ensure AudioContext exists and is running. Must be called from a user gesture
  // to satisfy browser autoplay policies.
  const ensureContext = useCallback(async (): Promise<AudioContext | null> => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      return ctx;
    } catch (err) {
      console.error('Buzzer: AudioContext error:', err);
      return null;
    }
  }, []);

  // Unlock audio playback — call from a user gesture (click/tap). Creates the
  // AudioContext and resumes it so subsequent play() calls from realtime
  // callbacks are not blocked by the browser's autoplay policy.
  const unlock = useCallback(async (): Promise<boolean> => {
    const ctx = await ensureContext();
    if (!ctx) {
      console.error('Buzzer: failed to create AudioContext');
      return false;
    }
    // Play a silent blip to fully unlock audio on Safari/iOS.
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.01);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.02);
    } catch {
      // Some browsers throw if already unlocked — not fatal.
    }
    const unlocked = ctx.state === 'running';
    setAudioUnlocked(unlocked);
    console.log('Buzzer: unlock() — AudioContext state:', ctx.state, 'unlocked:', unlocked);
    return unlocked;
  }, [ensureContext]);

  const stop = useCallback(() => {
    console.log('Buzzer: stop() called, oscillators:', oscillatorsRef.current.size);
    oscillatorsRef.current.forEach((osc) => {
      try { osc.stop(); osc.disconnect(); } catch { /* already stopped */ }
    });
    oscillatorsRef.current.clear();
    setIsPlaying(false);
  }, []);

  const play = useCallback(async (type: BuzzerType = 'safety') => {
    console.log('Buzzer: play() called, type:', type, 'enabled:', enabled, 'audioUnlocked:', audioUnlocked);

    if (!enabled) {
      console.log('Buzzer: disabled, returning');
      return;
    }

    // Stop any currently playing tone first
    oscillatorsRef.current.forEach((osc) => {
      try { osc.stop(); osc.disconnect(); } catch { /* already stopped */ }
    });
    oscillatorsRef.current.clear();

    const ctx = await ensureContext();
    if (!ctx) {
      console.error('Buzzer: no AudioContext available');
      return;
    }

    // If the context is suspended (browser autoplay policy), we can't play.
    // Log a clear warning so the admin knows to click the buzzer toggle once.
    if (ctx.state !== 'running') {
      console.warn('Buzzer: AudioContext is', ctx.state, '— audio is locked. Click the buzzer icon once to enable emergency sound.');
      return;
    }

    console.log('Buzzer: AudioContext state:', ctx.state);

    try {
      setIsPlaying(true);

      if (type === 'safety') {
        // Loud 10-second siren: 8 cycles of 1000Hz ↔ 600Hz
        const cycles = 8;
        const toneDuration = 0.6;
        const startTime = ctx.currentTime + 0.05; // small delay to ensure context is ready

        for (let i = 0; i < cycles; i++) {
          const t0 = startTime + i * toneDuration * 2;

          const oscHigh = ctx.createOscillator();
          const gainHigh = ctx.createGain();
          oscHigh.connect(gainHigh); gainHigh.connect(ctx.destination);
          oscHigh.type = 'square';
          oscHigh.frequency.setValueAtTime(1000, t0);
          gainHigh.gain.setValueAtTime(0.001, t0);
          gainHigh.gain.exponentialRampToValueAtTime(0.9, t0 + 0.05);
          gainHigh.gain.setValueAtTime(0.9, t0 + toneDuration - 0.05);
          gainHigh.gain.exponentialRampToValueAtTime(0.001, t0 + toneDuration);
          oscillatorsRef.current.add(oscHigh);
          oscHigh.onended = () => {
            oscillatorsRef.current.delete(oscHigh);
            if (oscillatorsRef.current.size === 0) setIsPlaying(false);
          };
          oscHigh.start(t0); oscHigh.stop(t0 + toneDuration);

          const oscLow = ctx.createOscillator();
          const gainLow = ctx.createGain();
          oscLow.connect(gainLow); gainLow.connect(ctx.destination);
          oscLow.type = 'square';
          oscLow.frequency.setValueAtTime(600, t0 + toneDuration);
          gainLow.gain.setValueAtTime(0.001, t0 + toneDuration);
          gainLow.gain.exponentialRampToValueAtTime(0.9, t0 + toneDuration + 0.05);
          gainLow.gain.setValueAtTime(0.9, t0 + toneDuration * 2 - 0.05);
          gainLow.gain.exponentialRampToValueAtTime(0.001, t0 + toneDuration * 2);
          oscillatorsRef.current.add(oscLow);
          oscLow.onended = () => {
            oscillatorsRef.current.delete(oscLow);
            if (oscillatorsRef.current.size === 0) setIsPlaying(false);
          };
          oscLow.start(t0 + toneDuration); oscLow.stop(t0 + toneDuration * 2);
        }
        console.log('Buzzer: safety siren scheduled, oscillators:', oscillatorsRef.current.size);
      } else {
        // Short 2-beep chime for new complaints
        const startTime = ctx.currentTime + 0.05;
        for (let i = 0; i < 2; i++) {
          const t0 = startTime + i * 0.15;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, t0);
          gain.gain.setValueAtTime(0.001, t0);
          gain.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
          oscillatorsRef.current.add(osc);
          osc.onended = () => {
            oscillatorsRef.current.delete(osc);
            if (oscillatorsRef.current.size === 0) setIsPlaying(false);
          };
          osc.start(t0); osc.stop(t0 + 0.1);
        }
        console.log('Buzzer: complaint chime scheduled, oscillators:', oscillatorsRef.current.size);
      }
    } catch (err) {
      console.error('Buzzer: error during playback:', err);
      setIsPlaying(false);
    }
  }, [enabled, audioUnlocked, ensureContext]);

  const toggle = useCallback(() => {
    setEnabled((e) => {
      const newEnabled = !e;
      console.log('Buzzer: toggle, new enabled:', newEnabled);
      if (newEnabled) {
        // Turning the buzzer on — also unlock audio (this is a user gesture).
        void unlock();
      } else {
        stop();
      }
      return newEnabled;
    });
  }, [stop, unlock]);

  useEffect(() => stop, [stop]);

  return { play, stop, toggle, unlock, enabled, isPlaying, audioUnlocked };
}
