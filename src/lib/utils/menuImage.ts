import { buildMerchantApiUrl, fetchMerchantApi } from '@/lib/utils/orderApiClient';

export const MENU_THUMB_SIZE = 300;
export const MENU_THUMB_2X_SIZE = 600;

export type PresignResponse = {
  uploadUrl: string;
  publicUrl: string;
};

export type MenuImageBlobs = {
  fullBlob: Blob;
  thumbBlob: Blob;
  thumb2xBlob: Blob;
  sourceWidth: number;
  sourceHeight: number;
  sourceFormat: string | null;
};

export type MenuThumbMeta = {
  format: string;
  source: {
    width: number;
    height: number;
    format: string | null;
  };
  variants: Array<{ dpr: number; width: number; height: number; url: string }>;
};

export type MenuImageUploadApiResult = {
  imageUrl: string;
  imageThumbUrl: string;
  imageThumb2xUrl: string | null;
  imageThumbMeta: MenuThumbMeta;
  warnings: string[];
};

export type MenuImageMessages = {
  prepareFailed: string;
  invalidResponse: string;
  uploadFailed: string;
  networkError: string;
  uploadCancelled: string;
  canvasUnsupported: string;
  thumbnailFailed: string;
};

const DEFAULT_MENU_IMAGE_MESSAGES: MenuImageMessages = {
  prepareFailed: 'Failed to prepare upload',
  invalidResponse: 'Invalid upload response',
  uploadFailed: 'Failed to upload image',
  networkError: 'Network error',
  uploadCancelled: 'Upload cancelled',
  canvasUnsupported: 'Canvas is not supported',
  thumbnailFailed: 'Failed to create thumbnail',
};

export const requestPresignedUpload = async (
  token: string,
  body: {
    type: string;
    contentType: string;
    fileSize: number;
    menuId?: string;
    allowTemp?: boolean;
  },
  messages: MenuImageMessages = DEFAULT_MENU_IMAGE_MESSAGES
): Promise<PresignResponse> => {
  const response = await fetchMerchantApi('/api/merchant/upload/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    token,
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(data?.message || messages.prepareFailed);
  }

  const { uploadUrl, publicUrl } = data.data || {};
  if (!uploadUrl || !publicUrl) {
    throw new Error(messages.invalidResponse);
  }

  return { uploadUrl, publicUrl } as PresignResponse;
};

export const uploadMenuImageViaApi = (
  params: {
    token: string;
    file: File;
    menuId?: string;
  },
  onProgress?: (percent: number) => void,
  messages: MenuImageMessages = DEFAULT_MENU_IMAGE_MESSAGES
): Promise<MenuImageUploadApiResult> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      });
    }

    xhr.addEventListener('load', () => {
      try {
        const raw = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        if (!raw || !raw.success) {
          reject(new Error(raw?.message || messages.uploadFailed));
          return;
        }

        const data = raw.data || {};
        const imageUrl = data.url as string | undefined;
        const imageThumbUrl = data.thumbUrl as string | undefined;
        const imageThumb2xUrl = (data.thumb2xUrl as string | undefined) ?? null;
        const imageThumbMeta = data.thumbMeta as MenuThumbMeta | undefined;
        const warnings = Array.isArray(data.warnings) ? (data.warnings as string[]) : [];

        if (!imageUrl || !imageThumbUrl || !imageThumbMeta) {
          reject(new Error(messages.invalidResponse));
          return;
        }

        onProgress?.(100);

        resolve({ imageUrl, imageThumbUrl, imageThumb2xUrl, imageThumbMeta, warnings });
      } catch {
        reject(new Error(messages.invalidResponse));
      }
    });

    xhr.addEventListener('error', () => reject(new Error(messages.networkError)));
    xhr.addEventListener('abort', () => reject(new Error(messages.uploadCancelled)));

    const body = new FormData();
    body.append('file', params.file);
    if (params.menuId) body.append('menuId', params.menuId);

    xhr.open('POST', buildMerchantApiUrl('/api/merchant/upload/menu-image'));
    xhr.setRequestHeader('Authorization', `Bearer ${params.token}`);
    xhr.send(body);
  });
};

export const uploadBlobWithProgress = (
  uploadUrl: string,
  blob: Blob,
  contentType: string,
  onProgress?: (percent: number) => void,
  messages: MenuImageMessages = DEFAULT_MENU_IMAGE_MESSAGES
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(messages.uploadFailed));
      }
    });

    xhr.addEventListener('error', () => reject(new Error(messages.networkError)));
    xhr.addEventListener('abort', () => reject(new Error(messages.uploadCancelled)));

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(blob);
  });
};

export const getCenteredSquareCrop = (width: number, height: number) => {
  const cropSize = Math.min(width, height);
  return {
    sx: Math.max(0, Math.floor((width - cropSize) / 2)),
    sy: Math.max(0, Math.floor((height - cropSize) / 2)),
    size: cropSize,
  };
};

export const createJpegBlob = async (
  bitmap: ImageBitmap,
  options: {
    width: number;
    height: number;
    crop?: { sx: number; sy: number; size: number };
    quality?: number;
  },
  messages: MenuImageMessages = DEFAULT_MENU_IMAGE_MESSAGES
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error(messages.canvasUnsupported);
  }

  if (options.crop) {
    const { sx, sy, size } = options.crop;
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, options.width, options.height);
  } else {
    ctx.drawImage(bitmap, 0, 0, options.width, options.height);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(messages.thumbnailFailed));
        }
      },
      'image/jpeg',
      options.quality ?? 0.9
    );
  });
};

export const createMenuImageBlobs = async (
  file: File,
  messages: MenuImageMessages = DEFAULT_MENU_IMAGE_MESSAGES
): Promise<MenuImageBlobs> => {
  const bitmap = await createImageBitmap(file);
  try {
    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;
    const sourceFormat = file.type?.startsWith('image/')
      ? file.type.replace('image/', '')
      : null;

    const fullBlob = await createJpegBlob(
      bitmap,
      {
        width: sourceWidth,
        height: sourceHeight,
        quality: 0.92,
      },
      messages
    );

    const crop = getCenteredSquareCrop(sourceWidth, sourceHeight);

    const thumbBlob = await createJpegBlob(
      bitmap,
      {
        width: MENU_THUMB_SIZE,
        height: MENU_THUMB_SIZE,
        crop,
        quality: 0.85,
      },
      messages
    );

    const thumb2xBlob = await createJpegBlob(
      bitmap,
      {
        width: MENU_THUMB_2X_SIZE,
        height: MENU_THUMB_2X_SIZE,
        crop,
        quality: 0.85,
      },
      messages
    );

    return { fullBlob, thumbBlob, thumb2xBlob, sourceWidth, sourceHeight, sourceFormat };
  } finally {
    bitmap.close();
  }
};

export const buildMenuThumbMeta = (params: {
  sourceWidth: number;
  sourceHeight: number;
  sourceFormat: string | null;
  thumbUrl: string;
  thumb2xUrl: string;
}): MenuThumbMeta => {
  return {
    format: 'jpeg',
    source: {
      width: params.sourceWidth,
      height: params.sourceHeight,
      format: params.sourceFormat,
    },
    variants: [
      { dpr: 1, width: MENU_THUMB_SIZE, height: MENU_THUMB_SIZE, url: params.thumbUrl },
      { dpr: 2, width: MENU_THUMB_2X_SIZE, height: MENU_THUMB_2X_SIZE, url: params.thumb2xUrl },
    ],
  };
};
