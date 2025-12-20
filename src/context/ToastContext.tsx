"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import ToastContainer from "@/components/ui/ToastContainer";
import { ToastProps } from "@/components/ui/Toast";

interface ToastItem extends ToastProps {
    id: string;
}

interface ToastContextType {
    showToast: (toast: Omit<ToastProps, "onClose">) => void;
    showSuccess: (message: string, title?: string) => void;
    showError: (message: string, title?: string) => void;
    showWarning: (message: string, title?: string) => void;
    showInfo: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback(
        (toast: Omit<ToastProps, "onClose">) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const newToast: ToastItem = {
                ...toast,
                id,
                onClose: () => removeToast(id),
            };
            setToasts((prev) => [...prev, newToast]);
        },
        [removeToast]
    );

    const showSuccess = useCallback(
        (message: string, title: string = "Success") => {
            showToast({ variant: "success", title, message, duration: 3000 });
        },
        [showToast]
    );

    const showError = useCallback(
        (message: string, title: string = "Error") => {
            showToast({ variant: "error", title, message, duration: 5000 });
        },
        [showToast]
    );

    const showWarning = useCallback(
        (message: string, title: string = "Warning") => {
            showToast({ variant: "warning", title, message, duration: 4000 });
        },
        [showToast]
    );

    const showInfo = useCallback(
        (message: string, title: string = "Info") => {
            showToast({ variant: "info", title, message, duration: 3000 });
        },
        [showToast]
    );

    return (
        <ToastContext.Provider
            value={{ showToast, showSuccess, showError, showWarning, showInfo }}
        >
            {children}
            <ToastContainer toasts={toasts} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
