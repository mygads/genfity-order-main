/**
 * Vercel Blob Service
 * Handles file uploads to Vercel Blob storage
 * Used for: profile pictures, merchant logos, menu images, etc.
 */

import { put, del, list } from '@vercel/blob';

export interface UploadResult {
  url: string;
  downloadUrl: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
}

export class BlobService {
  /**
   * Upload a file to Vercel Blob
   * @param file File to upload (File or Buffer)
   * @param pathname Path where file will be stored (e.g., 'avatars/user-123.jpg')
   * @param options Upload options
   * @returns Upload result with URL and metadata
   */
  static async uploadFile(
    file: File | Buffer,
    pathname: string,
    options: {
      access?: 'public';
      addRandomSuffix?: boolean;
      cacheControlMaxAge?: number;
      contentType?: string;
    } = {}
  ): Promise<UploadResult> {
    try {
      const blob = await put(pathname, file, {
        access: options.access || 'public',
        addRandomSuffix: options.addRandomSuffix !== false, // Default true for safety
        cacheControlMaxAge: options.cacheControlMaxAge || 3600, // 1 hour default
        contentType: options.contentType,
      });

      return {
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname,
        contentType: blob.contentType || '',
        contentDisposition: blob.contentDisposition,
      };
    } catch (error) {
      console.error('Blob upload error:', error);
      throw new Error('Failed to upload file to storage');
    }
  }

  /**
   * Upload user profile picture
   * @param userId User ID
   * @param file Image file
   * @returns Upload result
   */
  static async uploadProfilePicture(
    userId: string | number,
    file: File | Buffer
  ): Promise<UploadResult> {
    const pathname = `avatars/user-${userId}.jpg`;
    
    return this.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true, // Prevent cache issues
      cacheControlMaxAge: 86400, // 24 hours
      contentType: 'image/jpeg',
    });
  }

  /**
   * Upload merchant logo
   * @param merchantId Merchant ID
   * @param file Image file
   * @returns Upload result
   */
  static async uploadMerchantLogo(
    merchantId: string | number,
    file: File | Buffer
  ): Promise<UploadResult> {
    const pathname = `merchants/logos/merchant-${merchantId}.jpg`;
    
    return this.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true,
      cacheControlMaxAge: 86400, // 24 hours
      contentType: 'image/jpeg',
    });
  }

  /**
   * Upload merchant banner
   * @param merchantId Merchant ID
   * @param file Image file
   * @returns Upload result
   */
  static async uploadMerchantBanner(
    merchantId: string | number,
    file: File | Buffer
  ): Promise<UploadResult> {
    const pathname = `merchants/banners/merchant-${merchantId}.jpg`;
    
    return this.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true,
      cacheControlMaxAge: 86400, // 24 hours
      contentType: 'image/jpeg',
    });
  }

  /**
   * Upload merchant promo banner
   * @param merchantId Merchant ID
   * @param file Image file
   * @returns Upload result
   */
  static async uploadMerchantPromoBanner(
    merchantId: string | number,
    file: File | Buffer
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const pathname = `merchants/promo-banners/merchant-${merchantId}/promo-${timestamp}.jpg`;

    return this.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true,
      cacheControlMaxAge: 86400,
      contentType: 'image/jpeg',
    });
  }

  /**
   * Upload menu item image
   * @param merchantId Merchant ID
   * @param menuId Menu ID
   * @param file Image file
   * @returns Upload result
   */
  static async uploadMenuImage(
    merchantId: string | number,
    menuId: string | number,
    file: File | Buffer
  ): Promise<UploadResult> {
    const pathname = `merchants/menus/merchant-${merchantId}/menu-${menuId}.jpg`;
    
    return this.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true,
      cacheControlMaxAge: 86400, // 24 hours
      contentType: 'image/jpeg',
    });
  }

  /**
   * Upload menu item thumbnail image
   * @param merchantId Merchant ID
   * @param menuId Menu ID (same id used for the full image)
   * @param file Image buffer
   */
  static async uploadMenuImageThumbnail(
    merchantId: string | number,
    menuId: string | number,
    file: File | Buffer
  ): Promise<UploadResult> {
    const pathname = `merchants/menus/merchant-${merchantId}/menu-${menuId}-thumb.jpg`;

    return this.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true,
      cacheControlMaxAge: 86400, // 24 hours
      contentType: 'image/jpeg',
    });
  }

  /**
   * Upload menu item 2x thumbnail image (for high-DPI displays)
   * @param merchantId Merchant ID
   * @param menuId Menu ID (same id used for the full image)
   * @param file Image buffer
   */
  static async uploadMenuImageThumbnail2x(
    merchantId: string | number,
    menuId: string | number,
    file: File | Buffer
  ): Promise<UploadResult> {
    const pathname = `merchants/menus/merchant-${merchantId}/menu-${menuId}-thumb-2x.jpg`;

    return this.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true,
      cacheControlMaxAge: 86400, // 24 hours
      contentType: 'image/jpeg',
    });
  }

  /**
   * Delete a blob by URL
   * @param url Blob URL to delete
   */
  static async deleteFile(url: string): Promise<void> {
    try {
      await del(url);
    } catch (error) {
      console.error('Blob delete error:', error);
      throw new Error('Failed to delete file from storage');
    }
  }

  /**
   * List all blobs in a folder
   * @param prefix Folder prefix (e.g., 'avatars/')
   * @param limit Maximum number of results
   * @returns List of blobs
   */
  static async listFiles(
    prefix?: string,
    limit: number = 1000
  ): Promise<Array<{ url: string; pathname: string; size: number; uploadedAt: Date }>> {
    try {
      const result = await list({
        prefix,
        limit,
      });

      return result.blobs;
    } catch (error) {
      console.error('Blob list error:', error);
      throw new Error('Failed to list files from storage');
    }
  }

  /**
   * Delete old profile picture before uploading new one
   * @param userId User ID
   */
  static async deleteOldProfilePicture(userId: string | number): Promise<void> {
    try {
      const blobs = await this.listFiles(`avatars/user-${userId}`);
      
      // Delete all old avatars for this user
      for (const blob of blobs) {
        await this.deleteFile(blob.url);
      }
    } catch (error) {
      // Don't throw error if deletion fails - just log it
      console.warn('Failed to delete old profile picture:', error);
    }
  }

  /**
   * Delete old merchant logo before uploading new one
   * @param merchantId Merchant ID
   */
  static async deleteOldMerchantLogo(merchantId: string | number): Promise<void> {
    try {
      const blobs = await this.listFiles(`merchants/logos/merchant-${merchantId}`);
      
      for (const blob of blobs) {
        await this.deleteFile(blob.url);
      }
    } catch (error) {
      console.warn('Failed to delete old merchant logo:', error);
    }
  }

  /**
   * Delete old merchant banner before uploading new one
   * @param merchantId Merchant ID
   */
  static async deleteOldMerchantBanner(merchantId: string | number): Promise<void> {
    try {
      const blobs = await this.listFiles(`merchants/banners/merchant-${merchantId}`);
      
      for (const blob of blobs) {
        await this.deleteFile(blob.url);
      }
    } catch (error) {
      console.warn('Failed to delete old merchant banner:', error);
    }
  }

  /**
   * Delete old menu image before uploading new one
   * @param merchantId Merchant ID
   * @param menuId Menu ID
   */
  static async deleteOldMenuImage(
    merchantId: string | number,
    menuId: string | number
  ): Promise<void> {
    try {
      const blobs = await this.listFiles(
        `merchants/menus/merchant-${merchantId}/menu-${menuId}`
      );
      
      for (const blob of blobs) {
        await this.deleteFile(blob.url);
      }
    } catch (error) {
      console.warn('Failed to delete old menu image:', error);
    }
  }

  /**
   * Validate image file
   * @param file File to validate
   * @param maxSizeMB Maximum file size in MB
   * @returns Validation result
   */
  static validateImageFile(
    file: File,
    maxSizeMB: number = 5
  ): { valid: boolean; error?: string } {
    // Check file type - accept all common image formats
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/svg+xml',
      'image/tiff',
      'image/heic',
      'image/heif',
    ];
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload an image file.',
      };
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size must be less than ${maxSizeMB}MB.`,
      };
    }

    return { valid: true };
  }
}
