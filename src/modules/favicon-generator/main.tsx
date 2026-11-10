import { useEffect, useRef, useState } from "react";
import {
  Check,
  Download,
  FileImage,
  ImageDown,
  LockKeyhole,
  RefreshCw,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import ShadowModule from "../../components/ShadowModule";
import styles from "./main.css?inline";
import {
  DEFAULT_SIZES,
  FAVICON_SIZES,
  MIN_SOURCE_SIZE,
  createIco,
  downloadBlob,
  formatBytes,
  loadSourceImage,
  type FaviconSize,
  type IcoResult,
} from "./lib/favicon";

interface ImageDimensions {
  width: number;
  height: number;
}

export default function FaviconGenerator() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const sourceRef = useRef<HTMLImageElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [sizes, setSizes] = useState<FaviconSize[]>([...DEFAULT_SIZES]);
  const [result, setResult] = useState<IcoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function revokePreview() {
    if (!previewUrlRef.current) return;
    URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
  }

  async function loadFile(next: File) {
    if (!next.type.startsWith("image/")) {
      setError("Choose a PNG, JPEG, WebP, GIF, or SVG image.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const element = await loadSourceImage(next);
      const width = element.naturalWidth;
      const height = element.naturalHeight;

      if (width !== height) {
        throw new Error(
          `The aspect ratio must be 1:1. "${next.name}" is ${width} × ${height} px.`,
        );
      }

      if (width < MIN_SOURCE_SIZE) {
        throw new Error(
          `The image must be at least ${MIN_SOURCE_SIZE} × ${MIN_SOURCE_SIZE} px. "${next.name}" is ${width} × ${height} px.`,
        );
      }

      revokePreview();

      const url = URL.createObjectURL(next);
      previewUrlRef.current = url;
      sourceRef.current = element;

      setFile(next);
      setPreviewUrl(url);
      setDimensions({ width, height });
      setResult(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not read this image.",
      );
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    revokePreview();
    sourceRef.current = null;
    setFile(null);
    setPreviewUrl("");
    setDimensions(null);
    setResult(null);
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function openPicker() {
    inputRef.current?.click();
  }

  function toggleSize(size: FaviconSize) {
    setSizes((current) =>
      current.includes(size)
        ? current.filter((value) => value !== size)
        : [...current, size],
    );
    setResult(null);
  }

  const allSelected = sizes.length === FAVICON_SIZES.length;

  function toggleAll() {
    setSizes(allSelected ? [] : [...FAVICON_SIZES]);
    setResult(null);
  }

  async function handleGenerate() {
    const source = sourceRef.current;

    if (!source) {
      setError("Choose an image before generating a favicon.");
      return;
    }

    if (!sizes.length) {
      setError("Select at least one ICO size.");
      return;
    }

    setGenerating(true);
    setError("");

    try {
      setResult(await createIco(source, sizes));
    } catch (err) {
      setResult(null);
      setError(
        err instanceof Error ? err.message : "Could not generate the ICO file.",
      );
    } finally {
      setGenerating(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    downloadBlob(result.blob, "favicon.ico");
  }

  return (
    <ShadowModule css={styles} includeShadowStyles>
      <section className="mx-auto w-full max-w-5xl space-y-5">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(event) => {
            const next = event.target.files?.[0];
            event.target.value = "";
            if (next) void loadFile(next);
          }}
        />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              Favicon generator
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Create one multi-resolution favicon.ico from a square image.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border-primary px-3 py-1.5 text-xs text-text-secondary">
            <LockKeyhole size={14} /> Processed locally in your browser
          </div>
        </div>

        {!file ? (
          <button
            type="button"
            disabled={loading}
            onClick={openPicker}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (loading) return;
              const next = event.dataTransfer.files[0];
              if (next) void loadFile(next);
            }}
            className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border-primary bg-background-secondary p-8 text-center transition hover:border-text-secondary disabled:cursor-wait"
          >
            <div className="mb-4 rounded-2xl border border-border-primary p-4">
              {loading ? (
                <RefreshCw
                  size={30}
                  color="var(--color-text-secondary)"
                  className="animate-spin"
                />
              ) : (
                <ImageDown size={30} color="var(--color-text-secondary)" />
              )}
            </div>
            <span className="font-medium text-text-primary">
              {loading ? "Reading image…" : "Drop an image here or browse"}
            </span>
            <span className="mt-2 text-sm text-text-secondary">
              Square PNG, JPEG, WebP, GIF or SVG · at least {MIN_SOURCE_SIZE} ×{" "}
              {MIN_SOURCE_SIZE} px
            </span>
            <span className="mt-5 inline-flex items-center gap-2 rounded-lg bg-button-primary px-4 py-2 text-sm font-medium text-dark">
              <Upload size={15} /> Choose image
            </span>
          </button>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-primary bg-background-secondary p-3">
              <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border border-border-primary bg-dark">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt=""
                    className="size-full object-contain"
                  />
                ) : (
                  <FileImage size={22} color="var(--color-text-secondary)" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {file.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {dimensions
                    ? `${dimensions.width} × ${dimensions.height} px · `
                    : ""}
                  {formatBytes(file.size)}
                </p>
              </div>
              <span className="rounded-full border border-green-500/30 bg-green-500/5 px-2.5 py-1 text-[11px] text-green-400">
                1:1
              </span>
              <button
                type="button"
                disabled={loading}
                className="rounded-lg border border-border-primary p-2 text-text-secondary hover:text-text-primary disabled:cursor-wait"
                onClick={openPicker}
                title="Choose another image"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : undefined}
                />
              </button>
              <button
                type="button"
                className="rounded-lg border border-border-primary p-2 text-text-secondary hover:text-text-primary"
                onClick={reset}
                title="Remove image"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-border-primary bg-background-secondary">
                  <div className="flex items-center justify-between border-b border-border-primary px-4 py-2">
                    <h3 className="text-sm font-semibold text-text-primary">
                      Source image
                    </h3>
                    <span className="text-xs text-text-secondary">
                      {dimensions
                        ? `${dimensions.width} × ${dimensions.height} px`
                        : ""}
                    </span>
                  </div>
                  <div className="flex min-h-64 items-center justify-center bg-[conic-gradient(#1c1c1c_25%,#141414_25%,#141414_50%,#1c1c1c_50%,#1c1c1c_75%,#141414_75%)] bg-size-[16px_16px] p-4">
                    <img
                      src={previewUrl}
                      alt={`Preview of ${file.name}`}
                      className="max-h-112 max-w-full object-contain"
                    />
                  </div>
                  <p className="border-t border-border-primary px-4 py-2 text-xs text-text-secondary">
                    Every selected size is rendered from this image. Transparent
                    areas are preserved.
                  </p>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-xl border border-border-primary bg-background-secondary p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-text-primary">
                      ICO sizes
                    </h3>
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-xs text-text-secondary underline hover:text-text-primary"
                    >
                      {allSelected ? "Clear all" : "Select all"}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    Selected sizes are packed into one favicon.ico file.
                  </p>

                  <fieldset className="mt-4">
                    <legend className="sr-only">ICO sizes</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {FAVICON_SIZES.map((size) => {
                        const checked = sizes.includes(size);

                        return (
                          <label
                            key={size}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                              checked
                                ? "border-text-secondary bg-dark text-text-primary"
                                : "border-border-primary text-text-secondary hover:border-text-secondary"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSize(size)}
                              className="size-4 accent-white"
                            />
                            {size} × {size}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <button
                    type="button"
                    onClick={() => void handleGenerate()}
                    disabled={generating || !sizes.length}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-button-primary px-4 py-2.5 text-sm font-semibold text-dark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {generating ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Download size={16} />
                    )}
                    {generating ? "Generating…" : "Generate favicon.ico"}
                  </button>

                  {!sizes.length && (
                    <p className="mt-2 text-center text-[11px] text-status-error">
                      Select at least one size.
                    </p>
                  )}

                  {result && (
                    <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-400">
                        <Check size={16} /> favicon.ico is ready
                      </div>
                      <p className="mt-1 text-xs text-text-secondary">
                        {formatBytes(result.blob.size)} · sizes{" "}
                        {result.sizes.join(", ")} px
                      </p>
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-border-primary px-3 py-2 text-sm text-text-primary hover:bg-dark"
                      >
                        <Download size={15} /> Download favicon.ico
                      </button>
                    </div>
                  )}

                  {!result && !generating && sizes.length > 0 && (
                    <p className="mt-3 text-xs text-text-secondary">
                      The ICO is built locally and never uploaded.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-border-primary p-4">
                  <h3 className="text-sm font-semibold text-text-primary">
                    Upload requirements
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-xs text-text-secondary">
                    <li>Square image (aspect ratio 1:1)</li>
                    <li>
                      At least {MIN_SOURCE_SIZE} × {MIN_SOURCE_SIZE} px
                    </li>
                    <li>PNG, JPEG, WebP, GIF or SVG</li>
                  </ul>
                </div>
              </aside>
            </div>
          </>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400"
          >
            <TriangleAlert size={17} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
      </section>
    </ShadowModule>
  );
}
