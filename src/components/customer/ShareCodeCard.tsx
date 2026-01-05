"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useToast } from "@/context/ToastContext";
import { HiLink, HiShare } from "react-icons/hi2";

/**
 * Share Code Card - Clean QR Code Display
 */
interface ShareCodeCardProps {
    sessionCode: string;
    merchantCode: string;
    participantCount: number;
    expiresAt: string;
    onClose?: () => void;
}

export default function ShareCodeCard({
    sessionCode,
    merchantCode,
    participantCount,
    expiresAt,
    onClose,
}: ShareCodeCardProps) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [copied, setCopied] = useState(false);

    // Auto-join URL
    const joinUrl = typeof window !== "undefined"
        ? `${window.location.origin}/${merchantCode}/order?group=${sessionCode}`
        : `/${merchantCode}/order?group=${sessionCode}`;

    const expiresDate = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiresDate.getTime() - now.getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const timeRemaining = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(sessionCode);
            setCopied(true);
            showToast({ title: "Copied", message: t("groupOrder.copied") || "Code copied!", variant: "success", duration: 3000 });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(joinUrl);
            showToast({ title: "Copied", message: "Link copied!", variant: "success", duration: 3000 });
        } catch (err) {
            console.error("Failed to copy link:", err);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Join my group order!",
                    text: `Join my group order with code: ${sessionCode}`,
                    url: joinUrl,
                });
            } catch (err) {
                if ((err as Error).name !== "AbortError") {
                    console.error("Share failed:", err);
                }
            }
        } else {
            handleCopyLink();
        }
    };

    return (
        <div className="space-y-4">
            {/* QR Code - No container, full width */}
            <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">
                    {t("groupOrder.scanQR") || "Scan to join instantly"}
                </p>

                {/* Large QR Code - No background container */}
                <div className="flex justify-center mb-4">
                    <QRCodeSVG
                        value={joinUrl}
                        size={200}
                        level="H"
                        includeMargin={false}
                    />
                </div>

                {/* Simple code text - tappable */}
                <button onClick={handleCopyCode} className="group">
                    <p className="text-2xl font-mono font-bold text-gray-900 tracking-widest">
                        {sessionCode}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                        {copied ? "✓ Copied!" : t("groupOrder.copyCode") || "Tap to copy"}
                    </p>
                </button>
            </div>

            {/* Info Row */}
            <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                    <span>👥</span>
                    <span>{participantCount} {participantCount === 1 ? "person" : "people"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{t("groupOrder.expiresIn") || "Expires in"} {timeRemaining}</span>
                </div>
            </div>

            {/* Share Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={handleCopyLink}
                    className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                    <HiLink className="w-4 h-4" />
                    <span>Copy Link</span>
                </button>

                <button
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors text-sm"
                >
                    <HiShare className="w-4 h-4" />
                    <span>Share</span>
                </button>
            </div>

            {onClose && (
                <button
                    onClick={onClose}
                    className="w-full py-2.5 text-gray-500 text-sm hover:text-gray-700 transition-colors"
                >
                    Close
                </button>
            )}
        </div>
    );
}
