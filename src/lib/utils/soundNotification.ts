/**
 * Sound Notification Utility
 * 
 * Audio alerts for order management events
 * Reference: /docs/ORDER_MANAGEMENT_SYSTEM_GUIDE.md Section 11.6
 */

/**
 * Available notification sound types
 */
export type NotificationSoundType = 'newOrder' | 'orderReady' | 'payment';

const DEBUG_SOUND = process.env.NEXT_PUBLIC_DEBUG_SOUND === 'true';
const soundLog = (...args: unknown[]) => {
  if (DEBUG_SOUND) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

/**
 * Sound file paths
 */
const NOTIFICATION_SOUNDS: Record<NotificationSoundType, string> = {
  newOrder: '/sounds/new-order.mp3',
  orderReady: '/sounds/order-ready.mp3',
  payment: '/sounds/payment.mp3',
};

/**
 * Default sound settings
 */
const DEFAULT_VOLUME = 0.5; // 50% volume
const DEFAULT_ENABLED = true;

/**
 * Get sound notification preferences from localStorage
 */
export function getSoundPreferences(): {
  enabled: boolean;
  volume: number;
} {
  if (typeof window === 'undefined') {
    return { enabled: DEFAULT_ENABLED, volume: DEFAULT_VOLUME };
  }

  try {
    const enabled = localStorage.getItem('sound-notifications-enabled');
    const volume = localStorage.getItem('sound-notifications-volume');

    return {
      enabled: enabled !== null ? enabled === 'true' : DEFAULT_ENABLED,
      volume: volume !== null ? parseFloat(volume) : DEFAULT_VOLUME,
    };
  } catch (error) {
    console.error('Error reading sound preferences:', error);
    return { enabled: DEFAULT_ENABLED, volume: DEFAULT_VOLUME };
  }
}

/**
 * Save sound notification preferences to localStorage
 */
export function setSoundPreferences(enabled: boolean, volume?: number): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('sound-notifications-enabled', String(enabled));
    if (volume !== undefined) {
      localStorage.setItem('sound-notifications-volume', String(volume));
    }
  } catch (error) {
    console.error('Error saving sound preferences:', error);
  }
}

/**
 * Play notification sound
 * 
 * @param type - Type of notification sound to play
 * @param options - Optional overrides for volume and enabled state
 * 
 * @example
 * // Play new order sound with default settings
 * playNotificationSound('newOrder');
 * 
 * @example
 * // Play with custom volume
 * playNotificationSound('orderReady', { volume: 0.8 });
 * 
 * @example
 * // Force play even if disabled
 * playNotificationSound('payment', { forcePlay: true });
 */
export function playNotificationSound(
  type: NotificationSoundType,
  options?: {
    volume?: number;
    forcePlay?: boolean;
  }
): void {
  // Server-side rendering check
  if (typeof window === 'undefined') return;

  const preferences = getSoundPreferences();
  const volume = options?.volume ?? preferences.volume;
  const shouldPlay = options?.forcePlay || preferences.enabled;

  if (!shouldPlay) {
    soundLog(`[Sound] Skipped ${type} - notifications disabled`);
    return;
  }

  try {
    const soundPath = NOTIFICATION_SOUNDS[type];
    const audio = new Audio(soundPath);
    audio.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0-1

    // Play sound with error handling
    audio.play().catch((error) => {
      // Autoplay policy might block sound
      // This is expected behavior and not a critical error
      soundLog(`[Sound] Could not play ${type}:`, error.message);
    });

    soundLog(`[Sound] Playing ${type} at ${Math.round(volume * 100)}% volume`);
  } catch (error) {
    console.error(`[Sound] Error playing ${type}:`, error);
  }
}

/**
 * Test all notification sounds
 * Useful for settings page
 */
export function testNotificationSounds(): void {
  const types: NotificationSoundType[] = ['newOrder', 'orderReady', 'payment'];
  
  types.forEach((type, index) => {
    setTimeout(() => {
      playNotificationSound(type, { forcePlay: true });
    }, index * 1000); // 1 second between each sound
  });
}

/**
 * Check if sound file exists
 * Useful for debugging
 */
export async function checkSoundFiles(): Promise<Record<NotificationSoundType, boolean>> {
  const results: Record<NotificationSoundType, boolean> = {
    newOrder: false,
    orderReady: false,
    payment: false,
  };

  for (const [type, path] of Object.entries(NOTIFICATION_SOUNDS)) {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      results[type as NotificationSoundType] = response.ok;
    } catch {
      results[type as NotificationSoundType] = false;
    }
  }

  return results;
}
