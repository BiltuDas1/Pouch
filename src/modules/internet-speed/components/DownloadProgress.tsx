type DownloadProgressProps = {
  received: number;
  targetBytes: number;
  error: string;
  downloading: boolean;
  averageMbps: number | null;
  averageMiBs: number | null;
  elapsedSeconds: number;
  estimatedSeconds: number | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 ** 2) {
    return `${(bytes / 1024).toFixed(2)} KiB`;
  }

  if (bytes < 1024 ** 3) {
    return `${(bytes / 1024 ** 2).toFixed(2)} MiB`;
  }

  return `${(bytes / 1024 ** 3).toFixed(2)} GiB`;
}

function formatSpeed(mbps: number, miBs: number): string {
  const networkSpeed =
    mbps >= 1000
      ? `${(mbps / 1000).toFixed(2)} Gbps`
      : `${mbps.toFixed(2)} Mbps`;

  const dataSpeed =
    miBs >= 1024
      ? `${(miBs / 1024).toFixed(2)} GiB/s`
      : `${miBs.toFixed(2)} MiB/s`;

  return `${networkSpeed} (${dataSpeed})`;
}

export default function DownloadProgress({
  received,
  targetBytes,
  error,
  downloading,
  averageMbps,
  averageMiBs,
  elapsedSeconds,
  estimatedSeconds,
}: DownloadProgressProps) {
  return (
    <section>
      <div className="mt-3 text-subtext text-sm">
        <p>
          Progress: {formatBytes(received)} / {formatBytes(targetBytes)}
        </p>

        {downloading && (
          <>
            <p>
              Elapsed:{" "}
              {elapsedSeconds < 60
                ? `${elapsedSeconds.toFixed(1)} seconds`
                : `${Math.floor(elapsedSeconds / 60)}m ${(elapsedSeconds % 60).toFixed(1)}s`}
            </p>

            <p>
              ETA:{" "}
              {estimatedSeconds === null
                ? "Calculating..."
                : estimatedSeconds >= 60
                  ? `${Math.floor(estimatedSeconds / 60)}m ${Math.ceil(estimatedSeconds % 60)}s`
                  : `${Math.ceil(estimatedSeconds)} seconds`}
            </p>
          </>
        )}

        {!downloading && averageMbps !== null && averageMiBs !== null && (
          <p>Average speed: {formatSpeed(averageMbps, averageMiBs)}</p>
        )}

        {error && <p className="text-red-500">{error}</p>}
      </div>
    </section>
  );
}
