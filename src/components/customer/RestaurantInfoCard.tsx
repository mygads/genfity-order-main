/**
 * Restaurant Info Card Component - Burjo ESB Style
 * 
 * @description
 * Display merchant information with opening hours
 * Matches Burjo ESB reference:
 * - Border: 0.66px solid #E6E6E6
 * - Border Radius: 16px
 * - Shadow: 0 2px 8px rgba(0,0,0,0.08)
 * - Store name: 16px, weight 700, #212529
 * - Business hours: 14px, #666
 * 
 * @specification Burjo ESB Reference
 */

'use client';

import { ChevronRight } from 'lucide-react';

interface OpeningHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface RestaurantInfoCardProps {
  name: string;
  openingHours: OpeningHour[];
  onClick?: () => void;
}

export default function RestaurantInfoCard({ name, openingHours, onClick }: RestaurantInfoCardProps) {
  // Calculate merchant status
  const getMerchantStatus = (): string => {
    if (!openingHours || openingHours.length === 0) {
      return 'Unknown hours';
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    const todayHours = openingHours.find(h => h.dayOfWeek === currentDay);

    if (!todayHours || todayHours.isClosed) {
      return 'Closed today';
    }

    const { openTime, closeTime } = todayHours;

    // Format time for display
    const formatTime = (time: string): string => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${period}`;
    };

    return `Open today, ${formatTime(openTime)}-${formatTime(closeTime)}`;
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between cursor-pointer transition-all duration-200 hover:shadow-md"
      style={{
        backgroundColor: '#ffffff',
        border: '0.66px solid #E6E6E6',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        fontFamily: 'Inter, sans-serif',
      }}
      role="button"
      tabIndex={0}
      aria-label={`${name} information`}
    >
      <div>
        <h2
          className="font-bold"
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#212529',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {name}
        </h2>
        <p
          style={{
            fontSize: '14px',
            color: '#666666',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {getMerchantStatus()}
        </p>
      </div>
      <ChevronRight style={{ color: '#999999', flexShrink: 0 }} width="20" height="20" />
    </div>
  );
}

