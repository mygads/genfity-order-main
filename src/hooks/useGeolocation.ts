/**
 * Geolocation Hook
 * 
 * Provides location detection via browser Geolocation API
 * with reverse geocoding to determine country, currency, and timezone
 */

import { useState, useCallback } from 'react';

export interface GeoLocationData {
  latitude: number;
  longitude: number;
  country: string;
  countryCode: string;
  city: string;
  state: string;
  currency: 'IDR' | 'AUD' | 'USD' | 'SGD' | 'MYR';
  timezone: string;
}

export interface GeolocationState {
  isLoading: boolean;
  isDetecting: boolean;
  error: string | null;
  data: GeoLocationData | null;
  isSupported: boolean;
}

// Country to currency and timezone mapping
const COUNTRY_CONFIG: Record<string, { currency: 'IDR' | 'AUD' | 'USD' | 'SGD' | 'MYR'; timezone: string }> = {
  'ID': { currency: 'IDR', timezone: 'Asia/Jakarta' },
  'AU': { currency: 'AUD', timezone: 'Australia/Sydney' },
  'US': { currency: 'USD', timezone: 'America/New_York' },
  'SG': { currency: 'SGD', timezone: 'Asia/Singapore' },
  'MY': { currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' },
};

// Fallback for countries not in the list
const DEFAULT_CONFIG = { currency: 'AUD' as const, timezone: 'Australia/Sydney' };

/**
 * Reverse geocode coordinates to get location details
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */
async function reverseGeocode(latitude: number, longitude: number): Promise<Partial<GeoLocationData>> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en`,
      {
        headers: {
          'User-Agent': 'Genfity-Online-Ordering/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch location data');
    }

    const data = await response.json();
    const address = data.address || {};

    const countryCode = address.country_code?.toUpperCase() || 'AU';
    const config = COUNTRY_CONFIG[countryCode] || DEFAULT_CONFIG;

    // Attempt to get a better timezone from browser if available
    let timezone = config.timezone;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || config.timezone;
    } catch {
      // Keep the config timezone
    }

    return {
      country: address.country || 'Australia',
      countryCode,
      city: address.city || address.town || address.village || address.municipality || '',
      state: address.state || address.region || '',
      currency: config.currency,
      timezone,
    };
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    // Return defaults based on browser timezone
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Guess country from timezone
    if (browserTimezone.startsWith('Asia/Jakarta') || browserTimezone.startsWith('Asia/Makassar')) {
      return { country: 'Indonesia', countryCode: 'ID', currency: 'IDR', timezone: browserTimezone, city: '', state: '' };
    } else if (browserTimezone.startsWith('Australia')) {
      return { country: 'Australia', countryCode: 'AU', currency: 'AUD', timezone: browserTimezone, city: '', state: '' };
    }
    
    return { country: 'Australia', countryCode: 'AU', currency: 'AUD', timezone: 'Australia/Sydney', city: '', state: '' };
  }
}

/**
 * Hook to detect user's geolocation and derive location settings
 */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    isLoading: false,
    isDetecting: false,
    error: null,
    data: null,
    isSupported: typeof window !== 'undefined' && 'geolocation' in navigator,
  });

  /**
   * Detect location via GPS
   */
  const detectLocation = useCallback(async (): Promise<GeoLocationData | null> => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
      }));
      return null;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      isDetecting: true,
      error: null,
    }));

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isDetecting: false,
          error: 'Location detection timed out. Please enter manually.',
        }));
        resolve(null);
      }, 15000); // 15 second timeout

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(timeoutId);
          
          const { latitude, longitude } = position.coords;
          
          try {
            // Reverse geocode to get country, city, etc.
            const locationDetails = await reverseGeocode(latitude, longitude);
            
            const data: GeoLocationData = {
              latitude,
              longitude,
              country: locationDetails.country || 'Australia',
              countryCode: locationDetails.countryCode || 'AU',
              city: locationDetails.city || '',
              state: locationDetails.state || '',
              currency: locationDetails.currency || 'AUD',
              timezone: locationDetails.timezone || 'Australia/Sydney',
            };

            setState({
              isLoading: false,
              isDetecting: false,
              error: null,
              data,
              isSupported: true,
            });

            resolve(data);
          } catch {
            setState(prev => ({
              ...prev,
              isLoading: false,
              isDetecting: false,
              error: 'Failed to determine your location details',
            }));
            resolve(null);
          }
        },
        (error) => {
          clearTimeout(timeoutId);
          
          let errorMessage = 'Failed to detect location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access or enter manually.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Please enter manually.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location detection timed out. Please try again or enter manually.';
              break;
          }

          setState(prev => ({
            ...prev,
            isLoading: false,
            isDetecting: false,
            error: errorMessage,
          }));

          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes cache
        }
      );
    });
  }, [state.isSupported]);

  /**
   * Detect location from timezone only (no GPS permission needed)
   */
  const detectFromTimezone = useCallback((): Partial<GeoLocationData> => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Map timezone to country
    if (browserTimezone.startsWith('Asia/Jakarta') || browserTimezone.startsWith('Asia/Makassar') || browserTimezone.startsWith('Asia/Jayapura')) {
      return { country: 'Indonesia', countryCode: 'ID', currency: 'IDR', timezone: browserTimezone };
    } else if (browserTimezone.startsWith('Australia')) {
      return { country: 'Australia', countryCode: 'AU', currency: 'AUD', timezone: browserTimezone };
    } else if (browserTimezone.startsWith('Asia/Singapore')) {
      return { country: 'Singapore', countryCode: 'SG', currency: 'SGD', timezone: browserTimezone };
    } else if (browserTimezone.startsWith('Asia/Kuala_Lumpur')) {
      return { country: 'Malaysia', countryCode: 'MY', currency: 'MYR', timezone: browserTimezone };
    } else if (browserTimezone.startsWith('America')) {
      return { country: 'United States', countryCode: 'US', currency: 'USD', timezone: browserTimezone };
    }
    
    // Default
    return { country: 'Australia', countryCode: 'AU', currency: 'AUD', timezone: 'Australia/Sydney' };
  }, []);

  /**
   * Reset location data
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isDetecting: false,
      error: null,
      data: null,
      isSupported: typeof window !== 'undefined' && 'geolocation' in navigator,
    });
  }, []);

  return {
    ...state,
    detectLocation,
    detectFromTimezone,
    reset,
  };
}

export default useGeolocation;
