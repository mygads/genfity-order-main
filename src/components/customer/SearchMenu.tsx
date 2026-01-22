/**
 * SearchMenu Component
 * 
 * Full-text search with fuzzy matching for menu items
 * Features:
 * - Real-time search with debounce
 * - Fuzzy matching for typo tolerance
 * - Category and price filters
 * - Recent searches
 * - Search suggestions
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import Image from 'next/image';
import { CloseIcon } from '@/icons';
import { buildOrderApiUrl } from '@/lib/utils/orderApiBase';

// SVG Search Icon (inline because it's not in icons)
const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

interface SearchResult {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  isSpicy?: boolean;
  isBestSeller?: boolean;
  isSignature?: boolean;
  isPromo?: boolean;
  promoPrice?: number | null;
  categories: Array<{ id: string; name: string }>;
}

interface SearchMenuProps {
  merchantCode: string;
  onSelectItem?: (item: SearchResult) => void;
  onClose?: () => void;
  placeholder?: string;
  className?: string;
}

const RECENT_SEARCHES_KEY = 'genfity_recent_searches';
const MAX_RECENT_SEARCHES = 5;

export default function SearchMenu({
  merchantCode,
  onSelectItem,
  onClose,
  placeholder = 'Search menu...',
  className = '',
}: SearchMenuProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({});
  const [showFilters, setShowFilters] = useState(false);

  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`${RECENT_SEARCHES_KEY}_${merchantCode}`);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, [merchantCode]);

  // Save recent search
  const saveRecentSearch = useCallback((searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(`${RECENT_SEARCHES_KEY}_${merchantCode}`, JSON.stringify(updated));
      return updated;
    });
  }, [merchantCode]);

  // Search API call
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '20',
      });

      if (selectedCategory) {
        params.set('categoryId', selectedCategory);
      }
      if (priceRange.min !== undefined) {
        params.set('minPrice', priceRange.min.toString());
      }
      if (priceRange.max !== undefined) {
        params.set('maxPrice', priceRange.max.toString());
      }

      const response = await fetch(
        buildOrderApiUrl(`/api/public/merchants/${merchantCode}/menus/search?${params.toString()}`)
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const menus = data.data?.menus ?? data.data ?? [];
          setResults(Array.isArray(menus) ? menus : []);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [merchantCode, selectedCategory, priceRange]);

  // Trigger search on debounced query change
  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle item selection
  const handleSelectItem = (item: SearchResult) => {
    saveRecentSearch(query);
    setIsOpen(false);
    onSelectItem?.(item);
  };

  // Handle recent search click
  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    setIsOpen(true);
    inputRef.current?.focus();
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
      currency: 'AUD',
    }).format(price);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg 
                     bg-white
                     focus:ring-2 focus:ring-orange-500 focus:border-transparent
                     placeholder-gray-400
                     text-gray-900"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <CloseIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Search Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[70vh] overflow-hidden">
          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-4 py-2 text-xs text-left text-gray-500 hover:bg-gray-50 flex items-center justify-between"
          >
            <span>Filters {selectedCategory || priceRange.min || priceRange.max ? '(Active)' : ''}</span>
            <span className="text-gray-400">{showFilters ? '▲' : '▼'}</span>
          </button>

          {/* Filters Panel */}
          {showFilters && (
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="space-y-3">
                {/* Price Range */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Price Range</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min || ''}
                      onChange={(e) => setPriceRange(prev => ({
                        ...prev,
                        min: e.target.value ? parseFloat(e.target.value) : undefined
                      }))}
                      className="w-1/2 px-2 py-1 text-sm border rounded"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max || ''}
                      onChange={(e) => setPriceRange(prev => ({
                        ...prev,
                        max: e.target.value ? parseFloat(e.target.value) : undefined
                      }))}
                      className="w-1/2 px-2 py-1 text-sm border rounded"
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                <button
                  onClick={() => {
                    setSelectedCategory('');
                    setPriceRange({});
                  }}
                  className="text-xs text-orange-500 hover:text-orange-600"
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="px-4 py-8 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-r-transparent" />
              <p className="mt-2 text-sm text-gray-500">Searching...</p>
            </div>
          )}

          {/* Results */}
          {!isLoading && results.length > 0 && (
            <div className="overflow-y-auto max-h-[50vh]">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                >
                  {/* Image */}
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
                        🍽️
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 truncate">
                        {item.name}
                      </h4>
                      {/* Badge Icons - Matching order page style */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.isBestSeller && (
                          <div style={{ width: '18px', height: '18px', position: 'relative', borderRadius: '50%', overflow: 'hidden' }}>
                            <Image src="/images/menu-badges/best-seller.png" alt="Best Seller" fill className="object-cover" />
                          </div>
                        )}
                        {item.isSignature && (
                          <div style={{ width: '18px', height: '18px', position: 'relative', borderRadius: '50%', overflow: 'hidden' }}>
                            <Image src="/images/menu-badges/signature.png" alt="Signature" fill className="object-cover" />
                          </div>
                        )}
                        {item.isSpicy && (
                          <div style={{ width: '18px', height: '18px', position: 'relative', borderRadius: '50%', overflow: 'hidden' }}>
                            <Image src="/images/menu-badges/spicy.png" alt="Spicy" fill className="object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 truncate">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {item.isPromo && item.promoPrice ? (
                        <>
                          <span className="text-sm font-medium text-orange-500">
                            {formatPrice(item.promoPrice)}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(item.price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-gray-900">
                          {formatPrice(item.price)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {!isLoading && query && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-500">No items found for &quot;{query}&quot;</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
            </div>
          )}

          {/* Recent Searches (when no query) */}
          {!query && recentSearches.length > 0 && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">Recent Searches</span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(search)}
                    className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2"
                  >
                    <SearchIcon className="h-4 w-4 text-gray-400" />
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!query && recentSearches.length === 0 && (
            <div className="px-4 py-8 text-center">
              <SearchIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Search for menu items</p>
              <p className="text-xs text-gray-400 mt-1">Find your favorite dishes</p>
            </div>
          )}
        </div>
      )}

      {/* Close button for modal mode */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-0 right-0 -mt-10 p-2 text-gray-400 hover:text-gray-600"
        >
          <CloseIcon className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
