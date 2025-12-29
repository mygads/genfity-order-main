"use client";

import React from "react";
import { useGroupOrder } from "@/context/GroupOrderContext";
import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * Group Order Button
 * 
 * Displayed below mode selection on the order page.
 * Shows current group status if in a session, otherwise shows "Group Order" button.
 */
interface GroupOrderButtonProps {
    onCreateClick: () => void;
    onJoinClick: () => void;
    onViewGroupClick: () => void;
    disabled?: boolean;
}

export default function GroupOrderButton({
    onCreateClick,
    onJoinClick,
    onViewGroupClick,
    disabled = false,
}: GroupOrderButtonProps) {
    const { t } = useTranslation();
    const { isInGroupOrder, session, isHost } = useGroupOrder();

    // If in a group order, show group info instead of button
    if (isInGroupOrder && session) {
        const participantCount = session.participants.length;

        return (
            <button
                onClick={onViewGroupClick}
                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700 rounded-xl hover:shadow-md transition-all duration-200"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-xl">👥</span>
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-purple-700 dark:text-purple-300">
                                {t("groupOrder.title") || "Group Order"}
                            </span>
                            {isHost && (
                                <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">
                                    {t("groupOrder.host") || "Host"}
                                </span>
                            )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {session.sessionCode} • {participantCount} {participantCount === 1 ? "person" : "people"}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                    <span className="text-sm font-medium">
                        {t("common.view") || "View"}
                    </span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </button>
        );
    }

    // Not in group order - show create/join buttons
    return (
        <div className="w-full flex gap-3">
            {/* Create Group Button */}
            <button
                onClick={onCreateClick}
                disabled={disabled}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>{t("groupOrder.start") || "Start Group"}</span>
            </button>

            {/* Join Group Button */}
            <button
                onClick={onJoinClick}
                disabled={disabled}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-700 rounded-xl font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>{t("groupOrder.join") || "Join Group"}</span>
            </button>
        </div>
    );
}
