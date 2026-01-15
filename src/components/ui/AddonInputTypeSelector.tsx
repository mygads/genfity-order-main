"use client";

import React from 'react';
import { FaCheckSquare, FaPlus, FaMinus } from 'react-icons/fa';

export type AddonInputType = 'checkbox' | 'quantity';

interface AddonInputTypeSelectorProps {
  value: AddonInputType;
  onChange: (type: AddonInputType) => void;
  disabled?: boolean;
  minSelection?: number;
  maxSelection?: number | null;
}

export default function AddonInputTypeSelector({
  value,
  onChange,
  disabled = false,
  minSelection = 0,
  maxSelection = null,
}: AddonInputTypeSelectorProps) {
  // Auto-suggest input type based on selection rules
  const suggestedType = React.useMemo(() => {
    // Checkbox can handle single selection (max=1) or multiple selections
    return 'checkbox';
  }, []);

  const options: Array<{
    type: AddonInputType;
    icon: React.ReactNode;
    label: string;
    description: string;
    recommended?: boolean;
  }> = [
    {
      type: 'checkbox',
      icon: <FaCheckSquare className="h-5 w-5" />,
      label: 'Checkbox / Radio',
      description: 'If max=1 shows radio, if max>1 shows checkbox. Customer picks options.',
      recommended: suggestedType === 'checkbox',
    },
    {
      type: 'quantity',
      icon: (
        <div className="flex items-center gap-1">
          <FaMinus className="h-3 w-3" />
          <span className="text-xs font-semibold">1</span>
          <FaPlus className="h-3 w-3" />
        </div>
      ),
      label: 'Quantity (+/-)',
      description: 'Customer can add multiple of this item (e.g., Extra Cheese x3)',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Input Type
        </label>
        {minSelection > 0 || maxSelection !== null ? (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Rules: Min {minSelection} / Max {maxSelection || '∞'}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.type}
            type="button"
            onClick={() => !disabled && onChange(option.type)}
            disabled={disabled}
            className={`relative flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all ${
              value === option.type
                ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/20'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            {/* Recommended Badge */}
            {option.recommended && value !== option.type && (
              <span className="absolute right-2 top-2 inline-flex rounded-full bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning-900/20 dark:text-warning-400">
                Suggested
              </span>
            )}

            {/* Icon */}
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                value === option.type
                  ? 'bg-brand-100 text-brand-600 dark:bg-brand-800 dark:text-brand-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {option.icon}
            </div>

            {/* Label & Description */}
            <div>
              <p
                className={`text-sm font-semibold ${
                  value === option.type
                    ? 'text-brand-700 dark:text-brand-300'
                    : 'text-gray-800 dark:text-white/90'
                }`}
              >
                {option.label}
              </p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {option.description}
              </p>
            </div>

            {/* Selected Indicator */}
            {value === option.type && (
              <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
