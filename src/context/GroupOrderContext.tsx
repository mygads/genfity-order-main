"use client";

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useRef,
} from "react";
import { useCart, CartItem as BaseCartItem } from "./CartContext";
import { buildOrderApiUrl, getOrderWsBaseUrl } from "@/lib/utils/orderApiBase";

/**
 * GENFITY - Group Order Context & Provider
 *
 * Manages group order (split bill) state with:
 * - Session creation and joining
 * - Participant management
 * - Cart synchronization via polling (every 5 seconds)
 * - localStorage backup/restore
 *
 * @specification implementation_plan.md - Group Order Feature
 *
 * localStorage keys:
 * - genfity_group_session - Active session info {code, participantId, deviceId}
 * - genfity_cart_backup_[merchantCode]_[mode] - Backed up cart before joining
 */

// ============================================
// INTERFACES
// ============================================

export interface GroupOrderParticipant {
    id: string;
    name: string;
    isHost: boolean;
    deviceId: string;
    cartItems: BaseCartItem[];
    subtotal: number;
    joinedAt: string;
    customerId?: string;
}

export interface GroupOrderSession {
    id: string;
    sessionCode: string;
    merchantId: string;
    orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
    tableNumber?: string;
    status: "OPEN" | "LOCKED" | "SUBMITTED" | "CANCELLED" | "EXPIRED";
    maxParticipants: number;
    expiresAt: string;
    participants: GroupOrderParticipant[];
    order?: {
        id: string;
        orderNumber: string;
        status: string;
        totalAmount: number;
    };
    merchant?: {
        id: string;
        code: string;
        name: string;
        currency: string;
    };
}

export interface SplitBillItem {
    participantId: string;
    participantName: string;
    isHost: boolean;
    subtotal: number;
    taxShare: number;
    serviceChargeShare: number;
    packagingFeeShare: number;
    total: number;
}

interface GroupOrderContextType {
    // State
    session: GroupOrderSession | null;
    isInGroupOrder: boolean;
    isHost: boolean;
    myParticipantId: string | null;
    deviceId: string | null;
    isLoading: boolean;
    error: string | null;
    splitBill: SplitBillItem[] | null;

    // Actions
    createSession: (
        merchantCode: string,
        orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY",
        tableNumber: string | undefined,
        hostName: string,
        customerId?: string
    ) => Promise<{ success: boolean; error?: string; sessionCode?: string }>;

    joinSession: (
        code: string,
        name: string,
        customerId?: string
    ) => Promise<{ success: boolean; error?: string }>;

    leaveSession: () => Promise<{ success: boolean; error?: string }>;

    updateMyCart: (items: BaseCartItem[], subtotal: number) => Promise<void>;

    kickParticipant: (
        participantId: string,
        confirmed?: boolean
    ) => Promise<{ success: boolean; error?: string; requiresConfirmation?: boolean }>;

    transferHost: (
        newHostId: string
    ) => Promise<{ success: boolean; error?: string }>;

    submitOrder: (
        customerName: string,
        customerEmail: string,
        customerPhone?: string,
        notes?: string
    ) => Promise<{ success: boolean; error?: string; orderNumber?: string }>;

    cancelSession: () => Promise<{ success: boolean; error?: string }>;

    refreshSession: () => Promise<void>;

    clearGroupOrderState: () => void;
}

const GroupOrderContext = createContext<GroupOrderContextType | undefined>(undefined);

// ============================================
// STORAGE KEYS
// ============================================

const STORAGE_KEYS = {
    ACTIVE_SESSION: "genfity_group_session",
    DEVICE_ID: "genfity_device_id",
    CART_BACKUP_PREFIX: "genfity_cart_backup_",
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getOrCreateDeviceId(): string {
    if (typeof window === "undefined") return "";

    let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    return deviceId;
}

function getStoredSession(): { code: string; participantId: string; deviceId: string } | null {
    if (typeof window === "undefined") return null;

    try {
        const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
        if (!data) return null;
        return JSON.parse(data);
    } catch {
        return null;
    }
}

function storeSession(code: string, participantId: string, deviceId: string): void {
    if (typeof window === "undefined") return;

    localStorage.setItem(
        STORAGE_KEYS.ACTIVE_SESSION,
        JSON.stringify({ code, participantId, deviceId })
    );
}

function clearStoredSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
}

function backupCart(merchantCode: string, mode: string, items: BaseCartItem[]): void {
    if (typeof window === "undefined") return;

    const key = `${STORAGE_KEYS.CART_BACKUP_PREFIX}${merchantCode}_${mode}`;
    localStorage.setItem(key, JSON.stringify(items));
}

function restoreCart(merchantCode: string, mode: string): BaseCartItem[] | null {
    if (typeof window === "undefined") return null;

    try {
        const key = `${STORAGE_KEYS.CART_BACKUP_PREFIX}${merchantCode}_${mode}`;
        const data = localStorage.getItem(key);
        if (!data) return null;
        localStorage.removeItem(key); // Clear backup after restore
        return JSON.parse(data);
    } catch {
        return null;
    }
}

// ============================================
// PROVIDER
// ============================================

export function GroupOrderProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<GroupOrderSession | null>(null);
    const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [splitBill, setSplitBill] = useState<SplitBillItem[] | null>(null);
    const [wsConnected, setWsConnected] = useState(false);

    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const { cart, clearCart } = useCart();

    // ============================================
    // COMPUTED VALUES
    // ============================================

    const isInGroupOrder = session !== null && session.status === "OPEN";

    const isHost = session?.participants.some(
        (p) => p.id === myParticipantId && p.isHost
    ) ?? false;

    // ============================================
    // INITIALIZATION
    // ============================================

    useEffect(() => {
        // Initialize device ID
        const id = getOrCreateDeviceId();
        setDeviceId(id);

        // Check for existing session
        const stored = getStoredSession();
        if (stored) {
            // Try to reconnect
            refreshSessionFromCode(stored.code, stored.deviceId);
        }

        return () => {
            // Cleanup polling on unmount
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ============================================
    // POLLING
    // ============================================

    const startPolling = useCallback((code: string) => {
        // Clear existing polling
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
        }

        // Poll every 5 seconds
        pollingRef.current = setInterval(async () => {
            try {
                const response = await fetch(buildOrderApiUrl(`/api/public/group-order/${code}`));
                const data = await response.json();

                if (data.success) {
                    setSession(data.data);

                    // Check if session was submitted
                    if (data.data.status === "SUBMITTED" && data.data.order) {
                        stopPolling();
                        // Clear local cart for all participants when order is submitted
                        clearCart();
                    }

                    // Check if session expired or cancelled
                    if (["EXPIRED", "CANCELLED"].includes(data.data.status)) {
                        stopPolling();
                        clearStoredSession();
                    }
                } else {
                    // Session not found
                    if (data.error === "SESSION_NOT_FOUND" || data.error === "SESSION_EXPIRED") {
                        stopPolling();
                        clearStoredSession();
                        setSession(null);
                    }
                }
            } catch (_err) {
                console.error("[GROUP ORDER] Polling error:", _err);
            }
        }, 5000);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clearCart]);

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setWsConnected(false);
    }, []);


    // ============================================
    // ACTIONS
    // ============================================

    const refreshSessionFromCode = async (code: string, storedDeviceId?: string) => {
        try {
            const response = await fetch(buildOrderApiUrl(`/api/public/group-order/${code}`));
            const data = await response.json();

            if (data.success) {
                setSession(data.data);

                // Find my participant
                const myDevice = storedDeviceId || deviceId;
                const myParticipant = data.data.participants.find(
                    (p: GroupOrderParticipant) => p.deviceId === myDevice
                );

                if (myParticipant) {
                    setMyParticipantId(myParticipant.id);
                    startRealtime(code);
                } else {
                    // Not a participant anymore
                    clearStoredSession();
                    setSession(null);
                }
            } else {
                clearStoredSession();
                setSession(null);
            }
        } catch (err) {
            console.error("[GROUP ORDER] Refresh error:", err);
            clearStoredSession();
            setSession(null);
        }
    };

    const startRealtime = useCallback((code: string) => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setWsConnected(false);

        const wsBase = getOrderWsBaseUrl();
        if (!wsBase) {
            setWsConnected(false);
            startPolling(code);
            return;
        }

        const wsUrl = `${wsBase}/ws/public/group-order?code=${encodeURIComponent(code)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => setWsConnected(true);
        ws.onclose = () => setWsConnected(false);
        ws.onerror = () => setWsConnected(false);
        ws.onmessage = async () => {
            await refreshSessionFromCode(code);
        };
    }, [refreshSessionFromCode, startPolling]);

    useEffect(() => {
        if (!session?.sessionCode) return;
        if (wsConnected) {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            return;
        }
        startPolling(session.sessionCode);
    }, [session?.sessionCode, wsConnected, startPolling]);

    const createSession = useCallback(
        async (
            merchantCode: string,
            orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY",
            tableNumber: string | undefined,
            hostName: string,
            customerId?: string
        ) => {
            setIsLoading(true);
            setError(null);

            try {
                const currentDeviceId = getOrCreateDeviceId();

                // Backup current cart
                if (cart && cart.items.length > 0) {
                    backupCart(merchantCode, cart.mode, cart.items);
                }

                const response = await fetch(buildOrderApiUrl("/api/public/group-order"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        merchantCode,
                        orderType,
                        tableNumber,
                        hostName,
                        deviceId: currentDeviceId,
                        customerId,
                    }),
                });

                const data = await response.json();

                if (data.success) {
                    setSession(data.data);
                    setDeviceId(data.data.deviceId);

                    // Find host participant
                    const host = data.data.participants.find((p: GroupOrderParticipant) => p.isHost);
                    if (host) {
                        setMyParticipantId(host.id);
                    }

                    // Store session info
                    storeSession(
                        data.data.sessionCode,
                        host?.id || "",
                        data.data.deviceId
                    );

                    // Clear local cart (using group cart now)
                    clearCart();

                    // Start polling
                    startRealtime(data.data.sessionCode);

                    return { success: true, sessionCode: data.data.sessionCode };
                } else {
                    setError(data.message);
                    return { success: false, error: data.message };
                }
            } catch (_err) {
                const message = "Failed to create group order session";
                setError(message);
                return { success: false, error: message };
            } finally {
                setIsLoading(false);
            }
        },
        [cart, clearCart, startPolling]
    );

    const joinSession = useCallback(
        async (code: string, name: string, customerId?: string) => {
            setIsLoading(true);
            setError(null);

            try {
                const currentDeviceId = getOrCreateDeviceId();

                // Backup current cart
                if (cart && cart.items.length > 0) {
                    backupCart(cart.merchantCode, cart.mode, cart.items);
                }

                const response = await fetch(buildOrderApiUrl(`/api/public/group-order/${code}/join`), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        deviceId: currentDeviceId,
                        customerId,
                    }),
                });

                const data = await response.json();

                if (data.success) {
                    setSession(data.data);
                    setDeviceId(data.data.deviceId);
                    setMyParticipantId(data.data.participantId);

                    // Store session info
                    storeSession(
                        data.data.sessionCode,
                        data.data.participantId,
                        data.data.deviceId
                    );

                    // Clear local cart
                    clearCart();

                    // Start polling
                    startRealtime(data.data.sessionCode);

                    return { success: true };
                } else {
                    setError(data.message);
                    return { success: false, error: data.message };
                }
            } catch (_err) {
                const message = "Failed to join group order";
                setError(message);
                return { success: false, error: message };
            } finally {
                setIsLoading(false);
            }
        },
        [cart, clearCart, startPolling]
    );

    const leaveSession = useCallback(async () => {
        if (!session || !deviceId) {
            return { success: false, error: "Not in a session" };
        }

        setIsLoading(true);

        try {
            const response = await fetch(
                buildOrderApiUrl(`/api/public/group-order/${session.sessionCode}/leave`),
                {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ deviceId }),
                }
            );

            const data = await response.json();

            if (data.success) {
                stopPolling();
                clearStoredSession();
                setSession(null);
                setMyParticipantId(null);

                // Restore backed up cart
                if (session.merchant) {
                    const mode = session.orderType === "DINE_IN" ? "dinein" : "takeaway";
                    const backedUpCart = restoreCart(session.merchant.code, mode);
                    // Note: Cart restoration would need to be handled by CartContext
                    console.log("[GROUP ORDER] Restore cart:", backedUpCart);
                }

                return { success: true };
            } else {
                setError(data.message);
                return { success: false, error: data.message };
            }
        } catch (_err) {
            const message = "Failed to leave session";
            setError(message);
            return { success: false, error: message };
        } finally {
            setIsLoading(false);
        }
    }, [session, deviceId, stopPolling]);

    const updateMyCart = useCallback(
        async (items: BaseCartItem[], subtotal: number) => {
            if (!session || !deviceId) return;

            try {
                await fetch(buildOrderApiUrl(`/api/public/group-order/${session.sessionCode}/cart`), {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        deviceId,
                        cartItems: items,
                        subtotal,
                    }),
                });
            } catch (err) {
                console.error("[GROUP ORDER] Update cart error:", err);
            }
        },
        [session, deviceId]
    );

    const kickParticipant = useCallback(
        async (participantId: string, confirmed = false) => {
            if (!session || !deviceId) {
                return { success: false, error: "Not in a session" };
            }

            try {
                const response = await fetch(
                    buildOrderApiUrl(`/api/public/group-order/${session.sessionCode}/kick`),
                    {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            deviceId,
                            participantId,
                            confirmed,
                        }),
                    }
                );

                const data = await response.json();

                if (data.success) {
                    await refreshSessionFromCode(session.sessionCode);
                    return { success: true };
                } else if (data.error === "CONFIRMATION_REQUIRED") {
                    return {
                        success: false,
                        error: data.message,
                        requiresConfirmation: true,
                    };
                } else {
                    return { success: false, error: data.message };
                }
            } catch (_err) {
                return { success: false, error: "Failed to kick participant" };
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [session, deviceId]
    );

    const transferHost = useCallback(
        async (newHostId: string) => {
            if (!session || !deviceId) {
                return { success: false, error: "Not in a session" };
            }

            try {
                const response = await fetch(
                    buildOrderApiUrl(`/api/public/group-order/${session.sessionCode}/transfer-host`),
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            deviceId,
                            newHostId,
                        }),
                    }
                );

                const data = await response.json();

                if (data.success) {
                    setSession(data.data);
                    return { success: true };
                } else {
                    return { success: false, error: data.message };
                }
            } catch (_err) {
                return { success: false, error: "Failed to transfer host" };
            }
        },
        [session, deviceId]
    );

    const submitOrder = useCallback(
        async (
            customerName: string,
            customerEmail: string,
            customerPhone?: string,
            notes?: string
        ) => {
            if (!session || !deviceId) {
                return { success: false, error: "Not in a session" };
            }

            setIsLoading(true);

            try {
                const response = await fetch(
                    buildOrderApiUrl(`/api/public/group-order/${session.sessionCode}/submit`),
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            deviceId,
                            customerName,
                            customerEmail,
                            customerPhone,
                            notes,
                        }),
                    }
                );

                const data = await response.json();

                if (data.success) {
                    stopPolling();
                    setSplitBill(data.data.splitBill);

                    // Update session status
                    setSession((prev) =>
                        prev ? { ...prev, status: "SUBMITTED", order: data.data.order } : null
                    );

                    // Clear local cart since order is now submitted
                    clearCart();

                    return {
                        success: true,
                        orderNumber: data.data.order.orderNumber,
                    };
                } else {
                    setError(data.message);
                    return { success: false, error: data.message };
                }
            } catch (_err) {
                const message = "Failed to submit order";
                setError(message);
                return { success: false, error: message };
            } finally {
                setIsLoading(false);
            }
        },
        [session, deviceId, stopPolling, clearCart]
    );

    const cancelSession = useCallback(async () => {
        if (!session || !deviceId) {
            return { success: false, error: "Not in a session" };
        }

        setIsLoading(true);

        try {
            const response = await fetch(
                buildOrderApiUrl(`/api/public/group-order/${session.sessionCode}`),
                {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ deviceId }),
                }
            );

            const data = await response.json();

            if (data.success) {
                stopPolling();
                clearStoredSession();
                setSession(null);
                setMyParticipantId(null);
                return { success: true };
            } else {
                return { success: false, error: data.message };
            }
        } catch (_err) {
            return { success: false, error: "Failed to cancel session" };
        } finally {
            setIsLoading(false);
        }
    }, [session, deviceId, stopPolling]);

    const refreshSession = useCallback(async () => {
        if (!session) return;
        await refreshSessionFromCode(session.sessionCode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.sessionCode]);

    const clearGroupOrderState = useCallback(() => {
        stopPolling();
        clearStoredSession();
        setSession(null);
        setMyParticipantId(null);
        setSplitBill(null);
        setError(null);
    }, [stopPolling]);

    // ============================================
    // CONTEXT VALUE
    // ============================================

    const value: GroupOrderContextType = {
        session,
        isInGroupOrder,
        isHost,
        myParticipantId,
        deviceId,
        isLoading,
        error,
        splitBill,
        createSession,
        joinSession,
        leaveSession,
        updateMyCart,
        kickParticipant,
        transferHost,
        submitOrder,
        cancelSession,
        refreshSession,
        clearGroupOrderState,
    };

    return (
        <GroupOrderContext.Provider value={value}>
            {children}
        </GroupOrderContext.Provider>
    );
}

// ============================================
// HOOK
// ============================================

export function useGroupOrder() {
    const context = useContext(GroupOrderContext);
    if (context === undefined) {
        throw new Error("useGroupOrder must be used within a GroupOrderProvider");
    }
    return context;
}
