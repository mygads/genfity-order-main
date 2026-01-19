import { S3Client, StorageClass } from '@aws-sdk/client-s3';

type R2Credentials = {
  accessKeyId: string;
  secretAccessKey: string;
};

const DEFAULT_STORAGE_CLASS: StorageClass = 'STANDARD';
const VALID_STORAGE_CLASSES = new Set<StorageClass>([
  'STANDARD',
  'STANDARD_IA',
  'ONEZONE_IA',
  'INTELLIGENT_TIERING',
  'GLACIER',
  'DEEP_ARCHIVE',
  'OUTPOSTS',
  'GLACIER_IR',
  'SNOW',
  'EXPRESS_ONEZONE',
]);

export function getR2BucketName(): string {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) {
    throw new Error('R2_BUCKET is not configured');
  }
  return bucket;
}

export function getR2PublicBaseUrl(): string {
  const baseUrl = process.env.R2_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error('R2_PUBLIC_BASE_URL is not configured');
  }
  return baseUrl.replace(/\/+$/, '');
}

export function getR2Endpoint(): string {
  const endpoint = process.env.R2_S3_ENDPOINT;
  if (endpoint) return endpoint.replace(/\/+$/, '');
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) {
    throw new Error('R2_ACCOUNT_ID is not configured');
  }
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

export function getR2Credentials(): R2Credentials {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY is not configured');
  }
  return { accessKeyId, secretAccessKey };
}

export function getR2StorageClass(): StorageClass {
  const raw = process.env.R2_STORAGE_CLASS;
  if (raw && VALID_STORAGE_CLASSES.has(raw as StorageClass)) {
    return raw as StorageClass;
  }

  if (raw) {
    console.warn(`[R2] Invalid R2_STORAGE_CLASS "${raw}", falling back to ${DEFAULT_STORAGE_CLASS}.`);
  }

  return DEFAULT_STORAGE_CLASS;
}

let cachedClient: S3Client | null = null;

export function getR2S3Client(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: 'auto',
    endpoint: getR2Endpoint(),
    credentials: getR2Credentials(),
  });
  return cachedClient;
}

export function buildR2PublicUrl(key: string): string {
  const baseUrl = getR2PublicBaseUrl();
  const normalizedKey = key.replace(/^\/+/, '');
  return `${baseUrl}/${normalizedKey}`;
}
