import chunkUrl from "../assets/chunk.bin?url";

export async function downloadBytes(
  targetBytes: number,
  concurrency: number,
  onProgress: (received: number) => void,
  onStart: (time: number) => void,
  controller: AbortController,
): Promise<void> {
  if (!Number.isSafeInteger(targetBytes) || targetBytes <= 0) {
    throw new Error("Download size must be a positive safe integer.");
  }

  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("Concurrency must be at least 1.");
  }

  let totalBytes = 0;
  let stopped = false;

  onStart(performance.now());

  function reserveBytes(byteLength: number): void {
    const remaining = targetBytes - totalBytes;
    const accepted = Math.min(byteLength, remaining);

    totalBytes += accepted;
    onProgress(totalBytes);

    if (totalBytes >= targetBytes) {
      stopped = true;
      controller.abort();
    }
  }

  async function worker(): Promise<void> {
    try {
      while (!stopped) {
        const response = await fetch(chunkUrl, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error("Failed to fetch chunk.bin");
        }

        const reader = response.body.getReader();

        try {
          while (!stopped) {
            const { done, value } = await reader.read();

            if (done) break;

            reserveBytes(value.byteLength);

            if (stopped) {
              await reader.cancel().catch(() => {});
              return;
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error) {
      // Reaching the target aborts other workers intentionally.
      if (stopped) return;

      throw error;
    }
  }

  try {
    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    if (totalBytes < targetBytes) {
      throw new Error("Download ended before the target was reached.");
    }
  } catch (error) {
    stopped = true;
    controller.abort();
    throw error;
  }
}
