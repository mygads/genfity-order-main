/**
 * useImageUpload Hook
 * Hook for uploading images with progress tracking
 */

'use client';

import { useState, useCallback, useRef } from 'react';

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface UploadState {
  progress: number;
  status: UploadStatus;
  error: string | null;
  previewUrl: string | null;
  uploadedUrl: string | null;
  file: File | null;
}

interface UseImageUploadOptions {
  /** API endpoint for upload */
  uploadUrl: string;
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Allowed file types */
  allowedTypes?: string[];
  /** Callback on upload success */
  onSuccess?: (url: string) => void;
  /** Callback on upload error */
  onError?: (error: string) => void;
  /** Callback on progress update */
  onProgress?: (progress: number) => void;
  /** Additional form data to send */
  additionalData?: Record<string, string>;
}

interface UseImageUploadReturn extends UploadState {
  /** Select and start uploading a file */
  uploadFile: (file: File) => Promise<string | null>;
  /** Cancel the current upload */
  cancelUpload: () => void;
  /** Retry the last failed upload */
  retryUpload: () => Promise<string | null>;
  /** Reset the upload state */
  reset: () => void;
  /** Check if a file is valid */
  validateFile: (file: File) => { valid: boolean; error?: string };
}

const initialState: UploadState = {
  progress: 0,
  status: 'idle',
  error: null,
  previewUrl: null,
  uploadedUrl: null,
  file: null,
};

export function useImageUpload(options: UseImageUploadOptions): UseImageUploadReturn {
  const {
    uploadUrl,
    maxSizeMB = 5,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    onSuccess,
    onError,
    onProgress,
    additionalData,
  } = options;

  const [state, setState] = useState<UploadState>(initialState);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const lastFileRef = useRef<File | null>(null);

  // Validate file before upload
  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        return {
          valid: false,
          error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
        };
      }

      // Check file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        return {
          valid: false,
          error: `File too large. Maximum size: ${maxSizeMB}MB`,
        };
      }

      return { valid: true };
    },
    [allowedTypes, maxSizeMB]
  );

  // Create preview URL
  const createPreview = useCallback((file: File): string => {
    return URL.createObjectURL(file);
  }, []);

  // Upload file with XHR for progress tracking
  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: validation.error || 'Invalid file',
        }));
        onError?.(validation.error || 'Invalid file');
        return null;
      }

      // Store file for retry
      lastFileRef.current = file;

      // Create preview
      const previewUrl = createPreview(file);

      // Update state
      setState({
        progress: 0,
        status: 'uploading',
        error: null,
        previewUrl,
        uploadedUrl: null,
        file,
      });

      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        // Progress handler
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setState((prev) => ({ ...prev, progress }));
            onProgress?.(progress);
          }
        });

        // Load complete handler
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              const uploadedUrl = response.url || response.data?.url;

              setState((prev) => ({
                ...prev,
                status: 'completed',
                progress: 100,
                uploadedUrl,
              }));

              onSuccess?.(uploadedUrl);
              resolve(uploadedUrl);
            } catch {
              const error = 'Failed to parse upload response';
              setState((prev) => ({
                ...prev,
                status: 'error',
                error,
              }));
              onError?.(error);
              resolve(null);
            }
          } else {
            let error = 'Upload failed';
            try {
              const response = JSON.parse(xhr.responseText);
              error = response.message || response.error || error;
            } catch {
              // Keep default error
            }

            setState((prev) => ({
              ...prev,
              status: 'error',
              error,
            }));
            onError?.(error);
            resolve(null);
          }
        });

        // Error handler
        xhr.addEventListener('error', () => {
          const error = 'Network error during upload';
          setState((prev) => ({
            ...prev,
            status: 'error',
            error,
          }));
          onError?.(error);
          resolve(null);
        });

        // Abort handler
        xhr.addEventListener('abort', () => {
          setState((prev) => ({
            ...prev,
            status: 'idle',
            progress: 0,
          }));
          resolve(null);
        });

        // Prepare form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('filename', file.name);

        // Add additional data
        if (additionalData) {
          Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, value);
          });
        }

        // Get auth token
        const token = localStorage.getItem('accessToken');

        // Open and send request
        xhr.open('POST', uploadUrl);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.send(formData);
      });
    },
    [uploadUrl, validateFile, createPreview, onSuccess, onError, onProgress, additionalData]
  );

  // Cancel upload
  const cancelUpload = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
  }, []);

  // Retry upload
  const retryUpload = useCallback(async (): Promise<string | null> => {
    if (lastFileRef.current) {
      return uploadFile(lastFileRef.current);
    }
    return null;
  }, [uploadFile]);

  // Reset state
  const reset = useCallback(() => {
    cancelUpload();
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }
    setState(initialState);
    lastFileRef.current = null;
  }, [cancelUpload, state.previewUrl]);

  return {
    ...state,
    uploadFile,
    cancelUpload,
    retryUpload,
    reset,
    validateFile,
  };
}

export default useImageUpload;
