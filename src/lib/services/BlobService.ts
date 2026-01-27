/**
 * R2 Storage Service
 * Handles file uploads to Cloudflare R2 (S3-compatible API)
 * Used for: profile pictures, merchant logos, menu images, etc.
 */

import crypto from 'crypto';
import {
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import {
  buildR2PublicUrl,
  getR2BucketName,
  getR2PublicBaseUrl,
  getR2S3Client,
  getR2StorageClass,
} from '@/lib/utils/r2Client';

export interface UploadResult {
  url: string;
  downloadUrl: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
}

export class BlobService {
  static getPublicUrl(key: string): string {
    return buildR2PublicUrl(key);
  }

  private static addRandomSuffix(pathname: string): string {
    const safeName = pathname.replace(/\/+$/, '');
    const lastSlash = safeName.lastIndexOf('/');
    const lastDot = safeName.lastIndexOf('.');
    const hasExtension = lastDot > lastSlash;
    const base = hasExtension ? safeName.slice(0, lastDot) : safeName;
    const ext = hasExtension ? safeName.slice(lastDot) : '';
    const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    return `${base}-${suffix}${ext}`;
  }

  private static resolveKeyFromUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      const publicBase = getR2PublicBaseUrl();

      if (url.startsWith(publicBase)) {
        return url.slice(publicBase.length).replace(/^\/+/, '');
      }

      if (parsed.hostname.endsWith('.r2.cloudflarestorage.com')) {
        const pathParts = parsed.pathname.replace(/^\/+/, '').split('/');
        const bucket = getR2BucketName();
        if (pathParts[0] === bucket) {
          return pathParts.slice(1).join('/');
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  static isManagedUrl(url: string): boolean {
    const key = this.resolveKeyFromUrl(url);
    return Boolean(key);
  }

  /**
   * Replace a managed URL prefix with a new prefix
   */
  static replacePrefixInUrl(
    url: string,
    sourcePrefix: string,
    destinationPrefix: string
  ): string {
    const key = this.resolveKeyFromUrl(url);
    if (!key) return url;
    if (!key.startsWith(sourcePrefix)) return url;
    const nextKey = `${destinationPrefix}${key.slice(sourcePrefix.length)}`;
    return buildR2PublicUrl(nextKey);
  }

  /**
   * Upload a file to R2
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
      const key = options.addRandomSuffix !== false ? this.addRandomSuffix(pathname) : pathname;
      const body = Buffer.isBuffer(file)
        ? file
        : Buffer.from(await (file as File).arrayBuffer());

      const cacheControlMaxAge = options.cacheControlMaxAge || 31536000;
      const cacheControl = `public, max-age=${cacheControlMaxAge}, immutable`;

      const client = getR2S3Client();
      await client.send(
        new PutObjectCommand({
          Bucket: getR2BucketName(),
          Key: key,
          Body: body,
          ContentType: options.contentType,
          CacheControl: cacheControl,
          StorageClass: getR2StorageClass(),
        })
      );

      const url = buildR2PublicUrl(key);

      return {
        url,
        downloadUrl: url,
        pathname: key,
        contentType: options.contentType || '',
        contentDisposition: '',
      };
    } catch (error) {
      console.error('R2 upload error:', error);
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
      cacheControlMaxAge: 31536000, // 1 year
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
    merchantCode: string,
    file: File | Buffer
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const pathname = `merchants/${merchantCode}/logos/logo-${timestamp}.jpg`;
    
    return this.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true,
      cacheControlMaxAge: 31536000, // 1 year
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
    merchantCode: string,
    file: File | Buffer
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const pathname = `merchants/${merchantCode}/banners/banner-${timestamp}.jpg`;
    
    return this.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true,
      cacheControlMaxAge: 31536000, // 1 year
      contentType: 'image/jpeg',
    });
  }

  /**
   * Upload merchant QRIS image
   * @param merchantCode Merchant code
   * @param file Image file
   * @returns Upload result
   */
  static async uploadMerchantQris(
    merchantCode: string,
    file: File | Buffer
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const pathname = `merchants/${merchantCode}/payment/qris-${timestamp}.jpg`;

    return this.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true,
      cacheControlMaxAge: 31536000, // 1 year
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
    merchantCode: string,
    file: File | Buffer
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const pathname = `merchants/${merchantCode}/promos/promo-${timestamp}.jpg`;

    return this.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true,
      cacheControlMaxAge: 31536000, // 1 year
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
    merchantCode: string,
    menuId: string | number,
    file: File | Buffer
  ): Promise<UploadResult> {
    const pathname = `merchants/${merchantCode}/menus/menu-${menuId}.jpg`;
    
    return this.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true,
      cacheControlMaxAge: 31536000, // 1 year
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
    merchantCode: string,
    menuId: string | number,
    file: File | Buffer
  ): Promise<UploadResult> {
    const pathname = `merchants/${merchantCode}/menus/menu-${menuId}-thumb.jpg`;

    return this.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true,
      cacheControlMaxAge: 31536000, // 1 year
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
    merchantCode: string,
    menuId: string | number,
    file: File | Buffer
  ): Promise<UploadResult> {
    const pathname = `merchants/${merchantCode}/menus/menu-${menuId}-thumb-2x.jpg`;

    return this.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true,
      cacheControlMaxAge: 31536000, // 1 year
      contentType: 'image/jpeg',
    });
  }

  /**
   * Upload customer payment proof
   * @param merchantCode Merchant code
   * @param orderNumber Order number
   * @param file Image file
   */
  static async uploadPaymentProof(
    merchantCode: string,
    orderNumber: string,
    file: File | Buffer
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const pathname = `merchants/${merchantCode}/orders/${orderNumber}/payment-proof-${timestamp}.jpg`;

    return this.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true,
      cacheControlMaxAge: 31536000,
      contentType: 'image/jpeg',
    });
  }

  /**
   * Delete a blob by URL
   * @param url Blob URL to delete
   */
  static async deleteFile(url: string): Promise<void> {
    try {
      const key = this.resolveKeyFromUrl(url);
      if (!key) {
        throw new Error('URL does not belong to managed R2 bucket');
      }

      const client = getR2S3Client();
      await client.send(
        new DeleteObjectCommand({
          Bucket: getR2BucketName(),
          Key: key,
        })
      );
    } catch (error) {
      console.error('R2 delete error:', error);
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
      const client = getR2S3Client();
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: getR2BucketName(),
          Prefix: prefix,
          MaxKeys: limit,
        })
      );

      const items = (result.Contents ?? []) as Array<{
        Key?: string;
        Size?: number;
        LastModified?: Date;
      }>;
      return items
        .filter((item) => Boolean(item.Key))
        .map((item) => {
          const key = item.Key as string;
          return {
            url: buildR2PublicUrl(key),
            pathname: key,
            size: item.Size ?? 0,
            uploadedAt: item.LastModified ? new Date(item.LastModified) : new Date(0),
          };
        });
    } catch (error) {
      console.error('R2 list error:', error);
      throw new Error('Failed to list files from storage');
    }
  }

  /**
   * Copy all objects from one prefix to another
   */
  static async copyPrefix(
    sourcePrefix: string,
    destinationPrefix: string
  ): Promise<{ objectCount: number }> {
    const client = getR2S3Client();
    const bucket = getR2BucketName();
    let continuationToken: string | undefined;
    let objectCount = 0;

    do {
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: sourcePrefix,
          ContinuationToken: continuationToken,
        })
      );

      const items = result.Contents ?? [];
      for (const item of items) {
        if (!item.Key) continue;
        const sourceKey = item.Key;
        const relativeKey = sourceKey.slice(sourcePrefix.length);
        const destinationKey = `${destinationPrefix}${relativeKey}`;

        await client.send(
          new CopyObjectCommand({
            Bucket: bucket,
            CopySource: `${bucket}/${sourceKey}`,
            Key: destinationKey,
          })
        );

        objectCount += 1;
      }

      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);

    return { objectCount };
  }

  /**
   * Delete all objects under a prefix
   */
  static async deletePrefix(prefix: string): Promise<void> {
    const client = getR2S3Client();
    const bucket = getR2BucketName();
    let continuationToken: string | undefined;

    do {
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );

      const items = result.Contents ?? [];
      for (const item of items) {
        if (!item.Key) continue;
        await client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: item.Key,
          })
        );
      }

      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);
  }

  /**
   * Get total size and object count for a prefix
   */
  static async getPrefixUsage(prefix: string): Promise<{ totalBytes: number; objectCount: number }> {
    const client = getR2S3Client();
    const bucket = getR2BucketName();
    let continuationToken: string | undefined;
    let totalBytes = 0;
    let objectCount = 0;

    do {
      const result = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );

      const items = result.Contents ?? [];
      for (const item of items) {
        if (!item.Key) continue;
        objectCount += 1;
        totalBytes += item.Size ?? 0;
      }

      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);

    return { totalBytes, objectCount };
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
  static async deleteOldMerchantLogo(merchantCode: string): Promise<void> {
    try {
      const blobs = await this.listFiles(`merchants/${merchantCode}/logos/logo-`);
      
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
  static async deleteOldMerchantBanner(merchantCode: string): Promise<void> {
    try {
      const blobs = await this.listFiles(`merchants/${merchantCode}/banners/banner-`);
      
      for (const blob of blobs) {
        await this.deleteFile(blob.url);
      }
    } catch (error) {
      console.warn('Failed to delete old merchant banner:', error);
    }
  }

  /**
   * Delete old merchant QRIS image before uploading new one
   * @param merchantCode Merchant code
   */
  static async deleteOldMerchantQris(merchantCode: string): Promise<void> {
    try {
      const blobs = await this.listFiles(`merchants/${merchantCode}/payment/qris-`);

      for (const blob of blobs) {
        await this.deleteFile(blob.url);
      }
    } catch (error) {
      console.warn('Failed to delete old QRIS image:', error);
    }
  }

  /**
   * Delete old menu image before uploading new one
   * @param merchantId Merchant ID
   * @param menuId Menu ID
   */
  static async deleteOldMenuImage(
    merchantCode: string,
    menuId: string | number
  ): Promise<void> {
    try {
      const blobs = await this.listFiles(
        `merchants/${merchantCode}/menus/menu-${menuId}`
      );
      
      for (const blob of blobs) {
        await this.deleteFile(blob.url);
      }
    } catch (error) {
      console.warn('Failed to delete old menu image:', error);
    }
  }

  /**
   * Delete existing payment proof images for an order
   * @param merchantCode Merchant code
   * @param orderNumber Order number
   */
  static async deleteOldPaymentProof(merchantCode: string, orderNumber: string): Promise<void> {
    try {
      const prefix = `merchants/${merchantCode}/orders/${orderNumber}/payment-proof-`;
      const blobs = await this.listFiles(prefix);
      for (const blob of blobs) {
        await this.deleteFile(blob.url);
      }
    } catch (error) {
      console.warn('Failed to delete old payment proof:', error);
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
