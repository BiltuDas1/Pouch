import { useRef, useState } from "react";
import { downloadBytes } from "../lib/download";

const ROLLING_WINDOW_MS = 3000;
const UPDATE_INTERVAL_MS = 100;
const MIN_ESTIMATE_ELAPSED_MS = 1000;
const MIN_WINDOW_MS = 800;

type SpeedSample = {
  time: number;
  bytes: number;
};

export function useDownload() {
  const [downloading, setDownloading] = useState(false);
  const [received, setReceived] = useState(0);
  const [error, setError] = useState("");

  const [averageMbps, setAverageMbps] = useState<number | null>(null);
  const [averageMiBs, setAverageMiBs] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  function cancelDownload() {
    controllerRef.current?.abort();
  }

  async function startDownload(
    targetBytes: number,
    concurrency: number,
  ): Promise<void> {
    setDownloading(true);
    setReceived(0);
    setError("");
    setAverageMbps(null);
    setAverageMiBs(null);
    setElapsedSeconds(0);
    setEstimatedSeconds(null);

    let startTime = 0;
    let latestReceived = 0;
    let timer: ReturnType<typeof setInterval> | undefined;

    const controller = new AbortController();
    controllerRef.current = controller;

    const samples: SpeedSample[] = [];

    try {
      await downloadBytes(
        targetBytes,
        concurrency,
        (bytes) => {
          latestReceived = bytes;
          setReceived(bytes);
        },
        (time) => {
          startTime = time;

          // Start measuring elapsed time and rolling speed.
          timer = setInterval(() => {
            const now = performance.now();
            const elapsedMs = now - startTime;

            setElapsedSeconds(elapsedMs / 1000);

            samples.push({
              time: now,
              bytes: latestReceived,
            });

            // Keep only samples from the recent rolling window.
            const cutoff = now - ROLLING_WINDOW_MS;

            while (samples.length > 1 && samples[1].time < cutoff) {
              samples.shift();
            }

            if (elapsedMs < MIN_ESTIMATE_ELAPSED_MS) {
              setEstimatedSeconds(null);
              return;
            }

            if (samples.length < 2) {
              setEstimatedSeconds(null);
              return;
            }

            const oldest = samples[0];
            const windowDurationMs = now - oldest.time;
            const bytesTransferred = latestReceived - oldest.bytes;

            // Wait until enough recent measurements exist.
            if (windowDurationMs < MIN_WINDOW_MS || bytesTransferred <= 0) {
              setEstimatedSeconds(null);
              return;
            }

            const rollingBytesPerSecond =
              bytesTransferred / (windowDurationMs / 1000);

            const remainingBytes = Math.max(0, targetBytes - latestReceived);

            setEstimatedSeconds(remainingBytes / rollingBytesPerSecond);
          }, UPDATE_INTERVAL_MS);
        },
        controller,
      );

      const elapsed = (performance.now() - startTime) / 1000;
      const safeElapsed = Math.max(elapsed, 0.001);

      setElapsedSeconds(elapsed);
      setEstimatedSeconds(0);

      // Final average network speed in decimal Mbps.
      setAverageMbps((latestReceived * 8) / safeElapsed / 1_000_000);

      // Final average transfer speed in binary MiB/s.
      setAverageMiBs(latestReceived / safeElapsed / 1024 ** 2);
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "Download failed");
      }
    } finally {
      if (timer !== undefined) {
        clearInterval(timer);
      }

      controllerRef.current = null;
      setDownloading(false);
    }
  }

  return {
    downloading,
    received,
    error,
    averageMbps,
    averageMiBs,
    elapsedSeconds,
    estimatedSeconds,
    startDownload,
    cancelDownload,
  };
}
