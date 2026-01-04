"use client";

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with Next.js
import L from 'leaflet';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapContentProps {
  latitude?: number | null;
  longitude?: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  height: string;
}

interface LocationMarkerProps {
  position: LatLngExpression | null;
  onLocationChange: (lat: number, lng: number) => void;
}

/**
 * Map click handler component
 */
function LocationMarker({ position, onLocationChange }: LocationMarkerProps) {
  const [markerPosition, setMarkerPosition] = useState<LatLngExpression | null>(position);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setMarkerPosition([lat, lng]);
      onLocationChange(lat, lng);
    },
  });

  useEffect(() => {
    setMarkerPosition(position);
  }, [position]);

  return markerPosition ? <Marker position={markerPosition} /> : null;
}

/**
 * MapContent Component - The actual Leaflet map
 */
export default function MapContent({ latitude, longitude, onLocationChange, height }: MapContentProps) {
  // Default to Sydney, Australia if no coordinates provided
  const defaultCenter: LatLngExpression = [-33.8688, 151.2093];
  const initialPosition: LatLngExpression | null = 
    latitude && longitude ? [latitude, longitude] : null;

  const center: LatLngExpression = initialPosition || defaultCenter;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 relative" style={{ height, zIndex: 1 }}>
      <MapContainer
        center={center}
        zoom={initialPosition ? 15 : 12}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        key={`${latitude}-${longitude}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={initialPosition} onLocationChange={onLocationChange} />
      </MapContainer>
    </div>
  );
}
