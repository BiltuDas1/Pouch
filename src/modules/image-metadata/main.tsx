import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  FileSearch,
  ImagePlus,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import ShadowModule from "../../components/ShadowModule";
import styles from "./main.css?inline";
import {
  inspectImage,
  removeMetadata,
  type ImageInfo,
  type MetadataField,
  type MetadataGroup,
} from "./lib/image";

type GroupInfo = { id: MetadataGroup; label: string; description: string };
const GROUPS: GroupInfo[] = [
  {
    id: "GPS",
    label: "Location (GPS)",
    description: "Coordinates, altitude, direction and location timestamps",
  },
  {
    id: "EXIF",
    label: "Camera & EXIF",
    description: "Camera, lens, exposure, orientation and capture details",
  },
  {
    id: "XMP",
    label: "XMP metadata",
    description: "Creator, editing history, software and embedded descriptions",
  },
  {
    id: "IPTC",
    label: "IPTC metadata",
    description: "Author, copyright, captions and keywords",
  },
  {
    id: "ICC",
    label: "Color profile (ICC)",
    description:
      "Embedded color profile; removing it can change color appearance in some viewers",
  },
  {
    id: "Comments",
    label: "Comments & timestamps",
    description: "Comments and format-specific time metadata",
  },
  {
    id: "PNG Text",
    label: "PNG text metadata",
    description: "Text, compressed text and international text chunks",
  },
  {
    id: "Thumbnail",
    label: "Embedded thumbnails",
    description: "Preview images stored inside metadata blocks",
  },
  {
    id: "Content Credentials",
    label: "Content credentials (C2PA)",
    description: "C2PA/JUMBF provenance markers, signatures and assertions",
  },
  {
    id: "Custom",
    label: "Custom / unreadable metadata",
    description:
      "Unrecognized chunks or application segments; contents cannot be interpreted",
  },
  {
    id: "Image Properties",
    label: "Image properties",
    description:
      "Dimensions, bit depth, color type and encoding properties (not privacy metadata)",
  },
  {
    id: "Other",
    label: "Other application metadata",
    description:
      "Other recognized metadata blocks supported by the format handler",
  },
];
const formatBytes = (n: number) =>
  n < 1024
    ? `${n} B`
    : n < 1024 * 1024
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1024 / 1024).toFixed(2)} MB`;
const displayValue = (value: unknown) =>
  typeof value === "string"
    ? value
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

export default function ImageMetadata() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<ImageInfo | null>(null);
  const [selected, setSelected] = useState<MetadataGroup[]>([
    "GPS",
    "XMP",
    "IPTC",
    "Comments",
    "PNG Text",
  ]);
  const [result, setResult] = useState<Blob | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"metadata" | "clean">("metadata");
  const [previewUrl, setPreviewUrl] = useState("");
  const [includeCustom, setIncludeCustom] = useState(false);
  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const grouped = useMemo(() => {
    const map = new Map<MetadataGroup, MetadataField[]>();
    for (const field of info?.fields ?? [])
      map.set(field.group, [...(map.get(field.group) ?? []), field]);
    return map;
  }, [info]);
  const visibleGroups = GROUPS.filter((g) => grouped.has(g.id));
  const filteredFields = (info?.fields ?? []).filter((f) =>
    `${f.key} ${displayValue(f.value)} ${f.group}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  async function loadImage(next: File) {
    setBusy(true);
    setError("");
    setResult(null);
    setRemoved([]);
    try {
      const parsed = await inspectImage(next);
      setFile(next);
      setInfo(parsed);
      setTab("metadata");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to inspect this image.",
      );
    } finally {
      setBusy(false);
    }
  }
  function toggle(group: MetadataGroup) {
    setSelected((old) =>
      old.includes(group) ? old.filter((x) => x !== group) : [...old, group],
    );
    setResult(null);
  }
  async function clean() {
    if (!file || !info) return;
    if (
      grouped.has("Custom") &&
      !includeCustom &&
      selected.includes("Custom")
    ) {
      setError(
        "Custom metadata may contain unreadable private data. Confirm whether you want to remove these unknown blocks by selecting the custom metadata option.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const cleaned = removeMetadata(
        bytes,
        info.format,
        { groups: selected },
        file.type || "application/octet-stream",
      );
      if (!cleaned.supported) {
        setError(cleaned.note ?? "This format is view-only.");
        return;
      }
      setResult(cleaned.blob);
      setRemoved(cleaned.removed);
      setTab("clean");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not clean this image.");
    } finally {
      setBusy(false);
    }
  }
  function download() {
    if (!result || !file) return;
    const url = URL.createObjectURL(result);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.name.replace(/\.[^.]+$/, "")}-cleaned${file.name.match(/\.[^.]+$/)?.[0] ?? ".img"}`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function reset() {
    setFile(null);
    setIncludeCustom(false);
    setInfo(null);
    setResult(null);
    setRemoved([]);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <ShadowModule css={styles} includeShadowStyles>
      <section className="mx-auto w-full max-w-5xl space-y-5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif,.avif,.tif,.tiff"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void loadImage(f);
          }}
        />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              Image metadata
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Inspect hidden image data and remove selected metadata without
              recompressing supported formats.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border-primary px-3 py-1.5 text-xs text-text-secondary">
            <LockKeyhole size={14} /> Processed locally in your browser
          </div>
        </div>
        {!file ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) void loadImage(f);
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
              JPEG, PNG, WebP, GIF, HEIC, AVIF, TIFF and more for inspection
            </span>
            <span className="mt-5 inline-flex items-center gap-2 rounded-lg bg-button-primary px-4 py-2 text-sm font-medium text-dark">
              <Upload size={15} /> Choose image
            </span>
          </button>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-primary bg-background-secondary p-3">
              <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border border-border-primary">
                <ImagePlus size={30} color="var(--color-text-secondary)" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {file.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {info?.format} · {formatBytes(file.size)} ·{" "}
                  {info?.fields.length ?? 0} metadata fields detected
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-border-primary p-2 text-text-secondary hover:text-text-primary"
                onClick={() => inputRef.current?.click()}
                title="Choose another image"
              >
                <RefreshCw size={16} />
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
                      Image preview
                    </h3>
                    <span className="text-xs text-text-secondary">
                      Original file
                    </span>
                  </div>
                  <div className="flex min-h-64 max-h-136 items-center justify-center overflow-auto bg-black/20 p-4">
                    <img
                      src={previewUrl}
                      alt={`Preview of ${file.name}`}
                      className="max-h-120 max-w-full object-contain"
                    />
                  </div>
                  <p className="border-t border-border-primary px-4 py-2 text-xs text-text-secondary">
                    Preview uses the original file. It is not re-encoded or
                    modified.
                  </p>
                </div>
                <div className="flex gap-2 border-b border-border-primary">
                  <button
                    type="button"
                    className={`px-3 py-2 text-sm ${tab === "metadata" ? "border-b-2 border-text-primary text-text-primary" : "text-text-secondary"}`}
                    onClick={() => setTab("metadata")}
                  >
                    Metadata viewer
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-2 text-sm ${tab === "clean" ? "border-b-2 border-text-primary text-text-primary" : "text-text-secondary"}`}
                    onClick={() => setTab("clean")}
                  >
                    Cleaning result
                  </button>
                </div>
                {tab === "metadata" ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <FileSearch
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                      />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search metadata fields..."
                        className="w-full rounded-lg border border-border-primary bg-background-secondary py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-text-secondary"
                      />
                    </div>
                    {filteredFields.length ? (
                      <div className="overflow-hidden rounded-xl border border-border-primary">
                        <div className="flex items-center justify-between bg-background-secondary px-4 py-2 text-xs text-text-secondary">
                          <span>Detected metadata</span>
                          <span>{filteredFields.length} fields</span>
                        </div>
                        {filteredFields.map((field, i) => (
                          <div
                            key={`${field.key}-${i}`}
                            className="grid gap-1 border-t border-border-primary px-4 py-3 sm:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]"
                          >
                            <div className="min-w-0">
                              <p className="break-all text-xs font-medium text-text-primary">
                                {field.key}
                              </p>
                              <p className="mt-0.5 text-[11px] text-text-secondary">
                                {field.group}
                              </p>
                            </div>
                            <p className="break-all text-xs text-text-secondary">
                              {displayValue(field.value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border-primary p-8 text-center text-sm text-text-secondary">
                        No metadata fields found
                        {query
                          ? " matching your search"
                          : " in the supported parsers"}
                        .
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-border-primary p-4">
                    {result ? (
                      <>
                        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                          <Check size={17} className="text-green-500" /> Cleaned
                          copy is ready
                        </div>
                        <p className="text-xs text-text-secondary">
                          {removed.length} metadata blocks removed ·{" "}
                          {formatBytes(result.size)} output · original file
                          unchanged
                        </p>
                        {removed.length ? (
                          <ul className="space-y-1 text-xs text-text-secondary">
                            {removed.map((r) => (
                              <li key={r}>• {r}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-text-secondary">
                            No selected metadata blocks were found in this file.
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={download}
                          className="inline-flex items-center gap-2 rounded-lg bg-button-primary px-4 py-2.5 text-sm font-medium text-dark"
                        >
                          <Download size={16} /> Download cleaned image
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-text-secondary">
                        Choose metadata groups on the right, then select Remove
                        selected metadata.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <aside className="space-y-4">
                <div className="rounded-xl border border-border-primary bg-background-secondary p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-text-primary">
                      Metadata groups
                    </h3>
                    <button
                      type="button"
                      className="text-xs text-text-secondary underline"
                      onClick={() => {
                        setSelected(
                          visibleGroups
                            .filter((g) => g.id !== "Image Properties")
                            .map((g) => g.id),
                        );
                        setResult(null);
                      }}
                    >
                      Select detected
                    </button>
                  </div>
                  <div className="space-y-3">
                    {GROUPS.map((group) => {
                      const count = grouped.get(group.id)?.length ?? 0;
                      return (
                        <label
                          key={group.id}
                          className={`flex cursor-pointer gap-3 ${count ? "" : "opacity-45"}`}
                        >
                          <input
                            type="checkbox"
                            disabled={!count || group.id === "Image Properties"}
                            checked={selected.includes(group.id)}
                            onChange={() => toggle(group.id)}
                            className="mt-1 accent-current"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2 text-sm text-text-primary">
                              {group.label}
                              <span className="text-xs text-text-secondary">
                                {count || "—"}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-xs text-text-secondary">
                              {group.description}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    disabled={busy || !selected.length}
                    onClick={() => void clean()}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-button-primary px-4 py-2.5 text-sm font-semibold text-dark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                    {busy ? "Processing..." : "Remove selected metadata"}
                  </button>
                </div>
                {grouped.has("Custom") && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-300">
                    <AlertTriangle size={15} className="mr-1 inline" />{" "}
                    Unrecognized/custom metadata was detected. Its contents
                    cannot be read here. Do you want to remove these unknown
                    metadata blocks too?{" "}
                    <label className="mt-2 flex cursor-pointer items-center gap-2 text-text-primary">
                      <input
                        type="checkbox"
                        checked={includeCustom}
                        onChange={(e) => {
                          setIncludeCustom(e.target.checked);
                          setSelected((old) =>
                            e.target.checked
                              ? [
                                  ...new Set([
                                    ...old,
                                    "Custom" as MetadataGroup,
                                  ]),
                                ]
                              : old.filter((x) => x !== "Custom"),
                          );
                          setResult(null);
                        }}
                      />{" "}
                      Yes, remove custom metadata where supported
                    </label>
                  </div>
                )}
                {(selected.includes("GPS") || selected.includes("Thumbnail")) &&
                  !selected.includes("EXIF") &&
                  (info?.format === "JPEG" ||
                    info?.format === "PNG" ||
                    info?.format === "WebP") && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-300">
                      <AlertTriangle size={15} className="mr-1 inline" /> GPS
                      and embedded thumbnails are stored inside the EXIF
                      container in these formats. Removing them currently
                      removes the complete EXIF container, including camera and
                      capture fields.
                    </div>
                  )}
                <div className="rounded-xl border border-border-primary p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    <ShieldCheck size={17} /> Lossless processing
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                    Supported cleaners copy compressed image data directly and
                    remove metadata structures. No canvas export or JPEG
                    recompression is used. Color profiles are preserved unless
                    explicitly selected for removal.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                    HEIC, AVIF and TIFF are inspection-only until safe lossless
                    writers are available. Some nested EXIF fields require
                    removing their containing EXIF block, which is disclosed
                    before processing.
                  </p>
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
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {busy && (
          <p className="text-center text-xs text-text-secondary">
            Processing locally. Large files may take a moment.
          </p>
        )}
      </section>
    </ShadowModule>
  );
}
