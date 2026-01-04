"use client";

import React, { useState, useCallback, useMemo } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/ToastContainer";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import { useSWRWithAuth } from "@/hooks/useSWRWithAuth";
import Image from "next/image";
import { FaSearch, FaPlus, FaTrash, FaEdit, FaTimes, FaUpload, FaImages } from "react-icons/fa";

interface StockPhoto {
  id: string;
  category: string;
  name: string;
  imageUrl: string;
  thumbnailUrl?: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
}

interface Category {
  name: string;
  count: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface StockPhotosApiResponse {
  success: boolean;
  data: {
    photos: StockPhoto[];
    categories: Category[];
    pagination: Pagination;
  };
}

export default function StockPhotosPage() {
  const { toasts, success: showSuccess, error: showError } = useToast();

  // Filter and pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 24;

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<StockPhoto | null>(null);
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    photoId: "",
    photoName: "",
  });

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    category: "",
    name: "",
    imageUrl: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Build API URL with filters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.append("category", selectedCategory);
    if (searchQuery) params.append("search", searchQuery);
    params.append("page", currentPage.toString());
    params.append("limit", limit.toString());
    return `/api/admin/stock-photos?${params.toString()}`;
  }, [selectedCategory, searchQuery, currentPage]);

  // Fetch stock photos - disable revalidateOnFocus to prevent unnecessary refetching
  const { data, error, isLoading, mutate } = useSWRWithAuth<StockPhotosApiResponse>(apiUrl, {
    revalidateOnFocus: false,
  });

  const photos = data?.data?.photos || [];
  const categories = data?.data?.categories || [];
  const pagination = data?.data?.pagination || { page: 1, limit: 24, total: 0, totalPages: 0 };

  // Handle search with debounce
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  // Handle category filter
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  }, []);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file', 'Invalid File');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showError('File size must be less than 5MB', 'File Too Large');
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  // Cleanup preview URL on unmount
  const clearUploadForm = useCallback(() => {
    setUploadForm({ category: "", name: "", imageUrl: "" });
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setUploadProgress(0);
  }, [previewUrl]);

  // Handle upload
  const handleUpload = async () => {
    if (!uploadForm.category || !uploadForm.name || !selectedFile) {
      showError("Please fill in all required fields and select an image", "Validation Error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem("accessToken");

      // Step 1: Upload image to blob storage
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Use XMLHttpRequest for progress tracking
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 90); // 90% for upload
            setUploadProgress(percentComplete);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
              resolve(data.data.url);
            } else {
              reject(new Error(data.message || 'Failed to upload image'));
            }
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.message || 'Failed to upload image'));
            } catch {
              reject(new Error('Failed to upload image'));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('POST', '/api/admin/stock-photos/upload');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      setUploadProgress(95);

      // Step 2: Create stock photo record
      const response = await fetch("/api/admin/stock-photos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: uploadForm.category,
          name: uploadForm.name,
          imageUrl: imageUrl,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setUploadProgress(100);
        showSuccess("Stock photo uploaded successfully", "Success");
        setIsUploadModalOpen(false);
        clearUploadForm();
        mutate();
      } else {
        showError(result.message || "Failed to create stock photo", "Upload Failed");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to upload photo", "Upload Failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle edit
  const handleEdit = async () => {
    if (!editingPhoto) return;

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`/api/admin/stock-photos/${editingPhoto.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: editingPhoto.category,
          name: editingPhoto.name,
          imageUrl: editingPhoto.imageUrl,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess("Stock photo updated successfully", "Success");
        setIsEditModalOpen(false);
        setEditingPhoto(null);
        mutate();
      } else {
        showError(result.message || "Failed to update photo", "Update Failed");
      }
    } catch {
      showError("Failed to update photo", "Update Failed");
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`/api/admin/stock-photos/${deleteDialog.photoId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        showSuccess("Stock photo deleted successfully", "Success");
        setDeleteDialog({ isOpen: false, photoId: "", photoName: "" });
        mutate();
      } else {
        showError(result.message || "Failed to delete photo", "Delete Failed");
      }
    } catch {
      showError("Failed to delete photo", "Delete Failed");
    }
  };

  // Open edit modal
  const openEditModal = (photo: StockPhoto) => {
    setEditingPhoto({ ...photo });
    setIsEditModalOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (photo: StockPhoto) => {
    setDeleteDialog({
      isOpen: true,
      photoId: photo.id,
      photoName: photo.name,
    });
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Stock Photos" />
      <ToastContainer toasts={toasts} />

      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Stock Photo Library
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage stock photos for merchants to use in their menus
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin/dashboard/stock-photos/bulk-upload"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <FaUpload className="h-4 w-4" />
              Bulk Upload
            </a>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              <FaPlus className="h-4 w-4" />
              Upload Photo
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or category..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Category Filter - Searchable Dropdown */}
          <div className="relative min-w-[200px]">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-4 pr-10 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Categories ({pagination.total})</option>
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">Failed to load stock photos</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && photos.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <FaImages className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No stock photos yet
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Upload your first stock photo for merchants to use
          </p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <FaPlus className="h-4 w-4" />
            Upload Photo
          </button>
        </div>
      )}

      {/* Photo Grid */}
      {!isLoading && !error && photos.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
            >
              {/* Image */}
              <div className="aspect-square relative">
                <Image
                  src={photo.thumbnailUrl || photo.imageUrl}
                  alt={photo.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => openEditModal(photo)}
                    className="rounded-lg bg-white p-2 text-gray-700 hover:bg-gray-100"
                    title="Edit"
                  >
                    <FaEdit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openDeleteDialog(photo)}
                    className="rounded-lg bg-white p-2 text-red-600 hover:bg-red-50"
                    title="Delete"
                  >
                    <FaTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {photo.name}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {photo.category}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Used {photo.usageCount} times
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-700"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={currentPage === pagination.totalPages}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-700"
          >
            Next
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Upload Stock Photo
              </h2>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  clearUploadForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category Input */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Burger, Pizza, Drinks"
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  list="category-suggestions"
                />
                <datalist id="category-suggestions">
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name} />
                  ))}
                </datalist>
              </div>

              {/* Name Input */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Photo Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Classic Cheeseburger"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Image *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="stock-photo-upload"
                  />
                  <label
                    htmlFor="stock-photo-upload"
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-center transition-colors hover:border-brand-500 dark:border-gray-600 dark:hover:border-brand-500"
                  >
                    {selectedFile ? (
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {selectedFile.name}
                      </span>
                    ) : (
                      <>
                        <FaUpload className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          Click to select image
                        </span>
                      </>
                    )}
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Max file size: 5MB. Supports JPG, PNG, WebP, etc.
                </p>
              </div>

              {/* Preview */}
              {previewUrl && (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (previewUrl) {
                        URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                      }
                    }}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                  >
                    <FaTimes className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && uploadProgress > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full bg-brand-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    clearUploadForm();
                  }}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !selectedFile || !uploadForm.category || !uploadForm.name}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaUpload className="h-4 w-4" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Stock Photo
              </h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingPhoto(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category Input */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category *
                </label>
                <input
                  type="text"
                  value={editingPhoto.category}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Name Input */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Photo Name *
                </label>
                <input
                  type="text"
                  value={editingPhoto.name}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Image URL Input */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Image URL *
                </label>
                <input
                  type="url"
                  value={editingPhoto.imageUrl}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, imageUrl: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Preview */}
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <Image
                  src={editingPhoto.imageUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingPhoto(null);
                  }}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Stock Photo"
        message={`Are you sure you want to delete "${deleteDialog.photoName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, photoId: "", photoName: "" })}
        variant="danger"
      />
    </div>
  );
}
