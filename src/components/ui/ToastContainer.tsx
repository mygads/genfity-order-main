/**
 * Toast Container Component
 * Renders toast notifications in a fixed position
 */

"use client";

import React from "react";
import Toast, { ToastProps } from "./Toast";

interface ToastItem extends ToastProps {
  id: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      <div className="flex flex-col gap-3 pointer-events-auto">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
