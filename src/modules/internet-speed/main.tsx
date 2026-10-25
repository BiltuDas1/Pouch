import { useState } from "react";
import DownloadControls from "./components/DownloadControls";
import DownloadProgress from "./components/DownloadProgress";
import { useDownload } from "./hooks/useDownload";
import styles from "./main.css?inline";
import ShadowModule from "../../components/ShadowModule";

export default function Homepage() {
  const [size, setSize] = useState("32");
  const [concurrency, setConcurrency] = useState("4");

  const {
    downloading,
    received,
    error,
    averageMbps,
    averageMiBs,
    elapsedSeconds,
    estimatedSeconds,
    startDownload,
    cancelDownload,
  } = useDownload();

  const targetBytes = Number(size) * 1024 ** 2;

  function handleDownload() {
    void startDownload(targetBytes, Number(concurrency));
  }

  return (
    <ShadowModule css={styles}>
      <section className="w-full h-full flex flex-row justify-center items-center">
        <div className="bg-section border border-section-border mt-4 p-6 w-76 rounded-2xl">
          <DownloadControls
            size={size}
            concurrency={concurrency}
            downloading={downloading}
            onSizeChange={setSize}
            onConcurrencyChange={setConcurrency}
            onDownload={handleDownload}
            onCancelDownload={cancelDownload}
          />

          <DownloadProgress
            received={received}
            targetBytes={targetBytes}
            error={error}
            downloading={downloading}
            averageMbps={averageMbps}
            averageMiBs={averageMiBs}
            elapsedSeconds={elapsedSeconds}
            estimatedSeconds={estimatedSeconds}
          />
        </div>
      </section>
    </ShadowModule>
  );
}
