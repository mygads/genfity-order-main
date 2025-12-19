"use client";

import React, { useState, useRef, useEffect } from 'react';
import { FaPencilAlt, FaCheck, FaTimes } from 'react-icons/fa';

interface InlineEditFieldProps {
  value: string | number;
  onSave: (newValue: string | number) => Promise<void>;
  type?: 'text' | 'number' | 'textarea';
  placeholder?: string;
  className?: string;
  displayClassName?: string;
  editClassName?: string;
  min?: number;
  max?: number;
  step?: number;
  multiline?: boolean;
  disabled?: boolean;
  validate?: (value: string | number) => boolean | string;
}

export default function InlineEditField({
  value,
  onSave,
  type = 'text',
  placeholder = 'Click to edit',
  className = '',
  displayClassName = '',
  editClassName = '',
  min,
  max,
  step,
  multiline = false,
  disabled = false,
  validate,
}: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text' || type === 'textarea') {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleStartEdit = () => {
    if (!disabled) {
      setIsEditing(true);
      setEditValue(value);
      setError(null);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
  };

  const handleSave = async () => {
    // Validation
    if (validate) {
      const validationResult = validate(editValue);
      if (validationResult !== true) {
        setError(typeof validationResult === 'string' ? validationResult : 'Invalid value');
        return;
      }
    }

    // Check if value changed
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (!multiline || (multiline && e.ctrlKey))) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const displayValue = value || placeholder;
  const isEmpty = !value;

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={handleStartEdit}
        disabled={disabled}
        className={`group relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-all ${
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        } ${displayClassName} ${className}`}
      >
        <span className={isEmpty ? 'text-gray-400 italic dark:text-gray-500' : ''}>
          {displayValue}
        </span>
        {!disabled && (
          <FaPencilAlt className="h-3 w-3 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </button>
    );
  }

  return (
    <div className={`relative inline-flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-2">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={3}
            disabled={isSaving}
            className={`w-full rounded-lg border border-brand-300 bg-white px-3 py-2 text-left text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-600 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${editClassName}`}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            value={editValue}
            onChange={(e) =>
              setEditValue(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            disabled={isSaving}
            className={`w-full rounded-lg border border-brand-300 bg-white px-3 py-2 text-left text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-600 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${editClassName}`}
          />
        )}

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-success-500 text-white hover:bg-success-600 disabled:cursor-not-allowed disabled:opacity-50"
            title="Save"
          >
            {isSaving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <FaCheck className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            title="Cancel"
          >
            <FaTimes className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-error-600 dark:text-error-400">{error}</p>
      )}

      {multiline && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Press Ctrl+Enter to save, Esc to cancel
        </p>
      )}
    </div>
  );
}
