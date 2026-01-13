'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { BoxIcon, DownloadIcon, FileIcon, PlusIcon, PencilIcon, TrashBinIcon } from '@/icons';

import type { TranslationKeys } from '@/lib/i18n';

const ZoneEditorMap = dynamic(() => import('@/components/merchants/delivery/ZoneEditorMap'), {
  ssr: false,
});

const MapLocationPicker = dynamic(() => import('@/components/maps/MapLocationPicker'), { ssr: false });

type MerchantDeliveryFormFields = {
  code: string;
  currency: string;
  latitude: number | null;
  longitude: number | null;
  isDeliveryEnabled: boolean;
  enforceDeliveryZones: boolean;
  deliveryMaxDistanceKm: number | null;
  deliveryFeeBase: number;
  deliveryFeePerKm: number;
  deliveryFeeMin: number | null;
  deliveryFeeMax: number | null;
};

type MerchantFormData = Record<string, unknown> & MerchantDeliveryFormFields;

type DeliveryZoneType = 'RADIUS' | 'POLYGON';

type LatLng = { lat: number; lng: number };

type DeliveryZone = {
  id: string;
  name: string;
  type: DeliveryZoneType;
  radiusKm: number | null;
  polygon: LatLng[] | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ToastFn = (title: string, message: string, duration?: number) => void;

function keyOrFallback<T extends string>(key: TranslationKeys, fallback: T, t: (k: TranslationKeys) => string): string {
  const val = t(key);
  return val === key ? fallback : val;
}

function ZoneListSkeleton() {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="grid grid-cols-12 items-center px-4 py-3">
          <div className="col-span-5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="col-span-3">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="col-span-2">
            <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <div className="h-9 w-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="h-9 w-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DeliverySettingsTab({
  authToken,
  formData,
  setFormData,
  showSuccess,
  showError,
}: {
  authToken: string;
  formData: MerchantFormData;
  setFormData: (updater: (prev: MerchantFormData) => MerchantFormData) => void;
  showSuccess: ToastFn;
  showError: ToastFn;
}) {
  const { t } = useTranslation();

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);

  const importFileRef = useRef<HTMLInputElement | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportError, setBulkImportError] = useState<string>('');
  const [replaceOnImport, setReplaceOnImport] = useState<boolean>(false);
  const [undoGeoJson, setUndoGeoJson] = useState<any>(null);
  const [undoAvailable, setUndoAvailable] = useState<boolean>(false);

  const [previewPoint, setPreviewPoint] = useState<LatLng | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<
    | {
        isCovered: boolean;
        distanceKm?: number;
        feeAmount?: number;
        errorCode?: string;
        message?: string;
      }
    | null
  >(null);

  const [showZoneModal, setShowZoneModal] = useState(false);
  const [savingZone, setSavingZone] = useState(false);
  const [zoneFormError, setZoneFormError] = useState<string>('');

  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneType, setZoneType] = useState<DeliveryZoneType>('POLYGON');
  const [zoneActive, setZoneActive] = useState(true);
  const [zoneRadiusKm, setZoneRadiusKm] = useState<number>(3);
  const [zonePolygon, setZonePolygon] = useState<LatLng[]>([]);

  const merchantHasLocation = formData.latitude !== null && formData.longitude !== null;

  const canEnableDelivery = merchantHasLocation;

  const fetchZones = useCallback(async () => {
    if (!authToken) return;

    setZonesLoading(true);
    try {
      const res = await fetch('/api/merchant/delivery/zones', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to load delivery zones');
      }
      setZones((json.data || []) as DeliveryZone[]);
    } catch (e) {
      showError('Error', (e as Error).message || 'Failed to load delivery zones');
    } finally {
      setZonesLoading(false);
    }
  }, [authToken, showError]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const runPreviewQuote = async () => {
    setPreviewError('');
    setPreviewResult(null);

    if (!previewPoint || !Number.isFinite(previewPoint.lat) || !Number.isFinite(previewPoint.lng)) {
      setPreviewError('Pick a location on the map first');
      return;
    }

    if (!formData.code) {
      setPreviewError('Merchant code is missing');
      return;
    }

    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/public/merchants/${encodeURIComponent(formData.code)}/delivery/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude: previewPoint.lat, longitude: previewPoint.lng }),
      });
      const json = await res.json();

      if (res.ok && json?.success) {
        setPreviewResult({
          isCovered: true,
          distanceKm: Number(json.data?.distanceKm ?? 0),
          feeAmount: Number(json.data?.feeAmount ?? 0),
        });
        return;
      }

      // Treat delivery validation failures as a "not covered" result, not a hard error.
      const errorCode = String(json?.error || 'VALIDATION_ERROR');
      const message = String(json?.message || 'Not covered');
      setPreviewResult({
        isCovered: false,
        errorCode,
        message,
      });
    } catch (e) {
      setPreviewError((e as Error).message || 'Failed to preview delivery quote');
    } finally {
      setPreviewLoading(false);
    }
  };

  const formatMoney = (amount: number) => {
    const currency = formData.currency || 'USD';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  type GeoJsonFeatureCollection = {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      geometry: null | { type: string; coordinates: any };
      properties?: Record<string, unknown>;
    }>;
  };

  const buildZonesGeoJson = (zonesToExport: DeliveryZone[]): GeoJsonFeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: zonesToExport.map((z) => {
        if (z.type === 'POLYGON' && z.polygon && z.polygon.length >= 3) {
          const coords = z.polygon.map((p) => [p.lng, p.lat]);
          const first = coords[0];
          const last = coords[coords.length - 1];
          if (!last || !first || last[0] !== first[0] || last[1] !== first[1]) {
            coords.push(first);
          }

          return {
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon',
              coordinates: [coords],
            },
            properties: {
              zoneType: 'POLYGON',
              name: z.name,
              isActive: z.isActive,
            },
          };
        }

        const radiusGeometry =
          formData.latitude !== null && formData.longitude !== null
            ? { type: 'Point', coordinates: [formData.longitude, formData.latitude] }
            : null;

        return {
          type: 'Feature' as const,
          geometry: radiusGeometry,
          properties: {
            zoneType: 'RADIUS',
            name: z.name,
            isActive: z.isActive,
            radiusKm: z.radiusKm,
          },
        };
      }),
    };
  };

  const exportZonesGeoJson = () => {
    const fc = buildZonesGeoJson(zones);

    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.code || 'merchant'}-delivery-zones.geojson`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const parsePolygonFromGeoJson = (geometry: any): LatLng[] | null => {
    if (!geometry || geometry.type !== 'Polygon') return null;
    const ring = geometry.coordinates?.[0];
    if (!Array.isArray(ring) || ring.length < 4) return null;

    const points: LatLng[] = [];
    for (const coord of ring) {
      if (!Array.isArray(coord) || coord.length < 2) return null;
      const lng = Number(coord[0]);
      const lat = Number(coord[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      points.push({ lat, lng });
    }

    // Drop closing point if it repeats first
    if (points.length >= 2) {
      const first = points[0];
      const last = points[points.length - 1];
      if (first.lat === last.lat && first.lng === last.lng) {
        points.pop();
      }
    }

    return points.length >= 3 ? points : null;
  };

  const importZonesGeoJson = async (file: File) => {
    setBulkImportError('');
    setBulkImporting(true);

    try {
      const text = await file.text();
      const json = JSON.parse(text) as GeoJsonFeatureCollection;
      if (!json || json.type !== 'FeatureCollection' || !Array.isArray(json.features)) {
        throw new Error('Invalid GeoJSON: expected FeatureCollection');
      }

      const backup = buildZonesGeoJson(zones);

      const confirmMsg = replaceOnImport
        ? `Import ${json.features.length} zones and replace ${zones.length} existing zones?`
        : `Import ${json.features.length} zones from GeoJSON?`;

      const ok = confirm(confirmMsg);
      if (!ok) return;

      setUndoGeoJson(backup);
      setUndoAvailable(false);

      const res = await fetch('/api/merchant/delivery/zones/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          geojson: json,
          replaceExisting: replaceOnImport,
        }),
      });

      const apiJson = await res.json();
      if (!res.ok || !apiJson?.success) {
        throw new Error(apiJson?.message || 'Failed to import zones');
      }

      setZones((apiJson.data?.zones || []) as DeliveryZone[]);
      setUndoAvailable(true);
      showSuccess('Success', `Imported ${Number(apiJson.data?.importedCount ?? json.features.length)} zones`);
    } catch (e) {
      const msg = (e as Error).message || 'Failed to import GeoJSON';
      setBulkImportError(msg);
      showError('Error', msg);
    } finally {
      setBulkImporting(false);
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  const undoLastImport = async () => {
    if (!undoGeoJson) return;
    const ok = confirm('Undo last import? This will restore the previous zone list.');
    if (!ok) return;

    setBulkImportError('');
    setBulkImporting(true);
    try {
      const res = await fetch('/api/merchant/delivery/zones/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          geojson: undoGeoJson,
          replaceExisting: true,
        }),
      });
      const apiJson = await res.json();
      if (!res.ok || !apiJson?.success) {
        throw new Error(apiJson?.message || 'Failed to undo import');
      }

      setZones((apiJson.data?.zones || []) as DeliveryZone[]);
      setUndoAvailable(false);
      showSuccess('Success', 'Restored previous zones');
    } catch (e) {
      const msg = (e as Error).message || 'Failed to undo import';
      setBulkImportError(msg);
      showError('Error', msg);
    } finally {
      setBulkImporting(false);
    }
  };

  const openCreateZone = () => {
    setEditingZone(null);
    setZoneName('');
    setZoneType('POLYGON');
    setZoneActive(true);
    setZoneRadiusKm(3);
    setZonePolygon([]);
    setZoneFormError('');
    setShowZoneModal(true);
  };

  const openEditZone = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setZoneName(zone.name || '');
    setZoneType(zone.type);
    setZoneActive(zone.isActive !== false);
    setZoneRadiusKm(zone.radiusKm ?? 3);
    setZonePolygon(zone.polygon ?? []);
    setZoneFormError('');
    setShowZoneModal(true);
  };

  const closeZoneModal = () => {
    setShowZoneModal(false);
    setZoneFormError('');
  };

  const validateZoneForm = (): string => {
    if (!zoneName.trim()) return 'Zone name is required';

    if (zoneType === 'RADIUS') {
      if (!Number.isFinite(zoneRadiusKm) || zoneRadiusKm <= 0) return 'Radius must be greater than 0';
      if (!merchantHasLocation) return 'Merchant location is required for radius zones';
      return '';
    }

    if (zoneType === 'POLYGON') {
      if (!zonePolygon || zonePolygon.length < 3) return 'Polygon needs at least 3 points';
      return '';
    }

    return 'Invalid zone type';
  };

  const saveZone = async () => {
    const err = validateZoneForm();
    if (err) {
      setZoneFormError(err);
      return;
    }

    setSavingZone(true);
    try {
      const res = await fetch('/api/merchant/delivery/zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          id: editingZone?.id,
          name: zoneName.trim(),
          type: zoneType,
          isActive: zoneActive,
          radiusKm: zoneType === 'RADIUS' ? zoneRadiusKm : null,
          polygon: zoneType === 'POLYGON' ? zonePolygon : null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to save zone');
      }

      showSuccess('Success', 'Delivery zone saved');
      closeZoneModal();
      await fetchZones();
    } catch (e) {
      showError('Error', (e as Error).message || 'Failed to save zone');
    } finally {
      setSavingZone(false);
    }
  };

  const deleteZone = async (zone: DeliveryZone) => {
    const ok = confirm(`Delete zone "${zone.name}"?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/merchant/delivery/zones?id=${encodeURIComponent(zone.id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to delete zone');
      }
      showSuccess('Success', 'Delivery zone deleted');
      await fetchZones();
    } catch (e) {
      showError('Error', (e as Error).message || 'Failed to delete zone');
    }
  };

  const deliveryHelpText = useMemo(() => {
    if (!merchantHasLocation) {
      return keyOrFallback('admin.merchant.deliveryRequiresLocation', 'Set merchant location first (Location tab) to enable delivery.', t);
    }
    return keyOrFallback('admin.merchant.deliveryHelp', 'Enable delivery and configure fees + zones for customer checkout.', t);
  }, [merchantHasLocation, t]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {keyOrFallback('admin.merchant.deliverySettings', 'Delivery Settings', t)}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{deliveryHelpText}</p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                formData.isDeliveryEnabled
                  ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-200'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
              }`}
            >
              {formData.isDeliveryEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {!merchantHasLocation && (
          <div className="mt-4 rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700 dark:border-warning-900/40 dark:bg-warning-900/10 dark:text-warning-300">
            {keyOrFallback('admin.merchant.deliveryLocationWarning', 'Delivery can’t be enabled until merchant latitude/longitude is set in the Location tab.', t)}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {keyOrFallback('admin.merchant.deliveryMaxDistanceKm', 'Max Distance (km)', t)}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0}
              value={formData.deliveryMaxDistanceKm ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  deliveryMaxDistanceKm: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              placeholder="5"
            />
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-700"
              checked={formData.enforceDeliveryZones !== false}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  enforceDeliveryZones: e.target.checked,
                }))
              }
            />
            <div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {keyOrFallback('admin.merchant.enforceDeliveryZones', 'Enforce Delivery Zones', t)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {keyOrFallback('admin.merchant.enforceDeliveryZonesDesc', 'If enabled, delivery is only allowed inside configured zones.', t)}
              </div>
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {keyOrFallback('admin.merchant.deliveryFeeBase', 'Base Fee', t)}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={formData.deliveryFeeBase ?? 0}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  deliveryFeeBase: Number(e.target.value),
                }))
              }
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              placeholder="2.00"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {keyOrFallback('admin.merchant.deliveryFeePerKm', 'Fee per km', t)}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={formData.deliveryFeePerKm ?? 0}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  deliveryFeePerKm: Number(e.target.value),
                }))
              }
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              placeholder="1.50"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {keyOrFallback('admin.merchant.deliveryFeeMin', 'Minimum Fee', t)}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={formData.deliveryFeeMin ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  deliveryFeeMin: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              placeholder="0.00"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {keyOrFallback('admin.merchant.deliveryFeeMax', 'Maximum Fee', t)}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={formData.deliveryFeeMax ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  deliveryFeeMax: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              placeholder="20.00"
            />
          </label>
        </div>

        {formData.isDeliveryEnabled && formData.enforceDeliveryZones !== false && zones.length === 0 && (
          <div className="mt-4 rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700 dark:border-warning-900/40 dark:bg-warning-900/10 dark:text-warning-300">
            {keyOrFallback('admin.merchant.deliveryNoZonesWarning', 'Zones enforcement is enabled but no zones are configured. Customers will not be able to place delivery orders.', t)}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {keyOrFallback('admin.merchant.deliveryZones', 'Delivery Zones', t)}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {keyOrFallback('admin.merchant.deliveryZonesDesc', 'Add radius or polygon zones to restrict delivery areas.', t)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={importFileRef}
              type="file"
              accept=".geojson,.json,application/geo+json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                importZonesGeoJson(file);
              }}
            />

            <button
              type="button"
              onClick={() => importFileRef.current?.click()}
              disabled={bulkImporting}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              title={keyOrFallback('admin.merchant.importGeoJson' as TranslationKeys, 'Import GeoJSON', t)}
            >
              <FileIcon className="h-4 w-4" />
              {keyOrFallback('admin.merchant.importGeoJson' as TranslationKeys, 'Import', t)}
            </button>

            <label className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 sm:flex">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-700"
                checked={replaceOnImport}
                onChange={(e) => setReplaceOnImport(e.target.checked)}
              />
              {keyOrFallback('admin.merchant.replaceExistingZones' as TranslationKeys, 'Replace existing', t)}
            </label>

            <button
              type="button"
              onClick={exportZonesGeoJson}
              disabled={zones.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              title={keyOrFallback('admin.merchant.exportGeoJson' as TranslationKeys, 'Export GeoJSON', t)}
            >
              <DownloadIcon className="h-4 w-4" />
              {keyOrFallback('admin.merchant.exportGeoJson' as TranslationKeys, 'Export', t)}
            </button>

            {undoGeoJson && (
              <button
                type="button"
                onClick={undoLastImport}
                disabled={bulkImporting || !undoAvailable}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-warning-200 bg-warning-50 px-3 text-sm font-medium text-warning-800 hover:bg-warning-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-warning-900/40 dark:bg-warning-900/10 dark:text-warning-200 dark:hover:bg-warning-900/20"
                title={keyOrFallback('admin.merchant.undoLastImport' as TranslationKeys, 'Undo last import', t)}
              >
                {keyOrFallback('admin.merchant.undoLastImport' as TranslationKeys, 'Undo', t)}
              </button>
            )}

            <button
              type="button"
              onClick={openCreateZone}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
            >
              <PlusIcon className="h-4 w-4" />
              {keyOrFallback('admin.merchant.addZone', 'Add Zone', t)}
            </button>
          </div>
        </div>

        {bulkImportError && (
          <div className="mt-4 rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-900/40 dark:bg-error-900/10 dark:text-error-300">
            {bulkImportError}
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600 dark:bg-gray-900 dark:text-gray-400">
            <div className="col-span-5">{keyOrFallback('admin.merchant.zoneName', 'Name', t)}</div>
            <div className="col-span-3">{keyOrFallback('admin.merchant.zoneType', 'Type', t)}</div>
            <div className="col-span-2">{keyOrFallback('admin.merchant.zoneStatus', 'Status', t)}</div>
            <div className="col-span-2 text-right">{keyOrFallback('admin.merchant.actions', 'Actions', t)}</div>
          </div>

          {zonesLoading ? (
            <ZoneListSkeleton />
          ) : zones.length === 0 ? (
            <div className="p-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  <BoxIcon className="h-6 w-6" />
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {keyOrFallback('admin.merchant.noZonesTitle' as TranslationKeys, 'No delivery zones yet', t)}
                </div>
                <div className="max-w-xl text-sm text-gray-500 dark:text-gray-400">
                  {keyOrFallback('admin.merchant.noZones' as TranslationKeys, 'No zones yet. Add one to start restricting delivery areas.', t)}
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={openCreateZone}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
                  >
                    <PlusIcon className="h-4 w-4" />
                    {keyOrFallback('admin.merchant.addZone', 'Add Zone', t)}
                  </button>
                  <button
                    type="button"
                    onClick={() => importFileRef.current?.click()}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <FileIcon className="h-4 w-4" />
                    {keyOrFallback('admin.merchant.importGeoJson' as TranslationKeys, 'Import GeoJSON', t)}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {zones.map((z) => (
                <div key={z.id} className="grid grid-cols-12 items-center px-4 py-3 text-sm">
                  <div className="col-span-5 font-medium text-gray-900 dark:text-white">{z.name}</div>
                  <div className="col-span-3 text-gray-700 dark:text-gray-300">{z.type}</div>
                  <div className="col-span-2">
                    <span
                      className={
                        z.isActive
                          ? 'inline-flex rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-900/20 dark:text-success-300'
                          : 'inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                      }
                    >
                      {z.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditZone(z)}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteZone(z)}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-error-600 hover:bg-error-50 dark:border-gray-800 dark:bg-gray-900 dark:text-error-300 dark:hover:bg-error-900/10"
                      title="Delete"
                    >
                      <TrashBinIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {keyOrFallback('admin.merchant.deliveryQuotePreview' as TranslationKeys, 'Preview Delivery Quote', t)}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {keyOrFallback('admin.merchant.deliveryQuotePreviewDesc' as TranslationKeys, 'Test a customer coordinate against current delivery config (fees + max distance + zones).', t)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer location</div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {previewPoint ? (
                <span>
                  {previewPoint.lat.toFixed(6)}, {previewPoint.lng.toFixed(6)}
                </span>
              ) : (
                <span className="text-gray-500">No location selected</span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPreviewError('');
                setPreviewResult(null);
                setShowPreviewModal(true);
                if (!previewPoint && formData.latitude !== null && formData.longitude !== null) {
                  setPreviewPoint({ lat: Number(formData.latitude), lng: Number(formData.longitude) });
                }
              }}
              className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Pick on map
            </button>

            <button
              type="button"
              onClick={runPreviewQuote}
              disabled={previewLoading}
              className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {previewLoading ? keyOrFallback('common.loading', 'Loading...', t) : keyOrFallback('admin.merchant.previewQuote' as TranslationKeys, 'Preview Quote', t)}
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Distance is calculated as straight-line (Haversine), not road routing.
        </div>

        {previewError && (
          <div className="mt-4 rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-900/40 dark:bg-error-900/10 dark:text-error-300">
            {previewError}
          </div>
        )}

        {previewResult && previewResult.isCovered && (
          <div className="mt-4 rounded-xl border border-success-200 bg-success-50 p-4 text-sm text-success-800 dark:border-success-900/40 dark:bg-success-900/10 dark:text-success-200">
            <div className="mb-2 font-semibold">Covered</div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div>
                <span className="font-semibold">Distance:</span> {Number(previewResult.distanceKm ?? 0).toFixed(3)} km
              </div>
              <div>
                <span className="font-semibold">Fee:</span> {formatMoney(Number(previewResult.feeAmount ?? 0))}
              </div>
            </div>
          </div>
        )}

        {previewResult && !previewResult.isCovered && (
          <div className="mt-4 rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-800 dark:border-warning-900/40 dark:bg-warning-900/10 dark:text-warning-200">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold">Not covered</div>
              {previewResult.errorCode && (
                <span className="inline-flex items-center rounded-full border border-warning-300 bg-warning-100 px-2 py-0.5 text-xs font-semibold text-warning-900 dark:border-warning-900/40 dark:bg-warning-900/20 dark:text-warning-100">
                  Reason: {previewResult.errorCode}
                </span>
              )}
            </div>
            <div>{previewResult.message || 'This location is outside the delivery coverage.'}</div>
          </div>
        )}
      </div>

      {showPreviewModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPreviewModal(false)}
          />
          <div className="relative z-10 mx-4 w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <div>
                <div className="text-base font-semibold text-gray-900 dark:text-white">Pick customer location</div>
                <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Click on the map to set a test point for quote preview.</div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>

            <div className="p-5">
              <MapLocationPicker
                latitude={previewPoint?.lat ?? (formData.latitude !== null ? Number(formData.latitude) : null)}
                longitude={previewPoint?.lng ?? (formData.longitude !== null ? Number(formData.longitude) : null)}
                onLocationChange={(lat, lng) => setPreviewPoint({ lat, lng })}
                height="420px"
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showZoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingZone
                      ? keyOrFallback('admin.merchant.editZone', 'Edit Zone', t)
                      : keyOrFallback('admin.merchant.addZone', 'Add Zone', t)}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {keyOrFallback('admin.merchant.zoneEditorHelp', 'For radius zones, distance is measured from merchant location. For polygon zones, click the map to add points.', t)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeZoneModal}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-1">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {keyOrFallback('admin.merchant.zoneName', 'Zone Name', t)}
                  </span>
                  <input
                    type="text"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                    placeholder="e.g. City Center"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {keyOrFallback('admin.merchant.zoneType', 'Zone Type', t)}
                  </span>
                  <select
                    value={zoneType}
                    onChange={(e) => setZoneType(e.target.value as DeliveryZoneType)}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="POLYGON">Polygon</option>
                    <option value="RADIUS">Radius</option>
                  </select>
                </label>

                {zoneType === 'RADIUS' && (
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {keyOrFallback('admin.merchant.radiusKm', 'Radius (km)', t)}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min={0.1}
                      value={zoneRadiusKm}
                      onChange={(e) => setZoneRadiusKm(Number(e.target.value))}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                    />
                  </label>
                )}

                <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-700"
                    checked={zoneActive}
                    onChange={(e) => setZoneActive(e.target.checked)}
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {keyOrFallback('admin.merchant.active', 'Active', t)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {keyOrFallback('admin.merchant.activeDesc', 'Inactive zones are ignored for delivery validation.', t)}
                    </div>
                  </div>
                </label>

                {zoneType === 'POLYGON' && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {keyOrFallback('admin.merchant.polygonPoints', 'Polygon Points', t)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{zonePolygon.length}</div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setZonePolygon((prev) => prev.slice(0, -1))}
                        disabled={zonePolygon.length === 0}
                        className="h-9 flex-1 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        {keyOrFallback('admin.merchant.undoPoint', 'Undo', t)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setZonePolygon([])}
                        disabled={zonePolygon.length === 0}
                        className="h-9 flex-1 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        {keyOrFallback('admin.merchant.clearPoints', 'Clear', t)}
                      </button>
                    </div>
                  </div>
                )}

                {zoneFormError && (
                  <div className="rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-900/40 dark:bg-error-900/10 dark:text-error-300">
                    {zoneFormError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeZoneModal}
                    className="h-11 flex-1 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {keyOrFallback('common.cancel', 'Cancel', t)}
                  </button>
                  <button
                    type="button"
                    onClick={saveZone}
                    disabled={savingZone}
                    className="h-11 flex-1 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingZone ? keyOrFallback('common.saving', 'Saving...', t) : keyOrFallback('common.save', 'Save', t)}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
                  <ZoneEditorMap
                    merchantLat={formData.latitude}
                    merchantLng={formData.longitude}
                    zoneType={zoneType}
                    radiusKm={zoneRadiusKm}
                    polygon={zonePolygon}
                    otherZones={zones.filter((z) => z.id !== editingZone?.id)}
                    deliveryMaxDistanceKm={formData.deliveryMaxDistanceKm}
                    onPolygonChange={setZonePolygon}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
