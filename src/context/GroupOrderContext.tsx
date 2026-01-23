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
 * - Real-time updates via WebSocket (no client polling)
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

const GROUP_ORDER_IDLE_DISCONNECT_MS = 3 * 60 * 1000;
const GROUP_ORDER_ACTIVITY_THROTTLE_MS = 1000;

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

    const wsRef = useRef<WebSocket | null>(null);
    const wsCodeRef = useRef<string | null>(null);
    const wsReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wsReconnectAttemptsRef = useRef<number>(0);
    const sessionRef = useRef<GroupOrderSession | null>(null);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastActivityAtRef = useRef<number>(0);
    const refreshSessionFromCodeRef = useRef<
        (
            code: string,
            storedDeviceId?: string,
            options?: { ensureRealtime?: boolean }
        ) => Promise<void>
    >(async () => {});
    const { cart, clearCart } = useCart();

    // ============================================
    // COMPUTED VALUES
    // ============================================

    const isInGroupOrder =
        session !== null && (session.status === "OPEN" || session.status === "LOCKED");

    const isHost = session?.participants.some(
        (p) => p.id === myParticipantId && p.isHost
    ) ?? false;

    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

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
            refreshSessionFromCode(stored.code, stored.deviceId, { ensureRealtime: true });
        }

        return () => {
            disconnectRealtime();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ============================================
    // REALTIME (WEBSOCKET ONLY)
    // ============================================

    const disconnectRealtime = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
        if (wsReconnectTimerRef.current) {
            clearTimeout(wsReconnectTimerRef.current);
            wsReconnectTimerRef.current = null;
        }
        wsReconnectAttemptsRef.current = 0;
        wsCodeRef.current = null;

        if (wsRef.current) {
            try {
                wsRef.current.onopen = null;
                wsRef.current.onclose = null;
                wsRef.current.onerror = null;
                wsRef.current.onmessage = null;
                wsRef.current.close();
            } catch {
                // ignore
            }
            wsRef.current = null;
        }
    }, []);

    const resetIdleTimer = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }

        idleTimerRef.current = setTimeout(() => {
            disconnectRealtime();
        }, GROUP_ORDER_IDLE_DISCONNECT_MS);
    }, [disconnectRealtime]);

    // ============================================
    // ACTIONS
    // ============================================

    const ensureRealtimeConnected = useCallback((code: string) => {
        const wsBase = getOrderWsBaseUrl();
        if (!wsBase) {
            console.warn("[GROUP ORDER] NEXT_PUBLIC_ORDER_WS_URL is not set; realtime disabled.");
            return;
        }

        const normalizedCode = code.trim().toUpperCase();
        const existing = wsRef.current;
        if (
            existing &&
            wsCodeRef.current === normalizedCode &&
            (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)
        ) {
            return;
        }

        disconnectRealtime();
        wsCodeRef.current = normalizedCode;

        const wsUrl = `${wsBase}/ws/public/group-order?code=${encodeURIComponent(normalizedCode)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            wsReconnectAttemptsRef.current = 0;
            resetIdleTimer();
        };

        ws.onmessage = async (event) => {
            resetIdleTimer();

            const isRecord = (value: unknown): value is Record<string, unknown> =>
                typeof value === "object" && value !== null;

            let parsed: unknown;
            let messageType: string | undefined;
            let messageData: unknown;
            try {
                parsed = JSON.parse(event.data as string);
                if (isRecord(parsed)) {
                    const t = parsed.type;
                    if (typeof t === "string") {
                        messageType = t;
                    }
                    messageData = parsed.data;
                }
            } catch {
                // ignore (some servers may send non-JSON)
            }

            if (messageType === "group-order.session" && messageData) {
                const nextSession = messageData as GroupOrderSession;
                setSession(nextSession);

                if (["EXPIRED", "CANCELLED"].includes(nextSession.status)) {
                    clearStoredSession();
                    setMyParticipantId(null);
                    disconnectRealtime();
                    return;
                }

                if (nextSession.status === "SUBMITTED") {
                    clearStoredSession();
                    disconnectRealtime();
                    return;
                }

                const myDevice = deviceId || getOrCreateDeviceId();
                const myParticipant = nextSession.participants.find(
                    (p: GroupOrderParticipant) => p.deviceId === myDevice
                );
                if (!myParticipant) {
                    clearStoredSession();
                    setSession(null);
                    setMyParticipantId(null);
                    disconnectRealtime();
                    return;
                }

                setMyParticipantId(myParticipant.id);
                return;
            }

            if (messageType === "group-order.closed") {
                if (messageData) {
                    const nextSession = messageData as GroupOrderSession;
                    setSession(nextSession);
                }
                clearStoredSession();
                disconnectRealtime();
                return;
            }

            if (messageType === "error") {
                clearStoredSession();
                disconnectRealtime();
                return;
            }

            // Backward-compatible: older servers may send refresh signals.
            if (messageType === "group-order.refresh") {
                await refreshSessionFromCodeRef.current(normalizedCode, undefined, { ensureRealtime: false });
            }

        };

        ws.onclose = () => {
            wsRef.current = null;

            // If we intentionally disconnected or switched sessions, don't reconnect.
            if (wsCodeRef.current !== normalizedCode) return;

            const currentSession = sessionRef.current;
            const stillRelevant =
                currentSession?.sessionCode?.toUpperCase() === normalizedCode &&
                (currentSession.status === "OPEN" || currentSession.status === "LOCKED");

            if (!stillRelevant) return;
            if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

            const attempt = wsReconnectAttemptsRef.current + 1;
            wsReconnectAttemptsRef.current = attempt;
            if (attempt > 5) return;

            const delayMs = Math.min(15000, 1000 * Math.pow(2, attempt - 1));
            wsReconnectTimerRef.current = setTimeout(() => {
                ensureRealtimeConnected(normalizedCode);
            }, delayMs);
        };

        ws.onerror = () => {
            // Let onclose handle reconnection/cleanup
        };
    }, [deviceId, disconnectRealtime, resetIdleTimer]);

    const handleUserActivity = useCallback(() => {
        const now = Date.now();
        if (now - lastActivityAtRef.current < GROUP_ORDER_ACTIVITY_THROTTLE_MS) return;
        lastActivityAtRef.current = now;

        resetIdleTimer();

        const currentSession = sessionRef.current;
        if (
            currentSession &&
            (currentSession.status === "OPEN" || currentSession.status === "LOCKED")
        ) {
            if (typeof document !== "undefined" && document.visibilityState === "hidden") {
                return;
            }
            ensureRealtimeConnected(currentSession.sessionCode);
        }
    }, [ensureRealtimeConnected, resetIdleTimer]);

    useEffect(() => {
        if (!session || (session.status !== "OPEN" && session.status !== "LOCKED")) return;
        if (typeof window === "undefined") return;

        resetIdleTimer();

        const events: Array<keyof WindowEventMap> = [
            "mousemove",
            "keydown",
            "click",
            "touchstart",
            "scroll",
        ];

        for (const ev of events) {
            window.addEventListener(ev, handleUserActivity, { passive: true });
        }

        const onVisibility = () => {
            if (document.visibilityState === "hidden") {
                disconnectRealtime();
            } else {
                handleUserActivity();
            }
        };

        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            for (const ev of events) {
                window.removeEventListener(ev, handleUserActivity);
            }
            document.removeEventListener("visibilitychange", onVisibility);
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
                idleTimerRef.current = null;
            }
        };
    }, [disconnectRealtime, handleUserActivity, resetIdleTimer, session]);

    const refreshSessionFromCode = useCallback(
        async (
            code: string,
            storedDeviceId?: string,
            options?: { ensureRealtime?: boolean }
        ) => {
            try {
                const response = await fetch(buildOrderApiUrl(`/api/public/group-order/${code}`));
                const data = await response.json();

                if (!data.success) {
                    clearStoredSession();
                    setSession(null);
                    setMyParticipantId(null);
                    disconnectRealtime();
                    return;
                }

                const nextSession: GroupOrderSession = data.data;
                setSession(nextSession);

                // Hard stop conditions (auto-disconnect + cleanup)
                if (["EXPIRED", "CANCELLED"].includes(nextSession.status)) {
                    clearStoredSession();
                    setMyParticipantId(null);
                    disconnectRealtime();
                    return;
                }

                // If already submitted, we don't need realtime anymore
                if (nextSession.status === "SUBMITTED") {
                    clearStoredSession();
                    disconnectRealtime();
                    return;
                }

                // Find my participant
                const myDevice = storedDeviceId || deviceId;
                const myParticipant = nextSession.participants.find(
                    (p: GroupOrderParticipant) => p.deviceId === myDevice
                );

                if (!myParticipant) {
                    // Not a participant anymore
                    clearStoredSession();
                    setSession(null);
                    setMyParticipantId(null);
                    disconnectRealtime();
                    return;
                }

                setMyParticipantId(myParticipant.id);

                if (options?.ensureRealtime) {
                    ensureRealtimeConnected(code);
                }
            } catch (err) {
                console.error("[GROUP ORDER] Refresh error:", err);
                clearStoredSession();
                setSession(null);
                setMyParticipantId(null);
                disconnectRealtime();
            }
        },
        [deviceId, disconnectRealtime, ensureRealtimeConnected]
    );

    useEffect(() => {
        refreshSessionFromCodeRef.current = refreshSessionFromCode;
    }, [refreshSessionFromCode]);

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

                    // Start realtime connection
                    ensureRealtimeConnected(data.data.sessionCode);

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
        [cart, clearCart, ensureRealtimeConnected]
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

                    // Start realtime connection
                    ensureRealtimeConnected(data.data.sessionCode);

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
        [cart, clearCart, ensureRealtimeConnected]
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
                disconnectRealtime();
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
    }, [session, deviceId, disconnectRealtime]);

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
                    setSplitBill(data.data.splitBill);

                    // Update session status
                    setSession((prev) =>
                        prev ? { ...prev, status: "SUBMITTED", order: data.data.order } : null
                    );

                    // Clear local cart since order is now submitted
                    clearCart();

                    // Disconnect realtime when order is submitted
                    disconnectRealtime();
                    clearStoredSession();

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
        [session, deviceId, clearCart, disconnectRealtime]
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
                disconnectRealtime();
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
    }, [session, deviceId, disconnectRealtime]);

    const refreshSession = useCallback(async () => {
        if (!session) return;
        await refreshSessionFromCode(session.sessionCode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.sessionCode]);

    const clearGroupOrderState = useCallback(() => {
        disconnectRealtime();
        clearStoredSession();
        setSession(null);
        setMyParticipantId(null);
        setSplitBill(null);
        setError(null);
    }, [disconnectRealtime]);

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
