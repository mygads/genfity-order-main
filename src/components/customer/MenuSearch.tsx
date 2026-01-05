/**
 * Menu Search Component for Customer
 * 
 * Features:
 * - Real-time search with debounce
 * - Fuzzy matching results
 * - Recent searches
 * - Popular searches
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isPromo: boolean;
  promoPrice: number | null;
  isSpicy: boolean;
  isBestSeller: boolean;
  isSignature: boolean;
  isRecommended: boolean;
  trackStock: boolean;
  stockQty: number | null;
  categories: Array<{ id: string; name: string }>;
  relevanceScore: number;
}

interface MenuSearchProps {
  merchantCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: MenuItem) => void;
  currency: string;
}

const RECENT_SEARCHES_KEY = 'genfity_recent_searches';
const MAX_RECENT_SEARCHES = 5;

export default function MenuSearch({
  merchantCode,
  isOpen,
  onClose,
  onSelectItem,
  currency,
}: MenuSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`${RECENT_SEARCHES_KEY}_${merchantCode}`);
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, [merchantCode]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const updated = [
      searchQuery,
      ...recentSearches.filter(s => s.toLowerCase() !== searchQuery.toLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(updated);
    localStorage.setItem(`${RECENT_SEARCHES_KEY}_${merchantCode}`, JSON.stringify(updated));
  }, [merchantCode, recentSearches]);

  // Search with debounce
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/public/merchants/${merchantCode}/menus/search?q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();

      if (data.success) {
        setResults(data.data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [merchantCode]);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  // Handle item selection
  const handleSelectItem = (item: MenuItem) => {
    saveRecentSearch(query);
    onSelectItem(item);
    onClose();
  };

  // Handle recent search click
  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    handleSearch(search);
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(`${RECENT_SEARCHES_KEY}_${merchantCode}`);
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency || 'AUD',
    }).format(price);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="flex items-center px-4 py-3 gap-3">
          {/* Back button */}
          <button
            onClick={onClose}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Back"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Search input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder={t('customer.search.placeholder')}
              className="w-full h-10 pl-10 pr-4 bg-gray-100 rounded-full text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Clear button */}
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                inputRef.current?.focus();
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Results */}
        {!isLoading && results.length > 0 && (
          <div className="px-4 py-4 space-y-3">
            <p className="text-sm text-gray-500">
              {results.length} {t('customer.search.resultsFound')}
            </p>
            {results.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectItem(item)}
                className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-orange-300 transition-colors text-left"
              >
                {/* Image */}
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <h3 className="font-medium text-gray-900 truncate">
                      {item.name}
                    </h3>
                    {/* Badges */}
                    <div className="flex gap-1 shrink-0">
                      {item.isSpicy && (
                        <span className="text-xs">🌶️</span>
                      )}
                      {item.isBestSeller && (
                        <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                          Best
                        </span>
                      )}
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                      {item.description}
                    </p>
                  )}
                  {/* Price */}
                  <div className="mt-1">
                    {item.isPromo && item.promoPrice ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-orange-600">
                          {formatPrice(item.promoPrice)}
                        </span>
                        <span className="text-xs text-gray-400 line-through">
                          {formatPrice(item.price)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-gray-900">
                        {formatPrice(item.price)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock warning */}
                {item.trackStock && item.stockQty !== null && item.stockQty <= 5 && (
                  <span className="text-xs text-orange-600 shrink-0">
                    {item.stockQty === 0 ? t('customer.menu.outOfStock') : `${item.stockQty} left`}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {!isLoading && query.length >= 2 && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-500 text-center">
              {t('customer.search.noResults')} &quot;{query}&quot;
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {t('customer.search.tryDifferent')}
            </p>
          </div>
        )}

        {/* Recent searches (when no query) */}
        {!query && recentSearches.length > 0 && (
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">
                {t('customer.search.recentSearches')}
              </p>
              <button
                onClick={clearRecentSearches}
                className="text-xs text-orange-600 hover:underline"
              >
                {t('common.clearAll')}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearchClick(search)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state (no query, no recent) */}
        {!query && recentSearches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-500 text-center">
              {t('customer.search.startTyping')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
