/**
 * Delivery Address & Map Picker Component
 * Used in customer payment page for delivery order mode
 */

'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { FaExclamationTriangle, FaInfoCircle, FaMapMarkerAlt, FaMagic, FaMapMarkedAlt, FaHome, FaCrosshairs, FaBuilding, FaLayerGroup, FaStickyNote, FaSearch } from 'react-icons/fa';

type MapLike = {
  setView: (center: [number, number], zoom: number) => void;
  getZoom: () => number;
};

const DeliveryMapClient = dynamic(() => import('@/components/delivery/DeliveryMap.client'), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center bg-gray-50 text-sm text-gray-500">Loading map…</div>,
});

type AddressParts = {
  streetLine?: string | null;
  neighbourhood?: string | null;
  suburb?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
};

interface DeliveryAddressPickerProps {
  onAddressChange: (address: string) => void;
  onCoordinatesChange: (latitude: number, longitude: number) => void;
  onAddressPartsChange?: (parts: AddressParts | null) => void;
  onUnitChange?: (unit: string) => void;
  onBuildingNameChange?: (buildingName: string) => void;
  onBuildingNumberChange?: (buildingNumber: string) => void;
  onFloorChange?: (floor: string) => void;
  onInstructionsChange?: (instructions: string) => void;
  deliveryAddress: string;
  deliveryUnit?: string;
  deliveryBuildingName?: string;
  deliveryBuildingNumber?: string;
  deliveryFloor?: string;
  deliveryInstructions?: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  merchantLatitude?: number | null;
  merchantLongitude?: number | null;
  isLoading?: boolean;
  error?: string;
}

/**
 * Delivery Address and Map Picker Component
 */
export default function DeliveryAddressPicker({
  onAddressChange,
  onCoordinatesChange,
  onAddressPartsChange,
  onUnitChange,
  onBuildingNameChange,
  onBuildingNumberChange,
  onFloorChange,
  onInstructionsChange,
  deliveryAddress,
  deliveryUnit = '',
  deliveryBuildingName = '',
  deliveryBuildingNumber = '',
  deliveryFloor = '',
  deliveryInstructions = '',
  deliveryLatitude,
  deliveryLongitude,
  merchantLatitude = null,
  merchantLongitude = null,
  isLoading = false,
  error = '',
}: DeliveryAddressPickerProps) {
  const { t } = useTranslation();
  const mapRef = useRef<MapLike | null>(null);

  const [addressType, setAddressType] = useState<'HOUSE' | 'BUILDING'>(() => {
    const hasBuildingHints =
      String(deliveryUnit || '').trim().length > 0 ||
      String(deliveryBuildingName || '').trim().length > 0 ||
      String(deliveryFloor || '').trim().length > 0;
    return hasBuildingHints ? 'BUILDING' : 'HOUSE';
  });

  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(
    deliveryLatitude !== null && deliveryLongitude !== null ? { lat: deliveryLatitude, lng: deliveryLongitude } : null
  );
  const [addressInput, setAddressInput] = useState(deliveryAddress);
  const [isAddressDirty, setIsAddressDirty] = useState(false);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const geocodeTimerRef = useRef<number | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string>('');
  const [resolvedParts, setResolvedParts] = useState<AddressParts | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const mapCenter = useMemo<[number, number]>(() => {
    if (markerPosition) return [markerPosition.lat, markerPosition.lng];
    if (merchantLatitude !== null && merchantLongitude !== null) return [merchantLatitude, merchantLongitude];
    return [-33.8688, 151.2093]; // Default to Sydney
  }, [markerPosition, merchantLatitude, merchantLongitude]);

  // Update marker when coordinates change
  useEffect(() => {
    if (deliveryLatitude !== null && deliveryLongitude !== null) {
      setMarkerPosition({ lat: deliveryLatitude, lng: deliveryLongitude });
    }
  }, [deliveryLatitude, deliveryLongitude]);

  const handleLocationSelect = (lat: number, lng: number) => {
    setMarkerPosition({ lat, lng });
    onCoordinatesChange(lat, lng);
  };

  const handleUseMyLocation = () => {
    setLocationError('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError(t('customer.delivery.locationUnsupported') || 'Location is not supported on this device');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        handleLocationSelect(lat, lng);
        mapRef.current?.setView([lat, lng], Math.max(mapRef.current.getZoom(), 15));
        requestReverseGeocode(lat, lng);
        setIsLocating(false);
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? (t('customer.delivery.locationPermissionDenied') || 'Location permission denied')
            : (t('customer.delivery.locationUnavailable') || 'Unable to get your location');
        setLocationError(message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleAddressChange = (newAddress: string) => {
    setAddressInput(newAddress);
    setIsAddressDirty(true);
    onAddressChange(newAddress);
    setSearchError('');
  };

  const requestReverseGeocode = async (lat: number, lng: number) => {
    setGeocodeError('');
    geocodeAbortRef.current?.abort();
    const controller = new AbortController();
    geocodeAbortRef.current = controller;

    setIsGeocoding(true);
    try {
      const res = await fetch(`/api/public/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`, {
        signal: controller.signal,
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to resolve address');
      }

      const formattedAddress = String(json?.data?.formattedAddress || '').trim();
      const displayName = String(json?.data?.displayName || '').trim();
      const nextAddress = formattedAddress || displayName;

      const parts = (json?.data?.parts || null) as AddressParts | null;
      setResolvedParts(parts);
      onAddressPartsChange?.(parts);

      if (nextAddress) {
        setAddressInput(nextAddress);
        onAddressChange(nextAddress);
        setIsAddressDirty(false);
      }
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        setGeocodeError((e as Error).message || 'Failed to resolve address');
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleFindOnMap = async () => {
    const q = addressInput.trim();
    setSearchError('');

    if (!q) {
      setSearchError(t('customer.delivery.searchRequired') || 'Please enter an address to search');
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/public/geocode/forward?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to search address');
      }

      const results = (json?.data?.results || []) as Array<{
        lat: number;
        lng: number;
        formattedAddress?: string;
        displayName?: string;
        parts?: AddressParts | null;
      }>;

      const first = results[0];
      if (!first || !Number.isFinite(first.lat) || !Number.isFinite(first.lng)) {
        setSearchError(t('customer.delivery.searchNoResults') || 'No results found. Try a more specific address.');
        return;
      }

      handleLocationSelect(first.lat, first.lng);
      mapRef.current?.setView([first.lat, first.lng], Math.max(mapRef.current.getZoom(), 15));

      const nextAddress = String(first.formattedAddress || first.displayName || '').trim();
      if (nextAddress) {
        setAddressInput(nextAddress);
        onAddressChange(nextAddress);
        setIsAddressDirty(false);
      }

      const parts = (first.parts || null) as AddressParts | null;
      setResolvedParts(parts);
      onAddressPartsChange?.(parts);
    } catch (e) {
      setSearchError((e as Error).message || (t('customer.delivery.searchError') || 'Failed to search address'));
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    return () => {
      geocodeAbortRef.current?.abort();
      if (geocodeTimerRef.current) {
        window.clearTimeout(geocodeTimerRef.current);
        geocodeTimerRef.current = null;
      }
    };
  }, []);

  // Auto reverse-geocode when a pin is selected (only if user hasn't manually typed an address)
  useEffect(() => {
    if (!markerPosition) return;
    if (isAddressDirty && addressInput.trim().length > 0) return;

    if (geocodeTimerRef.current) {
      window.clearTimeout(geocodeTimerRef.current);
    }

    geocodeTimerRef.current = window.setTimeout(() => {
      requestReverseGeocode(markerPosition.lat, markerPosition.lng);
    }, 600);

    return () => {
      if (geocodeTimerRef.current) {
        window.clearTimeout(geocodeTimerRef.current);
        geocodeTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerPosition?.lat, markerPosition?.lng]);

  return (
    <div className="w-full">
      {/* Address Type */}
      <label className="block mb-2 font-medium" style={{ fontSize: '14px', color: '#212529' }}>
        {t('customer.delivery.addressType') || 'Address type'}
      </label>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setAddressType('HOUSE')}
          className={`px-3 py-2 rounded-lg border text-sm ${
            addressType === 'HOUSE'
              ? 'border-[#f05a28] bg-[#f05a28]/10 text-[#f05a28]'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('customer.delivery.addressTypeHouse') || 'House'}
        </button>
        <button
          type="button"
          onClick={() => setAddressType('BUILDING')}
          className={`px-3 py-2 rounded-lg border text-sm ${
            addressType === 'BUILDING'
              ? 'border-[#f05a28] bg-[#f05a28]/10 text-[#f05a28]'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('customer.delivery.addressTypeBuilding') || 'Apartment / Building'}
        </button>
      </div>

      {/* Unit / Apartment */}
      {addressType === 'BUILDING' ? (
        <>
          <label htmlFor="deliveryUnit" className="block mb-1 font-medium" style={{ fontSize: '14px', color: '#212529' }}>
            {t('customer.delivery.unit') || 'Apartment / Unit'}
          </label>
          <div className="relative mb-3">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <FaHome className="w-5 h-5" />
            </div>
            <input
              id="deliveryUnit"
              type="text"
              maxLength={40}
              value={deliveryUnit}
              onChange={(e) => onUnitChange?.(e.target.value)}
              placeholder={t('customer.delivery.unitPlaceholder') || 'e.g. Unit 12, Apt 5B'}
              className="w-full h-12 pl-11 pr-4 border-2 rounded-xl text-sm focus:outline-none transition-colors border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28] bg-white"
            />
          </div>
        </>
      ) : null}

      {/* Building / Floor (optional) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {addressType === 'BUILDING' ? (
        <div>
          <label htmlFor="deliveryBuildingName" className="block mb-1 font-medium" style={{ fontSize: '14px', color: '#212529' }}>
            {t('customer.delivery.buildingName') || 'Building Name'}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <FaBuilding className="w-5 h-5" />
            </div>
            <input
              id="deliveryBuildingName"
              type="text"
              maxLength={30}
              value={deliveryBuildingName}
              onChange={(e) => onBuildingNameChange?.(e.target.value)}
              placeholder={t('customer.delivery.buildingNamePlaceholder') || 'e.g. Tower A'}
              className="w-full h-12 pl-11 pr-4 border-2 rounded-xl text-sm focus:outline-none transition-colors border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28] bg-white"
            />
          </div>
        </div>
        ) : null}

        <div>
          <label htmlFor="deliveryBuildingNumber" className="block mb-1 font-medium" style={{ fontSize: '14px', color: '#212529' }}>
            {addressType === 'HOUSE'
              ? (t('customer.delivery.houseNumber') || 'House Number')
              : (t('customer.delivery.buildingNumber') || 'Building Number')}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <FaBuilding className="w-5 h-5" />
            </div>
            <input
              id="deliveryBuildingNumber"
              type="text"
              maxLength={10}
              value={deliveryBuildingNumber}
              onChange={(e) => onBuildingNumberChange?.(e.target.value)}
              placeholder={addressType === 'HOUSE'
                ? (t('customer.delivery.houseNumberPlaceholder') || 'e.g. 21')
                : (t('customer.delivery.buildingNumberPlaceholder') || 'e.g. 21')}
              className="w-full h-12 pl-11 pr-4 border-2 rounded-xl text-sm focus:outline-none transition-colors border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28] bg-white"
            />
          </div>
        </div>

        {addressType === 'BUILDING' ? (
        <div>
          <label htmlFor="deliveryFloor" className="block mb-1 font-medium" style={{ fontSize: '14px', color: '#212529' }}>
            {t('customer.delivery.floor') || 'Floor'}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <FaLayerGroup className="w-5 h-5" />
            </div>
            <input
              id="deliveryFloor"
              type="text"
              maxLength={10}
              value={deliveryFloor}
              onChange={(e) => onFloorChange?.(e.target.value)}
              placeholder={t('customer.delivery.floorPlaceholder') || 'e.g. 5'}
              className="w-full h-12 pl-11 pr-4 border-2 rounded-xl text-sm focus:outline-none transition-colors border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28] bg-white"
            />
          </div>
        </div>
        ) : null}
      </div>

      {/* Delivery Instructions */}
      <label htmlFor="deliveryInstructions" className="block mb-1 font-medium" style={{ fontSize: '14px', color: '#212529' }}>
        {t('customer.delivery.instructions') || 'Delivery Instructions'}
      </label>
      <div className="relative mb-4">
        <div className="absolute left-3 top-3 text-gray-400">
          <FaStickyNote className="w-5 h-5" />
        </div>
        <textarea
          id="deliveryInstructions"
          value={deliveryInstructions}
          onChange={(e) => onInstructionsChange?.(e.target.value)}
          placeholder={t('customer.delivery.instructionsPlaceholder') || 'e.g. Call when arrived, leave at reception'}
          maxLength={300}
          rows={3}
          className="w-full pl-11 pr-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-colors border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28] bg-white"
        />
      </div>

      {/* Address Input */}
      <label
        htmlFor="deliveryAddress"
        className="block mb-1 font-medium"
        style={{ fontSize: '14px', color: '#212529' }}
      >
        {t('customer.delivery.address') || 'Delivery Address'}<span className="text-red-500">*</span>
      </label>
      <div className="relative mb-3">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <FaMapMarkerAlt className="w-5 h-5" />
        </div>
        <input
          id="deliveryAddress"
          type="text"
          required
          maxLength={200}
          value={addressInput}
          onChange={(e) => handleAddressChange(e.target.value)}
          placeholder={t('customer.delivery.addressPlaceholder') || 'Enter your delivery address'}
          className={`w-full h-12 pl-11 pr-4 border-2 rounded-xl text-sm focus:outline-none transition-colors ${
            error
              ? 'border-red-500 focus:ring-1 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28]'
          } bg-white`}
        />
      </div>

      {!!resolvedParts && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
          <div className="flex items-center gap-2 mb-1 text-gray-800">
            <FaMapMarkedAlt className="w-4 h-4 text-gray-500" />
            <span className="font-medium">{t('customer.delivery.detectedAddress') || 'Detected address'}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {resolvedParts.streetLine ? (
              <div className="col-span-2">
                <span className="text-gray-500">{t('customer.delivery.street') || 'Street'}:</span> {resolvedParts.streetLine}
              </div>
            ) : null}
            {resolvedParts.suburb ? (
              <div>
                <span className="text-gray-500">{t('customer.delivery.suburb') || 'Suburb'}:</span> {resolvedParts.suburb}
              </div>
            ) : null}
            {resolvedParts.city ? (
              <div>
                <span className="text-gray-500">{t('customer.delivery.city') || 'City'}:</span> {resolvedParts.city}
              </div>
            ) : null}
            {resolvedParts.state ? (
              <div>
                <span className="text-gray-500">{t('customer.delivery.state') || 'State'}:</span> {resolvedParts.state}
              </div>
            ) : null}
            {resolvedParts.postcode ? (
              <div>
                <span className="text-gray-500">{t('customer.delivery.postcode') || 'Postcode'}:</span> {resolvedParts.postcode}
              </div>
            ) : null}
            {resolvedParts.country ? (
              <div className="col-span-2">
                <span className="text-gray-500">{t('customer.delivery.country') || 'Country'}:</span> {resolvedParts.country}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="inline-flex items-center gap-2">
            <FaCrosshairs className="w-4 h-4" />
            {isLocating ? (t('customer.delivery.locating') || 'Locating...') : (t('customer.delivery.useMyLocation') || 'Use my location')}
          </span>
        </button>

        <button
          type="button"
          onClick={handleFindOnMap}
          disabled={isSearching}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="inline-flex items-center gap-2">
            <FaSearch className="w-4 h-4" />
            {isSearching ? (t('customer.delivery.searching') || 'Searching...') : (t('customer.delivery.findOnMap') || 'Find on map')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => markerPosition && requestReverseGeocode(markerPosition.lat, markerPosition.lng)}
          disabled={!markerPosition || isGeocoding}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="inline-flex items-center gap-2">
            <FaMagic className="w-4 h-4" />
            {isGeocoding ? (t('common.loading') || 'Loading...') : (t('customer.delivery.autofillAddress') || 'Auto-fill from pin')}
          </span>
        </button>
        {(geocodeError || locationError) && <span className="text-sm text-red-600">{geocodeError || locationError}</span>}
      </div>

      {!!searchError && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <div className="flex items-start gap-2">
            <FaExclamationTriangle className="mt-0.5 h-4 w-4" />
            <span>{searchError}</span>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="mb-3">
        <label className="block mb-2 font-medium" style={{ fontSize: '14px', color: '#212529' }}>
          {t('customer.delivery.pickLocation') || 'Pick Location on Map'}<span className="text-red-500">*</span>
        </label>
        <div className="relative z-0 rounded-xl overflow-hidden border-2 border-gray-200" style={{ height: '300px' }}>
          <DeliveryMapClient
            center={mapCenter}
            markerPosition={markerPosition}
            addressLabel={addressInput}
            onLocationSelect={handleLocationSelect}
            onMapReady={(map: any) => {
              mapRef.current = map;
            }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-2">
          <span className="inline-flex items-center gap-2">
            <FaInfoCircle className="w-4 h-4 text-gray-500" />
            {t('customer.delivery.mapHint') || 'Click on the map to select your delivery location'}
          </span>
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border-l-4 border-red-500 mb-3">
          <FaExclamationTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500">
          <svg className="animate-spin w-4 h-4 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm text-blue-700">{t('common.calculating') || 'Calculating fee...'}</span>
        </div>
      )}
    </div>
  );
}
