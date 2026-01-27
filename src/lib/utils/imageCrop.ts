export type PixelCropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const createImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Failed to load image')));
    image.src = url;
  });
};

export async function getCroppedImageBlob(params: {
  imageSrc: string;
  crop: PixelCropArea;
  outputSize: number;
  mimeType?: string;
  quality?: number;
}): Promise<Blob> {
  const image = await createImage(params.imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas is not supported');
  }

  const { crop, outputSize } = params;
  canvas.width = outputSize;
  canvas.height = outputSize;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to crop image'));
        }
      },
      params.mimeType || 'image/jpeg',
      params.quality ?? 0.9
    );
  });
}
