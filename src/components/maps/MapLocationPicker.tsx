"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { FaLocationArrow, FaSpinner } from 'react-icons/fa';

// Import the map content as a separate component to handle SSR
const MapContent = dynamic(() => import('./MapContent'), { ssr: false });

interface MapLocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  height?: string;
}

/**
 * MapLocationPicker Component
 * Interactive map for selecting merchant location coordinates
 * 
 * @param latitude - Current latitude
 * @param longitude - Current longitude
 * @param onLocationChange - Callback when location is selected
 * @param height - Map container height (default: 400px)
 */
export default function MapLocationPicker({
  latitude,
  longitude,
  onLocationChange,
  height = '400px',
}: MapLocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleSearch = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    // Prevent form submission
    e?.preventDefault();
    
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      // Use Nominatim geocoding service (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        onLocationChange(parseFloat(lat), parseFloat(lon));
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Failed to search location. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      handleSearch(e);
    }
  };

  const handleUseMyLocation = (e?: React.MouseEvent) => {
    // Prevent form submission
    e?.preventDefault();
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationChange(position.coords.latitude, position.coords.longitude);
        setGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Failed to get your location. Please check your browser permissions.');
        setGettingLocation(false);
      }
    );
  };

  return (
    <div className="space-y-3">
      {/* Search Box & Use My Location */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Search for a location (e.g., Sydney Opera House)"
          className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        />
        <button
          type="button"
          onClick={(e) => handleSearch(e)}
          disabled={searching || !searchQuery.trim()}
          className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
        <button
          type="button"
          onClick={(e) => handleUseMyLocation(e)}
          disabled={gettingLocation}
          className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          title="Use my current location"
        >
          {gettingLocation ? (
            <FaSpinner className="h-4 w-4 animate-spin" />
          ) : (
            <FaLocationArrow className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Map Container */}
      <MapContent
        latitude={latitude}
        longitude={longitude}
        onLocationChange={onLocationChange}
        height={height}
      />

      {/* Instructions */}
      <div className="rounded-lg bg-brand-50 p-3 dark:bg-brand-900/10">
        <p className="text-xs text-brand-700 dark:text-brand-400">
          <strong>Tip:</strong> Click on the map to set location, use search box to find address, or click the location icon to use your current location.
        </p>
      </div>

      {/* Coordinates Display */}
      {latitude && longitude && (
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <span className="font-medium">Latitude:</span> {latitude.toFixed(6)}
          </div>
          <div>
            <span className="font-medium">Longitude:</span> {longitude.toFixed(6)}
          </div>
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-brand-500 hover:text-brand-600 hover:underline dark:text-brand-400"
          >
            View in Google Maps →
          </a>
        </div>
      )}
    </div>
  );
}

