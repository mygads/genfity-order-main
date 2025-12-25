'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Locale } from '@/lib/i18n';
import { LANGUAGE_OPTIONS } from '@/lib/i18n';

// ============================================================================
// Flag SVG Components
// ============================================================================

const AustraliaFlag = ({ className = "w-8 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
    <path fill="#00008B" d="M0 0h640v480H0z"/>
    <path fill="#FFF" d="M0 0v27.95L307.037 250h38.647v-27.95L38.647 0H0zm345.684 0v27.95L38.647 250H0v-27.95L307.037 0h38.647z"/>
    <path fill="#FFF" d="M144.035 0v250h57.614V0h-57.614zM0 83.333v83.334h345.684V83.333H0z"/>
    <path fill="#C8102E" d="M0 100v50h345.684v-50H0zM155.573 0v250h34.538V0h-34.538zM0 250l115.228-83.333h25.765L25.765 250H0zM0 0l115.228 83.333H89.463L0 18.633V0zm204.691 83.333L319.919 0h25.765L230.456 83.333h-25.765zm140.993 166.667l-115.228-83.333h25.765l89.463 64.7v18.633z"/>
    <path fill="#FFF" d="M299.642 392.523l-10.565 26.692 22.24-16.795h-27.89l22.24 16.795-10.565-26.692zm-64.89-136.19l-7.043 17.795 14.827-11.197h-18.593l14.826 11.197-7.043-17.795zm0 119.048l-7.043 17.794 14.827-11.196h-18.593l14.826 11.196-7.043-17.794zm64.89-59.524l-7.043 17.795 14.827-11.197h-18.593l14.826 11.197-7.043-17.795zm64.89 0l-7.043 17.795 14.827-11.197h-18.593l14.826 11.197-7.043-17.795zm-32.445 59.524l-7.043 17.794 14.827-11.196h-18.593l14.826 11.196-7.043-17.794z"/>
    <path fill="#FFF" d="M107.684 188.095l-14.087 35.59 29.654-22.393h-37.187l29.654 22.393-14.087-35.59z"/>
  </svg>
);

const IndonesiaFlag = ({ className = "w-8 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
    <path fill="#E70011" d="M0 0h640v240H0z"/>
    <path fill="#FFF" d="M0 240h640v240H0z"/>
  </svg>
);

const FlagIcon = ({ locale, className = "w-8 h-6" }: { locale: string; className?: string }) => {
  if (locale === 'en') return <AustraliaFlag className={className} />;
  if (locale === 'id') return <IndonesiaFlag className={className} />;
  return null;
};

// ============================================================================
// Types
// ============================================================================

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Language Selector Modal (Bottom Sheet Style)
 * 
 * A mobile-friendly bottom sheet modal for selecting language.
 * Shows flag + language name for each option.
 * 
 * @specification Multi-language support for customer pages
 */
export function LanguageSelectorModal({ isOpen, onClose }: LanguageSelectorModalProps) {
  const { locale, setLocale, t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle language selection
  const handleSelect = (newLocale: Locale) => {
    setLocale(newLocale);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[200] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet Modal */}
      <div
        ref={modalRef}
        className="fixed bottom-0 left-0 right-0 z-[201] bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl transform transition-transform duration-300 ease-out max-w-[500px] mx-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="language-modal-title"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="language-modal-title"
            className="text-lg font-semibold text-gray-900 dark:text-white text-center"
          >
            {t('common.selectLanguage') || 'Select Language'}
          </h2>
        </div>

        {/* Language Options */}
        <div className="p-4 space-y-2">
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={`
                w-full flex items-center gap-4 px-4 py-4 rounded-xl
                transition-all duration-150
                ${locale === lang.code
                  ? 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500'
                  : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
              aria-pressed={locale === lang.code}
            >
              {/* Flag SVG */}
              <div className="rounded overflow-hidden">
                <FlagIcon locale={lang.code} className="w-10 h-7" />
              </div>

              {/* Language Info */}
              <div className="flex-1 text-left">
                <p className={`font-medium ${
                  locale === lang.code
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {lang.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {lang.nativeName}
                </p>
              </div>

              {/* Checkmark for selected */}
              {locale === lang.code && (
                <svg
                  className="w-6 h-6 text-orange-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
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

        {/* Safe area padding for mobile */}
        <div className="h-6" />
      </div>
    </>
  );
}

export default LanguageSelectorModal;
