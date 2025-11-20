/**
 * Restaurant Info Card Component
 * 
 * @description
 * Display merchant information with opening hours
 * Clickable card that can show more details
 * 
 * @specification copilot-instructions.md - Component Reusability
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
      className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
      role="button"
      tabIndex={0}
      aria-label={`${name} information`}
    >
      <div>
        <h2 className="font-bold text-gray-900 dark:text-white">{name}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{getMerchantStatus()}</p>
      </div>
      <ChevronRight className="text-gray-400 dark:text-gray-500 flex-shrink-0" width="20" height="20" />
    </div>
  );
}
