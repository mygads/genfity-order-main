"use client";

import React, { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { FaSearch, FaTimes, FaImages, FaUpload, FaExchangeAlt } from "react-icons/fa";
import { useSWRWithAuth } from "@/hooks/useSWRWithAuth";

interface StockPhoto {
  id: string;
  category: string;
  name: string;
  imageUrl: string;
  thumbnailUrl?: string;
}

interface Category {
  name: string;
  count: number;
}

interface StockPhotosApiResponse {
  success: boolean;
  data: {
    photos: StockPhoto[];
    categories: Category[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface StockPhotoPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  currentImageUrl?: string;
}

/**
 * Stock Photo Picker Modal
 * Allows merchants to browse and select stock photos for menu items
 */
export default function StockPhotoPicker({
  isOpen,
  onClose,
  onSelect,
  currentImageUrl,
}: StockPhotoPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 24;

  // Build API URL with filters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.append("category", selectedCategory);
    if (searchQuery) params.append("search", searchQuery);
    params.append("page", currentPage.toString());
    params.append("limit", limit.toString());
    return `/api/merchant/stock-photos?${params.toString()}`;
  }, [selectedCategory, searchQuery, currentPage]);

  // Fetch stock photos
  const { data, isLoading } = useSWRWithAuth<StockPhotosApiResponse>(
    isOpen ? apiUrl : null
  );

  const photos = data?.data?.photos || [];
  const categories = data?.data?.categories || [];
  const pagination = data?.data?.pagination || { page: 1, limit: 24, total: 0, totalPages: 0 };

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  // Handle category filter
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  }, []);

  // Handle photo selection
  const handleSelect = async (photo: StockPhoto) => {
    // Track usage
    try {
      const token = localStorage.getItem("accessToken");
      await fetch(`/api/merchant/stock-photos/${photo.id}/use`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Silently fail usage tracking
    }

    onSelect(photo.imageUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Choose from Stock Photos
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select a professional photo for your menu item
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          {/* Search */}
          <div className="relative mb-4">
            <FaSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or category..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCategoryChange("")}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                selectedCategory === ""
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategoryChange(cat.name)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  selectedCategory === cat.name
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Photo Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          )}

          {!isLoading && photos.length === 0 && (
            <div className="py-12 text-center">
              <FaImages className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                No stock photos found
              </p>
            </div>
          )}

          {!isLoading && photos.length > 0 && (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => handleSelect(photo)}
                  className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all hover:shadow-lg ${
                    currentImageUrl === photo.imageUrl
                      ? "border-brand-500 ring-2 ring-brand-500"
                      : "border-transparent hover:border-brand-300"
                  }`}
                >
                  <Image
                    src={photo.thumbnailUrl || photo.imageUrl}
                    alt={photo.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {/* Overlay with name */}
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="truncate text-xs font-medium text-white">
                      {photo.name}
                    </p>
                  </div>
                  {/* Selected indicator */}
                  {currentImageUrl === photo.imageUrl && (
                    <div className="absolute right-1 top-1 rounded-full bg-brand-500 p-1">
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-700"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Image Source Selector Component
 * Toggle between upload own image or select from stock photos
 */
interface ImageSourceSelectorProps {
  imageUrl?: string;
  onImageChange: (url: string) => void;
  onUploadClick: () => void;
  label?: string;
}

export function ImageSourceSelector({
  imageUrl,
  onImageChange,
  onUploadClick,
  label = "Menu Image",
}: ImageSourceSelectorProps) {
  const [isStockPickerOpen, setIsStockPickerOpen] = useState(false);
  const [imageSource, setImageSource] = useState<"upload" | "stock">("upload");

  const handleStockSelect = (url: string) => {
    onImageChange(url);
    setImageSource("stock");
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      {/* Source Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setImageSource("upload");
            onUploadClick();
          }}
          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            imageSource === "upload"
              ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400"
              : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
          }`}
        >
          <FaUpload className="h-4 w-4" />
          Upload Photo
        </button>
        <button
          type="button"
          onClick={() => setIsStockPickerOpen(true)}
          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            imageSource === "stock"
              ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400"
              : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
          }`}
        >
          <FaImages className="h-4 w-4" />
          Stock Photos
        </button>
      </div>

      {/* Image Preview */}
      {imageUrl && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <Image
            src={imageUrl}
            alt="Preview"
            fill
            className="object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={() => setIsStockPickerOpen(true)}
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-white"
          >
            <FaExchangeAlt className="h-3 w-3" />
            Change
          </button>
        </div>
      )}

      {/* Stock Photo Picker Modal */}
      <StockPhotoPicker
        isOpen={isStockPickerOpen}
        onClose={() => setIsStockPickerOpen(false)}
        onSelect={handleStockSelect}
        currentImageUrl={imageUrl}
      />
    </div>
  );
}
