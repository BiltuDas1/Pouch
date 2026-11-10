import { encodeIco } from "icojs";

export const FAVICON_SIZES = [16, 32, 48, 64, 128, 256] as const;

export type FaviconSize = (typeof FAVICON_SIZES)[number];

export const DEFAULT_SIZES: readonly FaviconSize[] = [16, 32, 48];

export const MIN_SOURCE_SIZE = 256;

export interface IcoResult {
  blob: Blob;
  sizes: FaviconSize[];
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function loadSourceImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image. Try a different file."));
    };

    image.src = url;
  });
}

async function renderPng(
  source: HTMLImageElement,
  size: FaviconSize,
): Promise<ArrayBuffer> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not supported in this browser.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, size, size);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });

  if (!blob) {
    throw new Error(`Could not render the ${size} × ${size} icon.`);
  }

  return blob.arrayBuffer();
}

export async function createIco(
  source: HTMLImageElement,
  sizes: readonly FaviconSize[],
): Promise<IcoResult> {
  const orderedSizes = [...new Set(sizes)].sort((a, b) => a - b);

  if (!orderedSizes.length) {
    throw new Error("Select at least one ICO size.");
  }

  const images = await Promise.all(
    orderedSizes.map(async (size) => ({
      buffer: await renderPng(source, size),
    })),
  );

  const buffer = await encodeIco(images);

  return {
    blob: new Blob([buffer], { type: "image/x-icon" }),
    sizes: orderedSizes,
  };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
