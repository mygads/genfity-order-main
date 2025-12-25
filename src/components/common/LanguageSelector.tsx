'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Locale } from '@/lib/i18n';

// ============================================================================
// Flag SVG Components
// ============================================================================

const AustraliaFlag = ({ className = "w-5 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
    <path fill="#00008B" d="M0 0h640v480H0z"/>
    <path fill="#FFF" d="M0 0v27.95L307.037 250h38.647v-27.95L38.647 0H0zm345.684 0v27.95L38.647 250H0v-27.95L307.037 0h38.647z"/>
    <path fill="#FFF" d="M144.035 0v250h57.614V0h-57.614zM0 83.333v83.334h345.684V83.333H0z"/>
    <path fill="#C8102E" d="M0 100v50h345.684v-50H0zM155.573 0v250h34.538V0h-34.538zM0 250l115.228-83.333h25.765L25.765 250H0zM0 0l115.228 83.333H89.463L0 18.633V0zm204.691 83.333L319.919 0h25.765L230.456 83.333h-25.765zm140.993 166.667l-115.228-83.333h25.765l89.463 64.7v18.633z"/>
    <path fill="#FFF" d="M299.642 392.523l-10.565 26.692 22.24-16.795h-27.89l22.24 16.795-10.565-26.692zm-64.89-136.19l-7.043 17.795 14.827-11.197h-18.593l14.826 11.197-7.043-17.795zm0 119.048l-7.043 17.794 14.827-11.196h-18.593l14.826 11.196-7.043-17.794zm64.89-59.524l-7.043 17.795 14.827-11.197h-18.593l14.826 11.197-7.043-17.795zm64.89 0l-7.043 17.795 14.827-11.197h-18.593l14.826 11.197-7.043-17.795zm-32.445 59.524l-7.043 17.794 14.827-11.196h-18.593l14.826 11.196-7.043-17.794z"/>
    <path fill="#FFF" d="M107.684 188.095l-14.087 35.59 29.654-22.393h-37.187l29.654 22.393-14.087-35.59z"/>
  </svg>
);

const IndonesiaFlag = ({ className = "w-5 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
    <path fill="#E70011" d="M0 0h640v240H0z"/>
    <path fill="#FFF" d="M0 240h640v240H0z"/>
  </svg>
);

const FlagIcon = ({ locale, className = "w-5 h-4" }: { locale: Locale; className?: string }) => {
  if (locale === 'en') return <AustraliaFlag className={className} />;
  if (locale === 'id') return <IndonesiaFlag className={className} />;
  return null;
};

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
  const { locale, setLocale, localeName, availableLocales, isInitialized } = useTranslation();
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
        <FlagIcon locale={locale} className="w-5 h-4 rounded-sm overflow-hidden" />
        {mode === 'compact' && (
          <span className="uppercase text-xs">{locale.toUpperCase()}</span>
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
              <FlagIcon locale={loc.code} className="w-5 h-4 rounded-sm overflow-hidden" />
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
  const { locale, toggleLocale, isInitialized } = useTranslation();
  
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
      <FlagIcon locale={locale} className="w-5 h-4 rounded-sm overflow-hidden" />
      <span className="uppercase text-xs">{locale}</span>
    </button>
  );
}

export default LanguageSelector;
