import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ImagePlus,
  Lock,
  LockKeyhole,
  LockOpen,
  RefreshCw,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import ShadowModule from "../../components/ShadowModule";
import styles from "./main.css?inline";

type ChannelRange = { start: number; end: number };
type ColorEntry = { key: number; pixels: Uint32Array; count: number };
type DisplayMode = "rgba" | "hex8" | "hex6";
const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const pack = (r: number, g: number, b: number, a: number) =>
  ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
const unpack = (key: number) =>
  [
    (key >>> 24) & 255,
    (key >>> 16) & 255,
    (key >>> 8) & 255,
    key & 255,
  ] as const;
const hex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
const formatColor = (key: number, mode: DisplayMode) => {
  const [r, g, b, a] = unpack(key);
  if (mode === "hex8") return `#${hex(r)}${hex(g)}${hex(b)}${hex(a)}`;
  if (mode === "hex6") return `#${hex(r)}${hex(g)}${hex(b)}`;
  return `RGBA(${r}, ${g}, ${b}, ${a})`;
};
const matches = (value: number, range: ChannelRange) =>
  value >= Math.min(range.start, range.end) &&
  value <= Math.max(range.start, range.end);
const formatNumber = (n: number) => n.toLocaleString();

function buildColorIndex(data: Uint8ClampedArray): ColorEntry[] {
  const buckets = new Map<number, number[]>();
  for (let offset = 0, pixel = 0; offset < data.length; offset += 4, pixel++) {
    const key = pack(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      data[offset + 3],
    );
    const bucket = buckets.get(key);
    if (bucket) bucket.push(pixel);
    else buckets.set(key, [pixel]);
  }
  return Array.from(buckets, ([key, pixels]) => ({
    key,
    pixels: Uint32Array.from(pixels),
    count: pixels.length,
  }));
}

export default function PixelFilter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{
    x: number;
    y: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const originalRef = useRef<ImageData | null>(null);
  const workingRef = useRef<ImageData | null>(null);
  const indexRef = useRef<ColorEntry[]>([]);
  const [fileName, setFileName] = useState("");
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [ranges, setRanges] = useState<Record<"r" | "g" | "b", ChannelRange>>({
    r: { start: 255, end: 255 },
    g: { start: 255, end: 255 },
    b: { start: 255, end: 255 },
  });
  const [mode, setMode] = useState<DisplayMode>("rgba");
  const [colorsOpen, setColorsOpen] = useState(false);
  const [checkerboard, setCheckerboard] = useState(true);
  const [ctrlHeld, setCtrlHeld] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [zoomColor, setZoomColor] = useState("#000000FF");
  const [zoomRgba, setZoomRgba] = useState("RGBA(0, 0, 0, 255)");
  const [zoomInsideImage, setZoomInsideImage] = useState(false);
  const [valuesLocked, setValuesLocked] = useState(false);
  const [inverseFilter, setInverseFilter] = useState(false);
  const [inverseAlpha, setInverseAlpha] = useState(0);
  const [colorLimit, setColorLimit] = useState(300);
  const [colors, setColors] = useState<ColorEntry[]>([]);
  const [swatchModes, setSwatchModes] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [matchedPixels, setMatchedPixels] = useState(0);
  const [matchedColors, setMatchedColors] = useState(0);
  const [copied, setCopied] = useState("");
  const copyToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateRange = (
    channel: "r" | "g" | "b",
    side: "start" | "end",
    raw: string,
  ) => {
    const value = raw === "" ? 0 : clamp(Number(raw));
    setRanges((old) => {
      const delta = value - old[channel][side];
      const next = { ...old, [channel]: { ...old[channel], [side]: value } };
      if (valuesLocked && raw !== "") {
        // Lock synchronizes the change (delta), not the absolute values.
        // Starting fields move together; ending fields move together separately.
        for (const other of ["r", "g", "b"] as const) {
          if (other === channel) continue;
          next[other] = {
            ...old[other],
            [side]: clamp(old[other][side] + delta),
          };
        }
      }
      return next;
    });
  };

  const applyFilter = useCallback(
    (
      nextRanges = ranges,
      useInverse = inverseFilter,
      alphaPercent = inverseAlpha,
    ) => {
      const original = originalRef.current;
      const working = workingRef.current;
      const canvas = canvasRef.current;
      if (!original || !working || !canvas) return;
      working.data.set(original.data);
      let pixelCount = 0;
      let colorCount = 0;
      for (const entry of indexRef.current) {
        const [r, g, b, originalAlpha] = unpack(entry.key);
        const inSelectedRange =
          matches(r, nextRanges.r) &&
          matches(g, nextRanges.g) &&
          matches(b, nextRanges.b);
        // Normal mode applies alpha to matching pixels; inverse mode applies it
        // to non-matching pixels. The counter reports the pixels actually affected.
        const shouldApplyAlpha = useInverse
          ? !inSelectedRange
          : inSelectedRange;
        if (shouldApplyAlpha) {
          colorCount++;
          pixelCount += entry.count;
          // Scale the source alpha instead of replacing it, preserving existing
          // transparency (e.g. source alpha 128 at 50% becomes 64).
          const alpha = Math.round(originalAlpha * (alphaPercent / 100));
          for (const pixel of entry.pixels) working.data[pixel * 4 + 3] = alpha;
        }
      }
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.putImageData(working, 0, 0);
      setMatchedPixels(pixelCount);
      setMatchedColors(colorCount);
    },
    [ranges, inverseFilter, inverseAlpha],
  );

  const updateZoom = useCallback(() => {
    const source = canvasRef.current;
    const zoom = zoomCanvasRef.current;
    const wrapper = previewWrapRef.current;
    const pointer = pointerRef.current;
    if (!ctrlHeld || !source || !zoom || !wrapper || !pointer) return;
    const rect = source.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scaleX = source.width / rect.width;
    const scaleY = source.height / rect.height;
    const imageX = (pointer.clientX - rect.left) * scaleX;
    const imageY = (pointer.clientY - rect.top) * scaleY;
    const ctx = zoom.getContext("2d");
    if (!ctx) return;
    const zoomSize = 180;
    const sourceSizeX = (zoomSize / 4) * scaleX;
    const sourceSizeY = (zoomSize / 4) * scaleY;
    // Keep the pointer's pixel under the crosshair, even at image edges.
    // Drawing the whole preview into a larger virtual view leaves empty space
    // beyond the image instead of clamping the crop and shifting the target.
    ctx.clearRect(0, 0, zoomSize, zoomSize);
    ctx.fillStyle = "#202020";
    ctx.fillRect(0, 0, zoomSize, zoomSize);
    ctx.imageSmoothingEnabled = false;
    const drawScaleX = zoomSize / sourceSizeX;
    const drawScaleY = zoomSize / sourceSizeY;
    ctx.drawImage(
      source,
      zoomSize / 2 - imageX * drawScaleX,
      zoomSize / 2 - imageY * drawScaleY,
      source.width * drawScaleX,
      source.height * drawScaleY,
    );
    const insideImage =
      imageX >= 0 &&
      imageY >= 0 &&
      imageX < source.width &&
      imageY < source.height;
    setZoomInsideImage(insideImage);
    const pixelX = Math.floor(imageX);
    const pixelY = Math.floor(imageY);
    const pixelOffset = (pixelY * source.width + pixelX) * 4;
    const pixelData = workingRef.current?.data;
    if (insideImage && pixelData) {
      const r = pixelData[pixelOffset],
        g = pixelData[pixelOffset + 1],
        b = pixelData[pixelOffset + 2],
        a = pixelData[pixelOffset + 3];
      setZoomColor(`#${hex(r)}${hex(g)}${hex(b)}${hex(a)}`);
      setZoomRgba(`RGBA(${r}, ${g}, ${b}, ${a})`);
    }
    ctx.strokeStyle = "rgba(255,255,255,.95)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(zoomSize / 2, 0);
    ctx.lineTo(zoomSize / 2, zoomSize);
    ctx.moveTo(0, zoomSize / 2);
    ctx.lineTo(zoomSize, zoomSize / 2);
    ctx.stroke();
    const wrapRect = wrapper.getBoundingClientRect();
    // Keep the magnifier inside the preview frame, not inside the image bounds.
    // This lets the crosshair inspect the empty frame area around image edges.
    setZoomPosition({
      x: Math.max(
        8,
        Math.min(Math.max(8, wrapRect.width - 188 - 8), pointer.x + 24),
      ),
      y: Math.max(
        8,
        Math.min(Math.max(8, wrapRect.height - 188 - 8), pointer.y + 24),
      ),
    });
  }, [ctrlHeld]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "Control") setCtrlHeld(true);
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === "Control") setCtrlHeld(false);
    };
    const blur = () => setCtrlHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useEffect(() => {
    updateZoom();
  }, [updateZoom]);

  useEffect(() => {
    if (!originalRef.current) return;
    // Re-apply on the next paint after each committed input change. This keeps
    // the preview responsive without waiting for a debounce interval.
    const frame = requestAnimationFrame(() => applyFilter(ranges));
    return () => cancelAnimationFrame(frame);
  }, [ranges, inverseFilter, inverseAlpha, applyFilter]);

  const loadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please choose a supported image file.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const bitmap = await createImageBitmap(file);
      // The preview canvas is rendered only when fileName is set. Mount it
      // before reading the ref; otherwise canvasRef.current is still null.
      setFileName(file.name);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const canvas = canvasRef.current;
      if (!canvas) {
        bitmap.close();
        throw new Error("The image preview could not be initialized.");
      }
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx)
        throw new Error(
          "Your browser could not create an image processing context.",
        );
      ctx.clearRect(0, 0, bitmap.width, bitmap.height);
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const original = ctx.getImageData(0, 0, canvas.width, canvas.height);
      originalRef.current = original;
      workingRef.current = new ImageData(
        new Uint8ClampedArray(original.data),
        original.width,
        original.height,
      );
      setDimensions({ width: original.width, height: original.height });
      // Yield before building the index so the browser can paint the uploaded preview.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const built = buildColorIndex(original.data);
      indexRef.current = built;
      setColors(built);
      setColorLimit(300);
      setSwatchModes({});
      applyFilter(
        {
          r: { start: 255, end: 255 },
          g: { start: 255, end: 255 },
          b: { start: 255, end: 255 },
        },
        inverseFilter,
        inverseAlpha,
      );
    } catch (e) {
      setFileName("");
      setError(e instanceof Error ? e.message : "Unable to read this image.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    originalRef.current = null;
    workingRef.current = null;
    indexRef.current = [];
    setColors([]);
    setFileName("");
    setDimensions({ width: 0, height: 0 });
    setMatchedPixels(0);
    setMatchedColors(0);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
    }
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        setError("Could not export the filtered image.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${fileName.replace(/\.[^.]+$/, "") || "image"}-filtered.png`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  };

  const copyColor = async (key: number, displayMode: DisplayMode) => {
    const value = formatColor(key, displayMode);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
      copyToastTimerRef.current = setTimeout(() => setCopied(""), 1800);
    } catch {
      setError("Clipboard access is unavailable in this browser context.");
    }
  };

  useEffect(
    () => () => {
      if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
    },
    [],
  );

  const sortedColors = useMemo(
    () => [...colors].sort((a, b) => b.count - a.count),
    [colors],
  );
  const channelControls = [
    { id: "r", label: "Red", color: "bg-red-500" },
    { id: "g", label: "Green", color: "bg-green-500" },
    { id: "b", label: "Blue", color: "bg-blue-500" },
  ] as const;

  return (
    <ShadowModule css={styles} includeShadowStyles>
      <section className="mx-auto w-full max-w-5xl space-y-5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void loadFile(file);
          }}
        />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              Pixel Filter
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Filter image pixels by independent RGB ranges, with optional
              inverse transparency.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border-primary px-3 py-1.5 text-xs text-text-secondary">
            <LockKeyhole size={14} /> Processed locally in your browser
          </div>
        </div>
        {!fileName ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) void loadFile(file);
            }}
            className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border-primary bg-background-secondary p-8 text-center transition hover:border-text-secondary"
          >
            <div className="mb-4 rounded-2xl border border-border-primary p-4">
              <ImagePlus size={30} color="var(--color-text-secondary)" />
            </div>
            <span className="font-medium text-text-primary">
              Drop an image here or browse
            </span>
            <span className="mt-2 text-sm text-text-secondary">
              PNG, JPEG, WebP, GIF or SVG
            </span>
            <span className="mt-5 inline-flex items-center gap-2 rounded-lg bg-button-primary px-4 py-2 text-sm font-medium text-dark">
              <Upload size={15} /> Choose image
            </span>
          </button>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-primary bg-background-secondary p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">
                  {fileName}
                </p>
                <p className="text-xs text-text-secondary">
                  {formatNumber(dimensions.width)} ×{" "}
                  {formatNumber(dimensions.height)} ·{" "}
                  {formatNumber(dimensions.width * dimensions.height)} pixels ·{" "}
                  {formatNumber(colors.length)} unique colors
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-text-secondary">
                  Display format
                </span>
                <div className="flex rounded-lg border border-border-primary p-1">
                  {(["rgba", "hex8", "hex6"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMode(value)}
                      className={`rounded-md px-2 py-1 text-xs uppercase ${mode === value ? "bg-button-primary font-semibold text-dark" : "text-text-secondary"}`}
                    >
                      {value === "rgba"
                        ? "RGBA"
                        : value === "hex8"
                          ? "HEX 8"
                          : "HEX 6"}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  title="Choose another image"
                  className="rounded-lg border border-border-primary p-2 text-text-secondary hover:text-text-primary"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  type="button"
                  onClick={reset}
                  title="Remove image"
                  className="rounded-lg border border-border-primary p-2 text-text-secondary hover:text-text-primary"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-border-primary bg-background-secondary">
                  <div className="flex items-center justify-between gap-3 border-b border-border-primary px-4 py-2">
                    <h3 className="text-sm font-semibold text-text-primary">
                      Live preview
                    </h3>
                    <button
                      type="button"
                      onClick={() => setCheckerboard((enabled) => !enabled)}
                      aria-pressed={checkerboard}
                      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border-primary px-3 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
                    >
                      <span
                        className={`size-3 rounded-sm border border-border-primary ${checkerboard ? "pixel-checker" : "bg-background-primary"}`}
                      />
                      {checkerboard ? "Checkerboard: On" : "Checkerboard: Off"}
                    </button>
                  </div>
                  <div
                    ref={previewWrapRef}
                    onPointerMove={(e) => {
                      const rect =
                        previewWrapRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      pointerRef.current = {
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        clientX: e.clientX,
                        clientY: e.clientY,
                      };
                      if (ctrlHeld) updateZoom();
                    }}
                    onPointerLeave={() => {
                      pointerRef.current = null;
                      setZoomInsideImage(false);
                    }}
                    className={`${checkerboard ? "pixel-checker" : "bg-background-primary"} relative flex min-h-72 max-h-[70vh] items-center justify-center overflow-hidden p-4`}
                  >
                    <canvas
                      ref={canvasRef}
                      className="h-auto max-h-[65vh] max-w-full object-contain shadow-lg"
                    />
                    {ctrlHeld && pointerRef.current && (
                      <div
                        className="pointer-events-none absolute z-20 overflow-hidden rounded-xl border-2 border-white/80 bg-background-secondary shadow-2xl"
                        style={{
                          left: zoomPosition.x,
                          top: zoomPosition.y,
                          width: 188,
                          height: 188,
                        }}
                      >
                        <canvas
                          ref={zoomCanvasRef}
                          width={180}
                          height={180}
                          className="block h-45 w-45"
                        />
                        {zoomInsideImage && (
                          <span className="absolute left-1/2 top-1 flex -translate-x-1/2 flex-col items-center gap-0.5 whitespace-nowrap rounded bg-black/80 px-2 py-1 font-mono text-[10px] font-semibold leading-tight text-white shadow">
                            <span>{zoomColor}</span>
                            <span>{zoomRgba}</span>
                          </span>
                        )}
                        <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-semibold text-white drop-shadow">
                          4× zoom · Ctrl
                        </span>
                      </div>
                    )}
                    <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white">
                      Hold Ctrl and hover to zoom
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-primary p-3">
                  <div className="text-xs text-text-secondary">
                    <span className="font-semibold text-text-primary">
                      {formatNumber(matchedPixels)}
                    </span>{" "}
                    pixels ·{" "}
                    <span className="font-semibold text-text-primary">
                      {formatNumber(matchedColors)}
                    </span>{" "}
                    colors matched
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const defaults = {
                          r: { start: 255, end: 255 },
                          g: { start: 255, end: 255 },
                          b: { start: 255, end: 255 },
                        };
                        setRanges(defaults);
                        applyFilter(defaults);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-border-primary px-3 py-2 text-xs text-text-primary"
                    >
                      <RotateCcw size={14} /> Reset ranges
                    </button>
                    <button
                      type="button"
                      onClick={download}
                      className="inline-flex items-center gap-2 rounded-lg bg-button-primary px-3 py-2 text-xs font-semibold text-dark"
                    >
                      <Download size={14} /> Download PNG
                    </button>
                  </div>
                </div>
              </div>
              <aside className="rounded-xl border border-border-primary bg-background-secondary p-4">
                <div className="mb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">
                      RGB threshold ranges
                    </h3>
                    <button
                      type="button"
                      onClick={() => setValuesLocked((locked) => !locked)}
                      aria-pressed={valuesLocked}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${valuesLocked ? "border-button-primary bg-button-primary text-dark" : "border-border-primary text-text-secondary hover:text-text-primary"}`}
                    >
                      <span>
                        {valuesLocked ? (
                          <Lock size={14} />
                        ) : (
                          <LockOpen size={14} />
                        )}
                      </span>
                      {valuesLocked ? "Values locked" : "Lock values"}
                    </button>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    A pixel matches when all three channel values fall inside
                    their respective ranges. Start and end can be entered in
                    either order.
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
                    {valuesLocked
                      ? "Changing any starting value shifts all three starting values by the same amount. Ending values move together independently."
                      : "Lock values to adjust all three starting values or all three ending values together, while preserving their differences."}
                  </p>
                  <div className="space-y-5">
                    {channelControls.map((channel) => (
                      <div key={channel.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2.5 rounded-full ${channel.color}`}
                          />
                          <h4 className="text-sm font-medium text-text-primary">
                            {channel.label}
                          </h4>
                          <span className="ml-auto text-xs tabular-nums text-text-secondary">
                            {Math.min(
                              ranges[channel.id].start,
                              ranges[channel.id].end,
                            )}
                            –
                            {Math.max(
                              ranges[channel.id].start,
                              ranges[channel.id].end,
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="block">
                            <span className="mb-1 block text-xs text-text-secondary">
                              Starting value
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={255}
                              value={ranges[channel.id].start}
                              onChange={(e) =>
                                updateRange(channel.id, "start", e.target.value)
                              }
                              className="w-full rounded-lg border border-border-primary bg-dark px-3 py-2 text-sm text-text-primary outline-none focus:border-text-secondary"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs text-text-secondary">
                              Ending value
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={255}
                              value={ranges[channel.id].end}
                              onChange={(e) =>
                                updateRange(channel.id, "end", e.target.value)
                              }
                              className="w-full rounded-lg border border-border-primary bg-dark px-3 py-2 text-sm text-text-primary outline-none focus:border-text-secondary"
                            />
                          </label>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-text-secondary">
                          <span>0</span>
                          <span>255</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-lg border border-border-primary p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-medium text-text-primary">
                          Inverse filtering
                        </h4>
                        <p className="mt-0.5 text-[11px] text-text-secondary">
                          Apply transparency to pixels outside the selected RGB
                          ranges.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInverseFilter((enabled) => !enabled)}
                        aria-pressed={inverseFilter}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${inverseFilter ? "border-button-primary bg-button-primary text-dark" : "border-border-primary text-text-secondary hover:text-text-primary"}`}
                      >
                        {inverseFilter ? "Inverse: On" : "Inverse: Off"}
                      </button>
                    </div>
                    <label className="mt-3 block">
                      <span className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                        <span>Alpha for filtered pixels</span>
                        <strong className="tabular-nums text-text-primary">
                          {inverseAlpha}%
                        </strong>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={inverseAlpha}
                        onChange={(e) =>
                          setInverseAlpha(Number(e.target.value))
                        }
                        className="w-full accent-button-primary"
                      />
                      <span className="flex justify-between text-[10px] text-text-secondary">
                        <span>0% · Transparent</span>
                        <span>100% · Opaque</span>
                      </span>
                    </label>
                  </div>
                </div>
                <div className="mt-5 rounded-lg border border-border-primary p-3 text-xs leading-relaxed text-text-secondary">
                  {inverseFilter
                    ? `Pixels outside the selected ranges receive ${inverseAlpha}% of their original alpha; pixels inside the ranges are preserved.`
                    : `Matching pixels receive ${inverseAlpha}% of their original alpha.`}{" "}
                  The original image data is retained so you can change ranges
                  repeatedly without losing pixels.
                </div>
              </aside>
            </div>
            <section className="overflow-hidden rounded-xl border border-border-primary">
              <button
                type="button"
                onClick={() => setColorsOpen((open) => !open)}
                aria-expanded={colorsOpen}
                className="flex w-full items-center justify-between bg-background-secondary px-4 py-3 text-left"
              >
                <span>
                  <span className="block text-sm font-semibold text-text-primary">
                    Colors in image
                  </span>
                  <span className="mt-0.5 block text-xs text-text-secondary">
                    {formatNumber(colors.length)} unique colors · sorted by
                    frequency
                  </span>
                </span>
                {colorsOpen ? (
                  <ChevronUp size={18} />
                ) : (
                  <ChevronDown size={18} />
                )}
              </button>
              {colorsOpen && (
                <div className="p-3">
                  <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
                    {sortedColors.slice(0, colorLimit).map((entry) => {
                      const showHex = swatchModes[entry.key] ?? mode !== "rgba";
                      const rowMode: DisplayMode = showHex
                        ? mode === "rgba"
                          ? "hex8"
                          : mode
                        : "rgba";
                      const display = formatColor(entry.key, rowMode);
                      const [r, g, b, a] = unpack(entry.key);
                      return (
                        <div
                          key={entry.key}
                          className="flex min-w-0 items-center gap-2 border-b border-border-primary/40 py-2"
                        >
                          <button
                            type="button"
                            title={`Left-click to copy ${display}; right-click to toggle RGBA / HEX`}
                            aria-label={`Copy ${display}. Right-click to toggle color format.`}
                            onClick={() => void copyColor(entry.key, rowMode)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setSwatchModes((old) => ({
                                ...old,
                                [entry.key]: !(
                                  old[entry.key] ?? mode !== "rgba"
                                ),
                              }));
                            }}
                            className="pixel-checker size-8 shrink-0 overflow-hidden rounded border border-border-primary"
                          >
                            <span
                              className="block size-full"
                              style={{
                                backgroundColor: `rgba(${r}, ${g}, ${b}, ${a / 255})`,
                              }}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => void copyColor(entry.key, rowMode)}
                            className="min-w-0 flex-1 truncate text-left font-mono text-xs text-text-primary hover:underline"
                            title="Click to copy the currently displayed color value"
                          >
                            {display}
                          </button>
                          <span className="shrink-0 text-[11px] tabular-nums text-text-secondary">
                            {formatNumber(entry.count)}×
                          </span>
                          <button
                            type="button"
                            onClick={() => void copyColor(entry.key, rowMode)}
                            title="Copy color"
                            className="rounded p-1 text-text-secondary hover:text-text-primary"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {sortedColors.length > colorLimit && (
                    <button
                      type="button"
                      onClick={() =>
                        setColorLimit((limit) =>
                          Math.min(limit + 300, sortedColors.length),
                        )
                      }
                      className="mt-3 w-full rounded-lg border border-border-primary px-3 py-2 text-xs text-text-primary hover:bg-background-secondary"
                    >
                      Show more colors (
                      {formatNumber(sortedColors.length - colorLimit)}{" "}
                      remaining)
                    </button>
                  )}
                </div>
              )}
            </section>
          </>
        )}
        {busy && fileName && (
          <p className="text-center text-xs text-text-secondary">
            Building color index and preparing preview… Large images may take a
            moment.
          </p>
        )}
        {copied && (
          <div
            key={copied}
            role="status"
            aria-live="polite"
            className="pixel-copy-toast fixed bottom-5 right-5 z-100 flex max-w-[min(28rem,calc(100vw-2.5rem))] items-center gap-2 rounded-xl border border-border-primary bg-background-secondary px-4 py-3 text-sm text-text-primary shadow-2xl"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-button-primary text-dark">
              <Check size={14} strokeWidth={3} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-text-secondary">
                Copied to clipboard
              </span>
              <span className="block truncate font-mono text-xs">{copied}</span>
            </span>
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400"
          >
            {error}
          </p>
        )}
      </section>
    </ShadowModule>
  );
}
