"use client";

import React, { useState, useEffect } from "react";
import { FaClock, FaTimes } from "react-icons/fa";

interface ModeClosingBannerProps {
    mode: string;
    modeLabel?: string;
    scheduleEnd: string | null; // HH:mm format
    showThresholdMinutes?: number; // Show banner when X minutes remaining
}

/**
 * Mode Closing Warning Banner
 * 
 * Shows a warning banner when the current ordering mode is about to close.
 * - Displays countdown timer
 * - User can dismiss the banner
 * - Only shows when within threshold (default 30 min)
 */
export default function ModeClosingBanner({
    mode,
    modeLabel,
    scheduleEnd,
    showThresholdMinutes = 30,
}: ModeClosingBannerProps) {
    const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        if (!scheduleEnd || isDismissed) return;

        const calculateMinutesRemaining = () => {
            const now = new Date();
            const [endHour, endMinute] = scheduleEnd.split(":").map(Number);

            const endTime = new Date();
            endTime.setHours(endHour, endMinute, 0, 0);

            // If end time is before current time, it means the mode has already closed
            if (endTime < now) {
                return null;
            }

            const diffMs = endTime.getTime() - now.getTime();
            const diffMinutes = Math.floor(diffMs / 60000);

            return diffMinutes;
        };

        const updateRemaining = () => {
            const remaining = calculateMinutesRemaining();
            setMinutesRemaining(remaining);
        };

        // Initial calculation
        updateRemaining();

        // Update every minute
        const interval = setInterval(updateRemaining, 60000);

        return () => clearInterval(interval);
    }, [scheduleEnd, isDismissed]);

    // Don't show if:
    // - No schedule end time
    // - Already dismissed
    // - More than threshold minutes remaining
    // - Already closed (null minutes)
    if (
        !scheduleEnd ||
        isDismissed ||
        minutesRemaining === null ||
        minutesRemaining > showThresholdMinutes ||
        minutesRemaining < 0
    ) {
        return null;
    }

    const displayLabel = modeLabel || (mode === "dinein" ? "Dine In" : "Takeaway");

    // Format the remaining time
    const formatRemaining = (minutes: number) => {
        if (minutes < 1) {
            return "closing soon";
        } else if (minutes < 60) {
            return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
        } else {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            if (mins === 0) {
                return `${hours} hour${hours !== 1 ? "s" : ""}`;
            }
            return `${hours}h ${mins}m`;
        }
    };

    // Color based on urgency
    const bgColor = minutesRemaining <= 10
        ? "bg-red-50 border-red-200"
        : "bg-amber-50 border-amber-200";

    const textColor = minutesRemaining <= 10
        ? "text-red-700"
        : "text-amber-700";

    const iconColor = minutesRemaining <= 10
        ? "text-red-500"
        : "text-amber-500";

    return (
        <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border mx-4 my-2 ${bgColor}`}>
            <div className="flex items-center gap-2">
                <FaClock className={`h-4 w-4 ${iconColor}`} />
                <span className={`text-sm font-medium ${textColor}`}>
                    {displayLabel} closes in <strong>{formatRemaining(minutesRemaining)}</strong>
                </span>
            </div>
            <button
                onClick={() => setIsDismissed(true)}
                className={`p-1 rounded hover:bg-black/5 ${textColor}`}
                aria-label="Dismiss"
            >
                <FaTimes className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
