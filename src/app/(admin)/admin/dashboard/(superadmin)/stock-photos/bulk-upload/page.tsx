"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/ToastContainer";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import { FaUpload, FaTrash, FaTimes, FaSave, FaArrowLeft, FaPlus, FaCheck } from "react-icons/fa";

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  category: string;
  uploadedUrl?: string;
  uploadStatus: "pending" | "uploading" | "uploaded" | "error";
  uploadProgress: number;
  errorMessage?: string;
}

// Common food categories for suggestions
const CATEGORY_SUGGESTIONS = [
  "Burger",
  "Pizza",
  "Pasta",
  "Salad",
  "Dessert",
  "Drinks",
  "Coffee",
  "Tea",
  "Sandwich",
  "Kebab",
  "Rice",
  "Noodles",
  "Soup",
  "Seafood",
  "Chicken",
  "Beef",
  "Vegetarian",
  "Breakfast",
  "Snacks",
  "Sides",
];

export default function BulkUploadStockPhotosPage() {
  const router = useRouter();
  const { toasts, success: showSuccess, error: showError } = useToast();

  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [defaultCategory, setDefaultCategory] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Generate unique ID
  const generateId = () => `photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Handle file selection (single or multiple)
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: PendingPhoto[] = [];

    Array.from(files).forEach((file) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        showError(`"${file.name}" is not an image file`, "Invalid File");
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        showError(`"${file.name}" exceeds 5MB limit`, "File Too Large");
        return;
      }

      // Generate name from filename (remove extension, capitalize)
      const nameFromFile = file.name
        .replace(/\.[^.]+$/, "") // Remove extension
        .replace(/[-_]/g, " ") // Replace dashes/underscores with spaces
        .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize words

      newPhotos.push({
        id: generateId(),
        file,
        previewUrl: URL.createObjectURL(file),
        name: nameFromFile,
        category: defaultCategory,
        uploadStatus: "pending",
        uploadProgress: 0,
      });
    });

    setPendingPhotos((prev) => [...prev, ...newPhotos]);

    // Reset input
    e.target.value = "";
  }, [defaultCategory, showError]);

  // Update photo details
  const updatePhoto = useCallback((id: string, updates: Partial<PendingPhoto>) => {
    setPendingPhotos((prev) =>
      prev.map((photo) => (photo.id === id ? { ...photo, ...updates } : photo))
    );
  }, []);

  // Remove single photo
  const removePhoto = useCallback(async (id: string) => {
    const photo = pendingPhotos.find((p) => p.id === id);
    if (!photo) return;

    // Revoke preview URL
    URL.revokeObjectURL(photo.previewUrl);

    // If already uploaded to blob, delete it
    if (photo.uploadedUrl) {
      try {
        const token = localStorage.getItem("accessToken");
        await fetch("/api/admin/stock-photos/delete-blob", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url: photo.uploadedUrl }),
        });
      } catch {
        // Silently fail - blob will be orphaned but that's okay
        console.warn("Failed to delete blob:", photo.uploadedUrl);
      }
    }

    setPendingPhotos((prev) => prev.filter((p) => p.id !== id));
    setShowDeleteConfirm(null);
  }, [pendingPhotos]);

  // Remove all photos
  const removeAllPhotos = useCallback(async () => {
    // Delete all blobs that were uploaded
    const uploadedPhotos = pendingPhotos.filter((p) => p.uploadedUrl);
    const token = localStorage.getItem("accessToken");

    for (const photo of uploadedPhotos) {
      try {
        await fetch("/api/admin/stock-photos/delete-blob", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url: photo.uploadedUrl }),
        });
      } catch {
        console.warn("Failed to delete blob:", photo.uploadedUrl);
      }
    }

    // Revoke all preview URLs
    pendingPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));

    setPendingPhotos([]);
    setShowCancelConfirm(false);
  }, [pendingPhotos]);

  // Upload single photo to blob
  const uploadPhotoToBlob = async (photo: PendingPhoto): Promise<string> => {
    const token = localStorage.getItem("accessToken");
    const formData = new FormData();
    formData.append("file", photo.file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          updatePhoto(photo.id, { uploadProgress: progress });
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
              resolve(data.data.url);
            } else {
              reject(new Error(data.message || "Upload failed"));
            }
          } catch {
            reject(new Error("Invalid response"));
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            reject(new Error(data.message || "Upload failed"));
          } catch {
            reject(new Error("Upload failed"));
          }
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Network error")));
      xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

      xhr.open("POST", "/api/admin/stock-photos/upload");
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(formData);
    });
  };

  // Save all photos
  const handleSaveAll = async () => {
    // Validate all photos have name and category
    const invalidPhotos = pendingPhotos.filter((p) => !p.name.trim() || !p.category.trim());
    if (invalidPhotos.length > 0) {
      showError(
        `${invalidPhotos.length} photo(s) are missing name or category`,
        "Validation Error"
      );
      return;
    }

    if (pendingPhotos.length === 0) {
      showError("No photos to save", "Error");
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem("accessToken");

      // Upload all photos to blob storage first
      for (const photo of pendingPhotos) {
        if (photo.uploadStatus === "uploaded" && photo.uploadedUrl) {
          continue; // Already uploaded
        }

        updatePhoto(photo.id, { uploadStatus: "uploading", uploadProgress: 0 });

        try {
          const uploadedUrl = await uploadPhotoToBlob(photo);
          updatePhoto(photo.id, {
            uploadStatus: "uploaded",
            uploadedUrl,
            uploadProgress: 100,
          });
        } catch (err) {
          updatePhoto(photo.id, {
            uploadStatus: "error",
            errorMessage: err instanceof Error ? err.message : "Upload failed",
          });
          throw err;
        }
      }

      // Get all uploaded photos
      const uploadedPhotos = pendingPhotos.filter((p) => p.uploadedUrl || p.uploadStatus === "uploaded");
      
      // Get updated state after uploads
      const latestPhotos = await new Promise<PendingPhoto[]>((resolve) => {
        setPendingPhotos((current) => {
          resolve(current);
          return current;
        });
      });

      // Group by category for bulk API
      const photosByCategory: Record<string, Array<{ name: string; imageUrl: string }>> = {};
      
      for (const photo of latestPhotos) {
        if (!photo.uploadedUrl) continue;
        
        const cat = photo.category.trim();
        if (!photosByCategory[cat]) {
          photosByCategory[cat] = [];
        }
        photosByCategory[cat].push({
          name: photo.name.trim(),
          imageUrl: photo.uploadedUrl,
        });
      }

      // Create stock photo records using bulk API for each category
      let totalCreated = 0;
      for (const [category, photos] of Object.entries(photosByCategory)) {
        const response = await fetch("/api/admin/stock-photos/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ category, photos }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || "Failed to save photos");
        }
        totalCreated += result.data.count;
      }

      showSuccess(`${totalCreated} stock photos saved successfully!`, "Success");

      // Clean up preview URLs
      pendingPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      setPendingPhotos([]);

      // Redirect back to stock photos page
      setTimeout(() => {
        router.push("/admin/dashboard/stock-photos");
      }, 1500);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save photos", "Error");
    } finally {
      setIsSaving(false);
    }
  };

  // Apply default category to all photos without category
  const applyDefaultCategory = useCallback(() => {
    if (!defaultCategory.trim()) return;
    
    setPendingPhotos((prev) =>
      prev.map((photo) =>
        !photo.category.trim()
          ? { ...photo, category: defaultCategory.trim() }
          : photo
      )
    );
    showSuccess(`Applied "${defaultCategory}" to photos without category`, "Success");
  }, [defaultCategory, showSuccess]);

  const hasUnsavedChanges = pendingPhotos.length > 0;

  return (
    <div>
      <PageBreadcrumb
        pageTitle="Bulk Upload Stock Photos"
        customItems={[
          { name: "Dashboard", path: "/admin/dashboard" },
          { name: "Stock Photos", path: "/admin/dashboard/stock-photos" },
          { name: "Bulk Upload" },
        ]}
      />
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Bulk Upload Stock Photos
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload multiple photos at once with category and name assignment
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => hasUnsavedChanges ? setShowCancelConfirm(true) : router.push("/admin/dashboard/stock-photos")}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <FaArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isSaving || pendingPhotos.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <FaSave className="h-4 w-4" />
                  Save All ({pendingPhotos.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Default Category */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Default Category (for new uploads)
            </label>
            <input
              type="text"
              placeholder="e.g., Burger, Pizza, Drinks"
              value={defaultCategory}
              onChange={(e) => setDefaultCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              list="default-category-suggestions"
            />
            <datalist id="default-category-suggestions">
              {CATEGORY_SUGGESTIONS.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <button
            type="button"
            onClick={applyDefaultCategory}
            disabled={!defaultCategory.trim() || pendingPhotos.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <FaCheck className="h-4 w-4" />
            Apply to All
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="mb-6">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="bulk-photo-upload"
        />
        <label
          htmlFor="bulk-photo-upload"
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 transition-colors hover:border-brand-500 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-brand-500 dark:hover:bg-gray-800"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
            <FaPlus className="h-6 w-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Click or drag & drop to upload photos
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Supports JPG, PNG, WebP. Max 5MB each. Upload multiple files at once.
            </p>
          </div>
        </label>
      </div>

      {/* Pending Photos Table */}
      {pendingPhotos.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {/* Table Header */}
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Photos to Upload ({pendingPhotos.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Photo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Name *
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Category *
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {pendingPhotos.map((photo) => (
                  <tr key={photo.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    {/* Photo Preview */}
                    <td className="px-4 py-3">
                      <div className="h-16 w-16 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.previewUrl}
                          alt={photo.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </td>

                    {/* Name Input */}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        placeholder="Photo name"
                        value={photo.name}
                        onChange={(e) => updatePhoto(photo.id, { name: e.target.value })}
                        disabled={photo.uploadStatus === "uploading" || isSaving}
                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:bg-gray-800 dark:text-white ${
                          !photo.name.trim()
                            ? "border-red-300 dark:border-red-600"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                      />
                    </td>

                    {/* Category Input */}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        placeholder="Category"
                        value={photo.category}
                        onChange={(e) => updatePhoto(photo.id, { category: e.target.value })}
                        disabled={photo.uploadStatus === "uploading" || isSaving}
                        list={`category-suggestions-${photo.id}`}
                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:bg-gray-800 dark:text-white ${
                          !photo.category.trim()
                            ? "border-red-300 dark:border-red-600"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                      />
                      <datalist id={`category-suggestions-${photo.id}`}>
                        {CATEGORY_SUGGESTIONS.map((cat) => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {photo.uploadStatus === "pending" && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          Ready
                        </span>
                      )}
                      {photo.uploadStatus === "uploading" && (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {photo.uploadProgress}%
                          </span>
                        </div>
                      )}
                      {photo.uploadStatus === "uploaded" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <FaCheck className="h-3 w-3" />
                          Uploaded
                        </span>
                      )}
                      {photo.uploadStatus === "error" && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400" title={photo.errorMessage}>
                          Error
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(photo.id)}
                        disabled={photo.uploadStatus === "uploading" || isSaving}
                        className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        title="Remove"
                      >
                        <FaTrash className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {pendingPhotos.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <FaUpload className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No photos selected
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Click the upload area above to select photos
          </p>
        </div>
      )}

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Clear All Photos"
        message="Are you sure you want to remove all pending photos? Any uploaded files will be deleted from storage."
        confirmText="Clear All"
        cancelText="Keep Photos"
        onConfirm={removeAllPhotos}
        onCancel={() => setShowCancelConfirm(false)}
        variant="danger"
      />

      {/* Single Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        title="Remove Photo"
        message="Are you sure you want to remove this photo? If already uploaded, it will be deleted from storage."
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={() => showDeleteConfirm && removePhoto(showDeleteConfirm)}
        onCancel={() => setShowDeleteConfirm(null)}
        variant="danger"
      />
    </div>
  );
}
