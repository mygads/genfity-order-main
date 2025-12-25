'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Locale } from '@/lib/i18n';

// ============================================================================
// Types
// ============================================================================

interface LanguageSelectorProps {
  /** 
   * Display mode
   * - 'icon': Show flag only
   * - 'compact': Show flag + locale code
   * - 'full': Show flag + language name
   */
  mode?: 'icon' | 'compact' | 'full';
  
  /**
   * Custom class name for the button
   */
  className?: string;
  
  /**
   * Position of dropdown
   */
  dropdownPosition?: 'left' | 'right';
}

// ============================================================================
// Component
// ============================================================================

/**
 * Language Selector Component
 * 
 * Dropdown to switch between English and Indonesian
 * Works with LanguageContext for persistence
 */
export function LanguageSelector({
  mode = 'compact',
  className = '',
  dropdownPosition = 'right',
}: LanguageSelectorProps) {
  const { locale, setLocale, localeFlag, localeName, availableLocales, isInitialized } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);
  
  const handleSelect = (newLocale: Locale) => {
    setLocale(newLocale);
    setIsOpen(false);
  };
  
  // Don't render actual content until initialized to prevent hydration mismatch
  if (!isInitialized) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 ${className}`}>
        <span className="text-sm opacity-50">...</span>
      </div>
    );
  }
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg
          bg-gray-100 dark:bg-gray-800
          hover:bg-gray-200 dark:hover:bg-gray-700
          transition-colors duration-150
          text-sm font-medium text-gray-700 dark:text-gray-300
          ${className}
        `}
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-base leading-none">{localeFlag}</span>
        {mode === 'compact' && (
          <span className="uppercase text-xs">{locale}</span>
        )}
        {mode === 'full' && (
          <span>{localeName}</span>
        )}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`
            absolute z-50 mt-1 py-1 w-40
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-lg shadow-lg
            ${dropdownPosition === 'right' ? 'right-0' : 'left-0'}
          `}
          role="listbox"
          aria-label="Language options"
        >
          {availableLocales.map((loc) => (
            <button
              key={loc.code}
              type="button"
              role="option"
              aria-selected={locale === loc.code}
              onClick={() => handleSelect(loc.code)}
              className={`
                w-full flex items-center gap-2 px-3 py-2
                text-left text-sm
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors duration-150
                ${locale === loc.code 
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-medium' 
                  : 'text-gray-700 dark:text-gray-300'
                }
              `}
            >
              <span className="text-base leading-none">{loc.flag}</span>
              <span>{loc.name}</span>
              {locale === loc.code && (
                <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Simple Toggle Version
// ============================================================================

interface LanguageToggleProps {
  className?: string;
}

/**
 * Simple Language Toggle
 * 
 * Single button that toggles between EN and ID
 */
export function LanguageToggle({ className = '' }: LanguageToggleProps) {
  const { locale, toggleLocale, localeFlag, isInitialized } = useTranslation();
  
  if (!isInitialized) {
    return (
      <button
        type="button"
        disabled
        className={`
          inline-flex items-center gap-1 px-2 py-1 rounded
          bg-gray-100 dark:bg-gray-800 opacity-50
          ${className}
        `}
      >
        <span className="text-sm">...</span>
      </button>
    );
  }
  
  return (
    <button
      type="button"
      onClick={toggleLocale}
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded
        bg-gray-100 dark:bg-gray-800
        hover:bg-gray-200 dark:hover:bg-gray-700
        transition-colors duration-150
        text-sm font-medium text-gray-700 dark:text-gray-300
        ${className}
      `}
      aria-label={`Switch to ${locale === 'en' ? 'Indonesian' : 'English'}`}
      title={`Switch to ${locale === 'en' ? 'Indonesian' : 'English'}`}
    >
      <span className="text-base leading-none">{localeFlag}</span>
      <span className="uppercase text-xs">{locale}</span>
    </button>
  );
}

export default LanguageSelector;
