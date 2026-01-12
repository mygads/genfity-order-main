/**
 * Client-only Leaflet map wrapper.
 *
 * IMPORTANT: This file must only be imported with `next/dynamic` and `ssr: false`
 * to avoid `window is not defined` during SSR.
 */

'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type DeliveryMapMarkerPosition = { lat: number; lng: number };

function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });

  return null;
}

function MapInstanceSetter({ onMap }: { onMap: (map: L.Map) => void }) {
  const map = useMap();

  useEffect(() => {
    onMap(map);
  }, [map, onMap]);

  return null;
}

export default function DeliveryMapClient(props: {
  center: [number, number];
  markerPosition: DeliveryMapMarkerPosition | null;
  addressLabel: string;
  onLocationSelect: (lat: number, lng: number) => void;
  onMapReady: (map: L.Map) => void;
}) {
  const markerIcon = useMemo(
    () =>
      L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    []
  );

  return (
    <MapContainer center={props.center} zoom={13} style={{ height: '100%', width: '100%' }}>
      <MapInstanceSetter onMap={props.onMapReady} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {props.markerPosition && (
        <Marker position={[props.markerPosition.lat, props.markerPosition.lng]} icon={markerIcon}>
          <Popup>
            {props.addressLabel || 'Delivery Location'} <br />
            <small>
              {props.markerPosition.lat.toFixed(4)}, {props.markerPosition.lng.toFixed(4)}
            </small>
          </Popup>
        </Marker>
      )}
      <MapClickHandler onLocationSelect={props.onLocationSelect} />
    </MapContainer>
  );
}
