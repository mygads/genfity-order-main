"use client";

import React, { useState, useEffect } from "react";
import { useGroupOrder } from "@/context/GroupOrderContext";
import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * Group Session Banner - Orange Theme
 * 
 * Sticky banner displayed when user is in an active group order session.
 * Collapses to a floating pill on scroll.
 */
interface GroupSessionBannerProps {
    onViewGroup: () => void;
}

export default function GroupSessionBanner({ onViewGroup }: GroupSessionBannerProps) {
    const { t } = useTranslation();
    const { session, isHost, myParticipantId } = useGroupOrder();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Handle scroll for collapse behavior
    useEffect(() => {
        let lastScrollY = 0;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > 100 && currentScrollY > lastScrollY) {
                setIsCollapsed(true);
            } else if (currentScrollY < 50) {
                setIsCollapsed(false);
            }

            lastScrollY = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (!session || session.status !== "OPEN") return null;

    const participantCount = session.participants.length;
    const myParticipant = session.participants.find(p => p.id === myParticipantId);

    // Collapsed pill view - Orange theme
    if (isCollapsed) {
        return (
            <button
                onClick={onViewGroup}
                className="fixed bottom-24 right-4 z-40 flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-all"
            >
                <span className="text-lg">👥</span>
                <span className="font-medium font-mono">{session.sessionCode}</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {participantCount}
                </span>
            </button>
        );
    }

    // Expanded banner view - Orange theme
    return (
        <div className="sticky top-0 z-30 bg-orange-500 shadow-lg">
            <div className="max-w-[500px] mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Left side: Group info */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                            <span className="text-xl">👥</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white text-lg">
                                    {session.sessionCode}
                                </span>
                                {isHost && (
                                    <span className="text-xs bg-white/30 text-white px-2 py-0.5 rounded-full">
                                        {t("groupOrder.host") || "Host"}
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-orange-100">
                                {participantCount} {participantCount === 1 ? "person" : "people"} • {session.orderType === "DINE_IN" ? `Table ${session.tableNumber}` : "Takeaway"}
                            </div>
                        </div>
                    </div>

                    {/* Right side: View button */}
                    <button
                        onClick={onViewGroup}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl text-white font-medium transition-colors"
                    >
                        <span>{t("common.view") || "View"}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Items indicator */}
                {myParticipant && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-orange-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <span>
                            Your items: {(myParticipant.cartItems as unknown[])?.length || 0}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
