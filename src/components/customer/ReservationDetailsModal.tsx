'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation, tOr } from '@/lib/i18n/useTranslation';
import { saveReservationDetails, getReservationDetails } from '@/lib/utils/localStorage';
import { FaTimes } from 'react-icons/fa';

export type ReservationDetails = {
  partySize: number;
  reservationDate: string; // YYYY-MM-DD (merchant timezone)
  reservationTime: string; // HH:MM (merchant timezone)
};

function isValidYYYYMMDD(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidHHMM(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function getTodayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getNowHHMMInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

interface ReservationDetailsModalProps {
  merchantCode: string;
  merchantTimezone: string;
  isOpen: boolean;
  onConfirm: (details: ReservationDetails) => void;
  onClose?: () => void;
  dismissable?: boolean;
}

/**
 * Reservation Details Modal (Bottom Sheet)
 *
 * Required step for reservation ordering flow:
 * - Party size
 * - Reservation date (today or future)
 * - Reservation time
 */
export default function ReservationDetailsModal({
  merchantCode,
  merchantTimezone,
  isOpen,
  onConfirm,
  onClose,
  dismissable = false,
}: ReservationDetailsModalProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const today = useMemo(() => getTodayInTimezone(merchantTimezone || 'Australia/Sydney'), [merchantTimezone]);

  const [partySize, setPartySize] = useState<number>(2);
  const [reservationDate, setReservationDate] = useState<string>('');
  const [reservationTime, setReservationTime] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const saved = getReservationDetails(merchantCode);
    if (saved) {
      setPartySize(saved.partySize);
      setReservationDate(saved.reservationDate);
      setReservationTime(saved.reservationTime);
      return;
    }

    setReservationDate('');
    setReservationTime('');
    setPartySize(2);
  }, [isOpen, merchantCode]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      if (dismissable && onClose) {
        onClose();
        return;
      }

      router.replace(`/${merchantCode}`);
    }, 250);
  };

  const handleConfirm = () => {
    setError('');

    const size = Number(partySize);
    if (!Number.isFinite(size) || size < 1 || size > 100) {
      setError(tOr(t, 'customer.reservationDetails.partySizeInvalid', 'Party size must be between 1 and 100.'));
      return;
    }

    if (!reservationDate || !isValidYYYYMMDD(reservationDate)) {
      setError(tOr(t, 'customer.reservationDetails.dateRequired', 'Reservation date is required.'));
      return;
    }

    if (!reservationTime || !isValidHHMM(reservationTime)) {
      setError(tOr(t, 'customer.reservationDetails.timeRequired', 'Reservation time must be HH:MM.'));
      return;
    }

    // Allow same-day reservations, but time must be in the future (merchant timezone).
    if (reservationDate < today) {
      setError(tOr(t, 'customer.reservationDetails.pastDate', 'Reservation date cannot be in the past.'));
      return;
    }

    if (reservationDate === today) {
      const nowHHMM = getNowHHMMInTimezone(merchantTimezone || 'Australia/Sydney');
      if (reservationTime <= nowHHMM) {
        setError(tOr(t, 'customer.reservationDetails.futureTimeOnly', 'Reservation time must be in the future.'));
        return;
      }
    }

    const details: ReservationDetails = {
      partySize: size,
      reservationDate,
      reservationTime,
    };

    saveReservationDetails(merchantCode, details);
    onConfirm(details);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      {dismissable ? (
        <button
          type="button"
          onClick={handleClose}
          aria-label={tOr(t, 'common.close', 'Close')}
          className={`fixed inset-0 bg-black/50 z-1000 transition-opacity duration-250 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
        />
      ) : (
        <div
          className={`fixed inset-0 bg-black/50 z-1000 transition-opacity duration-250 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
        />
      )}

      {/* Bottom Sheet */}
      <div className={`fixed inset-x-0 bottom-0 z-1000 flex justify-center ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}>
        <div className="w-full max-w-125 bg-white rounded-t-2xl shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900" style={{ margin: 0, lineHeight: 'normal' }}>
              {tOr(t, 'customer.reservationDetails.title', 'Reservation Details')}
            </h2>
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors"
              aria-label={tOr(t, 'common.close', 'Close')}
              type="button"
            >
              <FaTimes className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          <div className="px-4 py-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {tOr(t, 'customer.reservationDetails.partySizeLabel', 'Number of people')}<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
                className="w-full h-12 px-4 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-900">
                  {tOr(t, 'customer.reservationDetails.dateLabel', 'Date')}<span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setReservationDate(today);
                    setError('');
                  }}
                  className="text-xs font-medium text-orange-600 hover:text-orange-700"
                >
                  {tOr(t, 'common.time.today', 'Today')}
                </button>
              </div>
              <input
                type="date"
                value={reservationDate}
                min={today}
                onChange={(e) => setReservationDate(e.target.value)}
                className="w-full h-12 px-4 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {tOr(t, 'customer.reservationDetails.futureNote', 'Choose a date and time in the future.')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {tOr(t, 'customer.reservationDetails.timeLabel', 'Time')}<span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={reservationTime}
                onChange={(e) => setReservationTime(e.target.value)}
                className="w-full h-12 px-4 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="px-4 pb-4">
            <button
              onClick={handleConfirm}
              className="w-full h-12 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 transition-colors"
              type="button"
            >
              {tOr(t, 'common.continue', 'Continue')}
            </button>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes slideDown {
          from { transform: translateY(0); }
          to { transform: translateY(100%); }
        }
        .animate-fadeIn { animation: fadeIn 250ms ease-out forwards; }
        .animate-fadeOut { animation: fadeOut 250ms ease-out forwards; }
        .animate-slideUp { animation: slideUp 250ms ease-out forwards; }
        .animate-slideDown { animation: slideDown 250ms ease-out forwards; }
      `}</style>
    </>
  );
}
