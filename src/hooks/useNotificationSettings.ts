/**
 * useNotificationSettings Hook
 * 
 * React hook for managing sound notification preferences
 * Reference: /docs/ORDER_MANAGEMENT_SYSTEM_GUIDE.md Section 11.6
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getSoundPreferences,
  setSoundPreferences,
  playNotificationSound,
  type NotificationSoundType,
} from '@/lib/utils/soundNotification';

interface NotificationSettings {
  enabled: boolean;
  volume: number;
}

interface UseNotificationSettingsReturn {
  enabled: boolean;
  volume: number;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  playTestSound: (type?: NotificationSoundType) => void;
  isLoading: boolean;
}

/**
 * Hook untuk manage sound notification settings
 * 
 * @example
 * ```tsx
 * function SettingsPage() {
 *   const { enabled, volume, setEnabled, setVolume, playTestSound } = useNotificationSettings();
 * 
 *   return (
 *     <div>
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={enabled}
 *           onChange={(e) => setEnabled(e.target.checked)}
 *         />
 *         Enable sound notifications
 *       </label>
 * 
 *       <input
 *         type="range"
 *         min="0"
 *         max="100"
 *         value={volume * 100}
 *         onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
 *       />
 * 
 *       <button onClick={() => playTestSound('newOrder')}>
 *         Test Sound
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useNotificationSettings(): UseNotificationSettingsReturn {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    volume: 0.5,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences on mount
  useEffect(() => {
    const preferences = getSoundPreferences();
    setSettings(preferences);
    setIsLoading(false);
  }, []);

  // Update enabled state
  const setEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => {
      const newSettings = { ...prev, enabled };
      setSoundPreferences(newSettings.enabled, newSettings.volume);
      return newSettings;
    });
  }, []);

  // Update volume
  const setVolume = useCallback((volume: number) => {
    // Clamp volume between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    setSettings((prev) => {
      const newSettings = { ...prev, volume: clampedVolume };
      setSoundPreferences(newSettings.enabled, newSettings.volume);
      return newSettings;
    });
  }, []);

  // Play test sound
  const playTestSound = useCallback((type: NotificationSoundType = 'newOrder') => {
    playNotificationSound(type, {
      forcePlay: true, // Always play test sound
      volume: settings.volume,
    });
  }, [settings.volume]);

  return {
    enabled: settings.enabled,
    volume: settings.volume,
    setEnabled,
    setVolume,
    playTestSound,
    isLoading,
  };
}
