/**
 * Toast Notification Component
 * Auto-dismiss toast notifications with multiple variants
 */

"use client";

import React, { useEffect } from "react";

export interface ToastProps {
  id?: string;
  variant: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  duration?: number; // milliseconds
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({
  variant,
  title,
  message,
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  // Accessibility mapping
  const a11yProps = {
    success: { role: 'status', ariaLive: 'polite' as const },
    error: { role: 'alert', ariaLive: 'assertive' as const },
    warning: { role: 'alert', ariaLive: 'assertive' as const },
    info: { role: 'status', ariaLive: 'polite' as const },
  };

  // Variant styling
  const variantClasses = {
    success: {
      container:
        "border-success-500 bg-success-50 dark:border-success-500/30 dark:bg-success-500/15",
      icon: "text-success-500",
    },
    error: {
      container:
        "border-[var(--color-danger)] bg-[var(--color-danger-light)] dark:border-error-500/30 dark:bg-error-500/15",
      icon: "text-[var(--color-danger)]",
    },
    warning: {
      container:
        "border-warning-500 bg-warning-50 dark:border-warning-500/30 dark:bg-warning-500/15",
      icon: "text-warning-500",
    },
    info: {
      container:
        "border-blue-light-500 bg-blue-light-50 dark:border-blue-light-500/30 dark:bg-blue-light-500/15",
      icon: "text-blue-light-500",
    },
  };

  // Icons
  const icons = {
    success: (
      <svg
        aria-hidden="true"
        className="fill-current"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18ZM13.7071 8.70711C14.0976 8.31658 14.0976 7.68342 13.7071 7.29289C13.3166 6.90237 12.6834 6.90237 12.2929 7.29289L9 10.5858L7.70711 9.29289C7.31658 8.90237 6.68342 8.90237 6.29289 9.29289C5.90237 9.68342 5.90237 10.3166 6.29289 10.7071L8.29289 12.7071C8.68342 13.0976 9.31658 13.0976 9.70711 12.7071L13.7071 8.70711Z"
        />
      </svg>
    ),
    error: (
      <svg
        aria-hidden="true"
        className="fill-current"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18ZM10 7C10.5523 7 11 7.44772 11 8V10C11 10.5523 10.5523 11 10 11C9.44772 11 9 10.5523 9 10V8C9 7.44772 9.44772 7 10 7ZM10 13C9.44772 13 9 13.4477 9 14C9 14.5523 9.44772 15 10 15C10.5523 15 11 14.5523 11 14C11 13.4477 10.5523 13 10 13Z"
        />
      </svg>
    ),
    warning: (
      <svg
        aria-hidden="true"
        className="fill-current"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 6C10.5523 6 11 6.44772 11 7V10C11 10.5523 10.5523 11 10 11C9.44772 11 9 10.5523 9 10V7C9 6.44772 9.44772 6 10 6ZM10 13C9.44772 13 9 13.4477 9 14C9 14.5523 9.44772 15 10 15C10.5523 15 11 14.5523 11 14C11 13.4477 10.5523 13 10 13Z"
        />
      </svg>
    ),
    info: (
      <svg
        aria-hidden="true"
        className="fill-current"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 6C10.5523 6 11 6.44772 11 7C11 7.55228 10.5523 8 10 8C9.44772 8 9 7.55228 9 7C9 6.44772 9.44772 6 10 6ZM10 9C10.5523 9 11 9.44772 11 10V14C11 14.5523 10.5523 15 10 15C9.44772 15 9 14.5523 9 14V10C9 9.44772 9.44772 9 10 9Z"
        />
      </svg>
    ),
  };

  return (
    <div
      role={a11yProps[variant].role}
      aria-live={a11yProps[variant].ariaLive}
      aria-atomic="true"
      className={`
        w-full max-w-sm rounded-lg border p-3 shadow-lg
        animate-in slide-in-from-top-4 fade-in
        ${variantClasses[variant].container}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${variantClasses[variant].icon}`}>
          {icons[variant]}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-primary-dark dark:text-white mb-1">
            {title}
          </h4>
          <p className="text-xs text-secondary dark:text-gray-400">
            {message}
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-secondary hover:text-primary-dark transition-colors dark:text-gray-400 dark:hover:text-white"
            aria-label="Tutup"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;
