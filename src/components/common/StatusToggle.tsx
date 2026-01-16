"use client";

import React from "react";
import { FaToggleOff, FaToggleOn } from "react-icons/fa";

export type StatusToggleSize = "sm" | "md";

type StatusToggleProps = {
  isActive: boolean;
  indeterminate?: boolean;
  onToggle: () => void;
  disabled?: boolean;
  activeLabel: string;
  inactiveLabel: string;
  indeterminateLabel?: string;
  activateTitle?: string;
  deactivateTitle?: string;
  indeterminateTitle?: string;
  size?: StatusToggleSize;
  className?: string;
};

export function StatusToggle({
  isActive,
  indeterminate,
  onToggle,
  disabled,
  activeLabel,
  inactiveLabel,
  indeterminateLabel,
  activateTitle,
  deactivateTitle,
  indeterminateTitle,
  size = "md",
  className = "",
}: StatusToggleProps) {
  const safeIndeterminateLabel = indeterminateLabel || "Mixed";
  const title = indeterminate
    ? indeterminateTitle || safeIndeterminateLabel
    : isActive
      ? deactivateTitle || inactiveLabel
      : activateTitle || activeLabel;
  const ariaLabel = title;
  const iconClassName = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const labelClassName = size === "sm" ? "text-xs" : "text-sm";

  return (
    <button
      type="button"
      className={
        `inline-flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 disabled:opacity-60 dark:hover:bg-gray-900 ${className}`
      }
      onClick={onToggle}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
    >
      {indeterminate ? (
        <FaToggleOff className={`${iconClassName} text-amber-500 dark:text-amber-400`} />
      ) : isActive ? (
        <FaToggleOn className={`${iconClassName} text-green-600 dark:text-green-400`} />
      ) : (
        <FaToggleOff className={`${iconClassName} text-gray-400 dark:text-gray-500`} />
      )}
      <span className={`${labelClassName} font-medium text-gray-700 dark:text-gray-300`}>
        {indeterminate ? safeIndeterminateLabel : isActive ? activeLabel : inactiveLabel}
      </span>
    </button>
  );
}
