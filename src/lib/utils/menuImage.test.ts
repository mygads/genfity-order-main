// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MENU_THUMB_SIZE,
  MENU_THUMB_2X_SIZE,
  buildMenuThumbMeta,
  createMenuImageBlobs,
  getCenteredSquareCrop,
} from '@/lib/utils/menuImage';

describe('menuImage helpers', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  let createImageBitmapMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createImageBitmapMock = vi.fn().mockResolvedValue({
      width: 1200,
      height: 800,
      close: vi.fn(),
    });

    (globalThis as unknown as { createImageBitmap: typeof createImageBitmapMock }).createImageBitmap =
      createImageBitmapMock;

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
    })) as unknown as typeof originalGetContext;
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    if (originalToBlob) {
      HTMLCanvasElement.prototype.toBlob = originalToBlob;
    } else {
      delete (HTMLCanvasElement.prototype as Partial<HTMLCanvasElement>).toBlob;
    }
    vi.restoreAllMocks();
  });

  it('builds centered square crops', () => {
    expect(getCenteredSquareCrop(1200, 800)).toEqual({ sx: 200, sy: 0, size: 800 });
    expect(getCenteredSquareCrop(600, 900)).toEqual({ sx: 0, sy: 150, size: 600 });
    expect(getCenteredSquareCrop(500, 500)).toEqual({ sx: 0, sy: 0, size: 500 });
  });

  it('builds thumb metadata with DPR variants', () => {
    const meta = buildMenuThumbMeta({
      sourceWidth: 1200,
      sourceHeight: 800,
      sourceFormat: 'png',
      thumbUrl: 'https://cdn.example/thumb.jpg',
      thumb2xUrl: 'https://cdn.example/thumb-2x.jpg',
    });

    expect(meta.format).toBe('jpeg');
    expect(meta.source).toEqual({ width: 1200, height: 800, format: 'png' });
    expect(meta.variants).toEqual([
      { dpr: 1, width: MENU_THUMB_SIZE, height: MENU_THUMB_SIZE, url: 'https://cdn.example/thumb.jpg' },
      { dpr: 2, width: MENU_THUMB_2X_SIZE, height: MENU_THUMB_2X_SIZE, url: 'https://cdn.example/thumb-2x.jpg' },
    ]);
  });

  it('creates JPEG blobs for menu images', async () => {
    const qualities: Array<number | undefined> = [];

    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: (cb: (blob: Blob | null) => void, type?: string, quality?: number) => {
        qualities.push(quality);
        cb(new Blob(['x'], { type: type ?? '' }));
      },
    });

    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    const result = await createMenuImageBlobs(file);

    expect(createImageBitmapMock).toHaveBeenCalledWith(file);
    expect(result.sourceWidth).toBe(1200);
    expect(result.sourceHeight).toBe(800);
    expect(result.sourceFormat).toBe('png');
    expect(result.fullBlob.type).toBe('image/jpeg');
    expect(result.thumbBlob.type).toBe('image/jpeg');
    expect(result.thumb2xBlob.type).toBe('image/jpeg');
    expect(qualities).toEqual([0.92, 0.85, 0.85]);
  });
});
