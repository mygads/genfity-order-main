"use client";

import React, { useState } from "react";
import { useGroupOrder, GroupOrderParticipant } from "@/context/GroupOrderContext";
import { useTranslation } from "@/lib/i18n/useTranslation";
import ShareCodeCard from "./ShareCodeCard";
import { CartItem } from "@/context/CartContext";
import { HiUserGroup, HiQrCode } from "react-icons/hi2";

/**
 * Group Dashboard - Bottom Sheet Style
 * 
 * Displays participants, carts, and host controls in orange-themed bottom sheet.
 */
interface GroupDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmitOrder: () => void;
    merchantCode: string;
    currency: string;
    onModeChange?: (mode: 'dinein' | 'takeaway' | 'delivery') => void;
}

// Price formatter helper - returns "Free" for zero price
function formatPrice(price: number, currency: string): string {
    if (price === 0) return "Free";

    const symbols: Record<string, string> = {
        AUD: "A$",
        USD: "$",
        IDR: "Rp",
        SGD: "S$",
    };
    const symbol = symbols[currency] || currency + " ";

    if (currency === "IDR") {
        return `${symbol}${price.toLocaleString("id-ID")}`;
    }
    return `${symbol}${price.toFixed(2)}`;
}

export default function GroupDashboard({
    isOpen,
    onClose,
    onSubmitOrder,
    merchantCode,
    currency,
    onModeChange,
}: GroupDashboardProps) {
    const { t } = useTranslation();
    const {
        session,
        isHost,
        myParticipantId,
        kickParticipant,
        transferHost,
        leaveSession,
        cancelSession,
        splitBill: _splitBill,
    } = useGroupOrder();

    const [activeTab, setActiveTab] = useState<"participants" | "share">("participants");
    const [showKickConfirm, setShowKickConfirm] = useState<{ id: string; name: string } | null>(null);
    const [showTransferConfirm, setShowTransferConfirm] = useState<{ id: string; name: string } | null>(null);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 250);
    };

    if (!isOpen || !session) return null;

    const participants = session.participants;
    const totalSubtotal = participants.reduce((sum, p) => sum + p.subtotal, 0);
    const totalItems = participants.reduce(
        (sum, p) => sum + ((p.cartItems as CartItem[])?.length || 0),
        0
    );

    const canSubmit = participants.length >= 2 && totalItems > 0;

    const handleKick = async (participantId: string, confirmed = false) => {
        setIsProcessing(true);
        const result = await kickParticipant(participantId, confirmed);
        setIsProcessing(false);

        if (result.requiresConfirmation) {
            const participant = participants.find(p => p.id === participantId);
            if (participant) {
                setShowKickConfirm({ id: participantId, name: participant.name });
            }
        } else {
            setShowKickConfirm(null);
        }
    };

    const handleTransfer = async (newHostId: string) => {
        setIsProcessing(true);
        await transferHost(newHostId);
        setIsProcessing(false);
        setShowTransferConfirm(null);
    };

    const handleLeave = async () => {
        // Get the mode before leaving
        const groupMode = session?.orderType === 'DINE_IN' ? 'dinein' : 'takeaway';

        setIsProcessing(true);
        await leaveSession();
        setIsProcessing(false);

        // Preserve the mode from group order
        if (onModeChange) {
            onModeChange(groupMode);
        }
        handleClose();
    };

    const handleCancel = async () => {
        // Get the mode before cancelling
        const groupMode = session?.orderType === 'DINE_IN' ? 'dinein' : 'takeaway';

        await cancelSession();

        // Preserve the mode from group order
        if (onModeChange) {
            onModeChange(groupMode);
        }
        handleClose();
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 z-[100] transition-opacity duration-250 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
                onClick={handleClose}
            />

            {/* Bottom Sheet */}
            <div className={`fixed inset-x-0 bottom-0 z-[100] flex justify-center ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}>
                <div className="w-full max-w-[500px] bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
                    {/* Header - White style matching Table Number modal */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-gray-900" style={{ margin: 0, lineHeight: 'normal' }}>
                                {t("groupOrder.title") || "Group Order"}
                            </h2>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-mono rounded">
                                {session.sessionCode}
                            </span>
                        </div>
                        <button
                            onClick={handleClose}
                            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <svg width="18" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Tabs - Smaller text */}
                    <div className="flex gap-2 p-3 border-b border-gray-100">
                        <button
                            onClick={() => setActiveTab("participants")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium text-xs transition-colors ${activeTab === "participants"
                                ? "bg-orange-100 text-orange-700 border border-orange-200"
                                : "bg-gray-50 text-gray-600 border border-gray-200"
                                }`}
                        >
                            <HiUserGroup className="w-3.5 h-3.5" />
                            <span>{t("groupOrder.participants") || "Participants"} ({participants.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("share")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium text-xs transition-colors ${activeTab === "share"
                                ? "bg-orange-100 text-orange-700 border border-orange-200"
                                : "bg-gray-50 text-gray-600 border border-gray-200"
                                }`}
                        >
                            <HiQrCode className="w-3.5 h-3.5" />
                            <span>{t("groupOrder.shareCode") || "Share this code"}</span>
                        </button>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto px-4 py-3">
                        {activeTab === "participants" ? (
                            <div className="space-y-3">
                                {participants.map((participant) => (
                                    <ParticipantCard
                                        key={participant.id}
                                        participant={participant}
                                        isMe={participant.id === myParticipantId}
                                        isViewerHost={isHost}
                                        currency={currency}
                                        onKick={() => handleKick(participant.id)}
                                        onTransfer={() => setShowTransferConfirm({ id: participant.id, name: participant.name })}
                                        isProcessing={isProcessing}
                                    />
                                ))}

                                {/* Summary */}
                                <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 text-sm">{t("groupOrder.items") || "Total Items"}</span>
                                        <span className="font-medium text-gray-900">{totalItems}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-gray-600 text-sm">Subtotal</span>
                                        <span className="font-bold text-lg text-gray-900">
                                            {formatPrice(totalSubtotal, currency)}
                                        </span>
                                    </div>
                                </div>

                                {/* Leave/Cancel */}
                                <button
                                    onClick={() => setShowLeaveConfirm(true)}
                                    className="w-full py-2.5 text-red-600 text-sm font-medium bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors"
                                >
                                    {isHost ? t("groupOrder.cancelGroup") || "Cancel Group Order" : t("groupOrder.leaveGroup") || "Leave Group"}
                                </button>
                            </div>
                        ) : (
                            <ShareCodeCard
                                sessionCode={session.sessionCode}
                                merchantCode={merchantCode}
                                participantCount={participants.length}
                                expiresAt={session.expiresAt}
                            />
                        )}
                    </div>

                    {/* Footer - Submit Button (Host Only) */}
                    {isHost && activeTab === "participants" && (
                        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                            <button
                                onClick={onSubmitOrder}
                                disabled={!canSubmit}
                                className="w-full h-12 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                            >
                                {!canSubmit ? (
                                    participants.length < 2
                                        ? t("groupOrder.minParticipants") || "Need at least 2 participants"
                                        : t("groupOrder.addItems") || "Add items to continue"
                                ) : (
                                    `${t("groupOrder.submitOrder") || "Submit Order"} • ${formatPrice(totalSubtotal, currency)}`
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modals */}
            {showKickConfirm && (
                <ConfirmModal
                    title={t("groupOrder.removeParticipant") || "Remove Participant"}
                    message={`Are you sure you want to remove ${showKickConfirm.name} from the group?`}
                    confirmText="Remove"
                    onConfirm={() => handleKick(showKickConfirm.id, true)}
                    onCancel={() => setShowKickConfirm(null)}
                    isProcessing={isProcessing}
                />
            )}

            {showTransferConfirm && (
                <ConfirmModal
                    title={t("groupOrder.transferHost") || "Transfer Host"}
                    message={`Make ${showTransferConfirm.name} the new host?`}
                    confirmText="Transfer"
                    onConfirm={() => handleTransfer(showTransferConfirm.id)}
                    onCancel={() => setShowTransferConfirm(null)}
                    isProcessing={isProcessing}
                />
            )}

            {showLeaveConfirm && (
                <ConfirmModal
                    title={isHost ? (t("groupOrder.cancelGroup") || "Cancel Group Order") : (t("groupOrder.leaveGroup") || "Leave Group")}
                    message={
                        isHost
                            ? "Are you sure you want to cancel this group order? All participants will be removed."
                            : "Are you sure you want to leave this group order?"
                    }
                    confirmText={isHost ? "Cancel Order" : "Leave"}
                    onConfirm={isHost ? handleCancel : handleLeave}
                    onCancel={() => setShowLeaveConfirm(false)}
                    isProcessing={isProcessing}
                />
            )}

            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                @keyframes slideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
                .animate-fadeOut { animation: fadeOut 0.25s ease-in forwards; }
                .animate-slideUp { animation: slideUp 0.3s ease-out; }
                .animate-slideDown { animation: slideDown 0.25s ease-in forwards; }
            `}</style>
        </>
    );
}

// ============================================
// Participant Card Sub-component
// ============================================

interface ParticipantCardProps {
    participant: GroupOrderParticipant;
    isMe: boolean;
    isViewerHost: boolean;
    currency: string;
    onKick: () => void;
    onTransfer: () => void;
    isProcessing: boolean;
}

function ParticipantCard({
    participant,
    isMe,
    isViewerHost,
    currency,
    onKick,
    onTransfer,
    isProcessing,
}: ParticipantCardProps) {
    const [isExpanded, setIsExpanded] = useState(isMe);
    const cartItems = (participant.cartItems as CartItem[]) || [];
    const itemCount = cartItems.length;

    return (
        <div
            className={`p-3 rounded-xl border transition-colors ${isMe
                ? "bg-orange-50 border-orange-200"
                : "bg-white border-gray-200"
                }`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${participant.isHost
                            ? "bg-orange-500 text-white"
                            : "bg-gray-200 text-gray-700"
                            }`}
                    >
                        {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">
                                {participant.name}
                            </span>
                            {isMe && (
                                <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                                    You
                                </span>
                            )}
                            {participant.isHost && (
                                <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded">
                                    Host
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500">
                            {itemCount} {itemCount === 1 ? "item" : "items"} • {formatPrice(participant.subtotal, currency)}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {isViewerHost && !isMe && !participant.isHost && (
                        <>
                            <button
                                onClick={onTransfer}
                                disabled={isProcessing}
                                className="p-1.5 text-orange-500 hover:bg-orange-100 rounded transition-colors disabled:opacity-50"
                                title="Make Host"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            </button>
                            <button
                                onClick={onKick}
                                disabled={isProcessing}
                                className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                                title="Remove"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </>
                    )}
                    {itemCount > 0 && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                        >
                            <svg
                                className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {isExpanded && itemCount > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                    {cartItems.map((item: CartItem) => {
                        const addonsTotal = (item.addons || []).reduce((sum, addon) => sum + addon.price, 0);
                        const itemTotal = (item.price + addonsTotal) * item.quantity;

                        return (
                            <div key={item.cartItemId} className="text-sm">
                                {/* Item row */}
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-start gap-1.5">
                                            <span className="text-gray-500">{item.quantity}x</span>
                                            <span className="text-gray-900 font-medium">{item.menuName}</span>
                                        </div>
                                        {/* Addons */}
                                        {item.addons && item.addons.length > 0 && (
                                            <div className="ml-5 mt-1 space-y-0.5">
                                                {item.addons.map((addon, idx) => (
                                                    <div key={idx} className="flex justify-between text-xs text-gray-500">
                                                        <span>+ {addon.name}</span>
                                                        <span>{formatPrice(addon.price, currency)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {/* Notes */}
                                        {item.notes && (
                                            <p className="ml-5 mt-1 text-xs text-gray-400 italic">&quot;{item.notes}&quot;</p>
                                        )}
                                    </div>
                                    <span className="text-gray-700 font-medium ml-2">
                                        {formatPrice(itemTotal, currency)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ============================================
// Confirm Modal Sub-component
// ============================================

interface ConfirmModalProps {
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    onCancel: () => void;
    isProcessing: boolean;
}

function ConfirmModal({
    title,
    message,
    confirmText,
    onConfirm,
    onCancel,
    isProcessing,
}: ConfirmModalProps) {
    return (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
            <div className="relative bg-white rounded-t-2xl p-4 w-full max-w-[500px] shadow-xl animate-slideUp">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="flex-1 py-3 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                    >
                        {isProcessing ? "..." : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
