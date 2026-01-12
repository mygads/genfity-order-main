'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { haversineDistanceKm, isPointInPolygon } from '@/lib/utils/geo';

type LatLng = { lat: number; lng: number };

type DeliveryZoneType = 'RADIUS' | 'POLYGON';

type DeliveryZone = {
  id: string;
  name: string;
  type: DeliveryZoneType;
  radiusKm: number | null;
  polygon: LatLng[] | null;
  isActive: boolean;
};

function polygonsOverlap(a: LatLng[], b: LatLng[]): boolean {
  if (a.length < 3 || b.length < 3) return false;

  // More robust overlap detection:
  // 1) Any edge intersects any other edge
  // 2) Or any vertex is inside the other polygon

  const orient = (p: LatLng, q: LatLng, r: LatLng) => {
    const val = (q.lat - p.lat) * (r.lng - q.lng) - (q.lng - p.lng) * (r.lat - q.lat);
    if (Math.abs(val) < 1e-12) return 0;
    return val > 0 ? 1 : 2;
  };

  const onSegment = (p: LatLng, q: LatLng, r: LatLng) => {
    return (
      q.lng <= Math.max(p.lng, r.lng) &&
      q.lng >= Math.min(p.lng, r.lng) &&
      q.lat <= Math.max(p.lat, r.lat) &&
      q.lat >= Math.min(p.lat, r.lat)
    );
  };

  const segmentsIntersect = (p1: LatLng, q1: LatLng, p2: LatLng, q2: LatLng) => {
    const o1 = orient(p1, q1, p2);
    const o2 = orient(p1, q1, q2);
    const o3 = orient(p2, q2, p1);
    const o4 = orient(p2, q2, q1);

    if (o1 !== o2 && o3 !== o4) return true;

    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;

    return false;
  };

  const aEdges = a.map((p, i) => [p, a[(i + 1) % a.length]] as const);
  const bEdges = b.map((p, i) => [p, b[(i + 1) % b.length]] as const);

  for (const [a1, a2] of aEdges) {
    for (const [b1, b2] of bEdges) {
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }

  for (const p of a) {
    if (isPointInPolygon(p, b)) return true;
  }
  for (const p of b) {
    if (isPointInPolygon(p, a)) return true;
  }

  return false;
}

function MapClickHandler({
  zoneType,
  onAddPolygonPoint,
}: {
  zoneType: DeliveryZoneType;
  onAddPolygonPoint: (p: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (zoneType !== 'POLYGON') return;
      onAddPolygonPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function ZoneEditorMap({
  merchantLat,
  merchantLng,
  zoneType,
  radiusKm,
  polygon,
  otherZones,
  deliveryMaxDistanceKm,
  onPolygonChange,
}: {
  merchantLat: number | null;
  merchantLng: number | null;
  zoneType: DeliveryZoneType;
  radiusKm: number;
  polygon: LatLng[];
  otherZones?: DeliveryZone[];
  deliveryMaxDistanceKm?: number | null;
  onPolygonChange: (next: LatLng[]) => void;
}) {
  const center: [number, number] = useMemo(() => {
    if (merchantLat !== null && merchantLng !== null) {
      return [merchantLat, merchantLng];
    }
    return [-33.8688, 151.2093];
  }, [merchantLat, merchantLng]);

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

  const polygonPositions: [number, number][] = useMemo(
    () => (polygon || []).map((p) => [p.lat, p.lng] as [number, number]),
    [polygon]
  );

  const otherPolygons = useMemo(() => {
    return (otherZones || []).filter((z) => z.isActive !== false && z.type === 'POLYGON' && Array.isArray(z.polygon) && z.polygon.length >= 3);
  }, [otherZones]);

  const otherPolygonPositions = useMemo(() => {
    return otherPolygons.map((z) => ({
      id: z.id,
      name: z.name,
      positions: (z.polygon || []).map((p) => [p.lat, p.lng] as [number, number]),
    }));
  }, [otherPolygons]);

  const overlapNames = useMemo(() => {
    if (zoneType !== 'POLYGON' || !polygon || polygon.length < 3) return [];
    const overlaps: string[] = [];
    for (const z of otherPolygons) {
      const other = z.polygon || [];
      if (polygonsOverlap(polygon, other)) overlaps.push(z.name || 'Unnamed zone');
    }
    return overlaps;
  }, [otherPolygons, polygon, zoneType]);

  const merchantPoint = useMemo(() => {
    if (merchantLat === null || merchantLng === null) return null;
    return { lat: merchantLat, lng: merchantLng } as LatLng;
  }, [merchantLat, merchantLng]);

  const polygonIncludesMerchant = useMemo(() => {
    if (!merchantPoint) return null;
    if (zoneType !== 'POLYGON' || !polygon || polygon.length < 3) return null;
    return isPointInPolygon(merchantPoint, polygon);
  }, [merchantPoint, polygon, zoneType]);

  const maxDistanceConflicts = useMemo(() => {
    const maxKm = deliveryMaxDistanceKm ?? null;
    if (!maxKm || maxKm <= 0) return { radiusTooLarge: false, polygonTooLarge: false, maxVertexKm: null as number | null };

    if (!merchantPoint) return { radiusTooLarge: false, polygonTooLarge: false, maxVertexKm: null as number | null };

    const radiusTooLarge = zoneType === 'RADIUS' && Number.isFinite(radiusKm) && radiusKm > maxKm;

    if (zoneType !== 'POLYGON' || !polygon || polygon.length < 3) {
      return { radiusTooLarge, polygonTooLarge: false, maxVertexKm: null as number | null };
    }

    let maxVertexKm = 0;
    for (const p of polygon) {
      const d = haversineDistanceKm(merchantPoint, p);
      if (d > maxVertexKm) maxVertexKm = d;
    }

    const polygonTooLarge = maxVertexKm > maxKm;

    return { radiusTooLarge, polygonTooLarge, maxVertexKm };
  }, [deliveryMaxDistanceKm, merchantPoint, polygon, radiusKm, zoneType]);

  return (
    <div className="h-105 w-full">
      <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler
          zoneType={zoneType}
          onAddPolygonPoint={(p) => onPolygonChange([...(polygon || []), p])}
        />

        {merchantLat !== null && merchantLng !== null && <Marker position={[merchantLat, merchantLng]} icon={markerIcon} />}

        {otherPolygonPositions.map((z) => (
          <Polygon
            key={z.id}
            positions={z.positions}
            pathOptions={{ color: '#9ca3af', fillColor: '#9ca3af', fillOpacity: 0.05, weight: 2 }}
          />
        ))}

        {zoneType === 'RADIUS' && merchantLat !== null && merchantLng !== null && (
          <Circle
            center={[merchantLat, merchantLng]}
            radius={Math.max(0, radiusKm) * 1000}
            pathOptions={{ color: '#f05a28', fillColor: '#f05a28', fillOpacity: 0.15 }}
          />
        )}

        {zoneType === 'POLYGON' && polygonPositions.length >= 2 && (
          <Polygon
            positions={polygonPositions}
            pathOptions={{ color: '#f05a28', fillColor: '#f05a28', fillOpacity: 0.15 }}
          />
        )}
      </MapContainer>

      {zoneType === 'POLYGON' && (
        <div className="space-y-1 border-t border-gray-200 bg-white px-4 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          <div>Click map to add polygon points. Minimum 3 points.</div>
          {polygonIncludesMerchant === false && (
            <div className="text-warning-700 dark:text-warning-300">Warning: polygon does not include the merchant pin.</div>
          )}
          {maxDistanceConflicts.polygonTooLarge && (
            <div className="text-warning-700 dark:text-warning-300">
              Warning: polygon extends beyond Max Distance ({(deliveryMaxDistanceKm ?? 0).toFixed(2)} km). Farthest vertex is {Math.max(0, maxDistanceConflicts.maxVertexKm ?? 0).toFixed(2)} km.
            </div>
          )}
          {overlapNames.length > 0 && (
            <div className="text-warning-700 dark:text-warning-300">
              Warning: polygon overlaps {overlapNames.length} existing zone{overlapNames.length === 1 ? '' : 's'} ({overlapNames.join(', ')}).
            </div>
          )}
        </div>
      )}

      {zoneType === 'RADIUS' && (
        <div className="space-y-1 border-t border-gray-200 bg-white px-4 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          <div>Radius zone uses merchant location as center.</div>
          {(merchantLat === null || merchantLng === null) && (
            <div className="text-warning-700 dark:text-warning-300">Merchant latitude/longitude is missing. Radius zones cannot be saved until location is set.</div>
          )}
          {maxDistanceConflicts.radiusTooLarge && (
            <div className="text-warning-700 dark:text-warning-300">
              Warning: radius ({Math.max(0, radiusKm).toFixed(2)} km) is greater than Max Distance ({(deliveryMaxDistanceKm ?? 0).toFixed(2)} km). Deliveries may still be rejected by Max Distance.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
