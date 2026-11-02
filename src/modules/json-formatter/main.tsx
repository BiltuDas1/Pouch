import { useMemo, useState } from "react";
import {
  Braces,
  Brackets,
  Check,
  ChevronRight,
  Clipboard,
  Copy,
  Expand,
  Minimize2,
  RotateCcw,
} from "lucide-react";
import ShadowModule from "../../components/ShadowModule";
import styles from "./main.css?inline";
import { parseJsonLike } from "./lib/parser";

type JsonNodeProps = {
  value: unknown;
  name?: string;
  depth: number;
  path: string;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
};

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function JsonNode({
  value,
  name,
  depth,
  path,
  collapsed,
  onToggle,
}: JsonNodeProps) {
  const isArray = Array.isArray(value);
  const isObject = isJsonObject(value);
  const isContainer = isArray || isObject;
  const entries: [string, unknown][] = isArray
    ? value.map((item, index): [string, unknown] => [String(index), item])
    : isObject
      ? Object.entries(value)
      : [];
  const isEmpty = entries.length === 0;
  const isExpanded = !collapsed.has(path);
  const indentation = { paddingLeft: `${depth * 16}px` };

  if (!isContainer) {
    return (
      <div className="json-line" style={indentation}>
        {name !== undefined && (
          <span className="json-key">{JSON.stringify(name)}:</span>
        )}
        <span className={`json-value json-${value === null ? "null" : typeof value}`}>
          {JSON.stringify(value)}
        </span>
      </div>
    );
  }

  const opening = isArray ? "[" : "{";
  const closing = isArray ? "]" : "}";
  const Icon = isArray ? Brackets : Braces;

  if (isEmpty) {
    return (
      <div className="json-line" style={indentation}>
        {name !== undefined && (
          <span className="json-key">{JSON.stringify(name)}:</span>
        )}
        <span className="json-bracket">{opening}{closing}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="json-line" style={indentation}>
        <button
          type="button"
          className="json-toggle"
          onClick={() => onToggle(path)}
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${name ?? "root"}`}
          aria-expanded={isExpanded}
        >
          <ChevronRight
            size={15}
            className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
        </button>
        <Icon size={14} className="json-container-icon" />
        {name !== undefined && (
          <span className="json-key">{JSON.stringify(name)}:</span>
        )}
        <span className="json-bracket">{opening}</span>
        {!isExpanded && (
          <button
            type="button"
            className="json-summary"
            onClick={() => onToggle(path)}
          >
            {entries.length} {entries.length === 1 ? "item" : "items"} …
          </button>
        )}
        {!isExpanded && <span className="json-bracket">{closing}</span>}
      </div>

      {isExpanded && (
        <>
          {entries.map(([key, child], index) => {
            const childPath = isArray
              ? `${path}[${index}]`
              : `${path}[${JSON.stringify(key)}]`;

            return (
              <JsonNode
                key={childPath}
                value={child}
                name={isArray ? undefined : key}
                depth={depth + 1}
                path={childPath}
                collapsed={collapsed}
                onToggle={onToggle}
              />
            );
          })}
          <div className="json-line" style={indentation}>
            <span className="json-toggle-spacer" />
            <span className="json-bracket">{closing}</span>
          </div>
        </>
      )}
    </div>
  );
}

function collectContainerPaths(value: unknown, path = "root"): string[] {
  if (value === null || typeof value !== "object") return [];

  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value);

  if (entries.length === 0) return [path];

  return [
    path,
    ...entries.flatMap(([key, child], index) =>
      collectContainerPaths(
        child,
        Array.isArray(value)
          ? `${path}[${index}]`
          : `${path}[${JSON.stringify(key)}]`,
      ),
    ),
  ];
}

const DEFAULT_INPUT = `{
  'name': 'Pouch',
  'version': 1,
  'features': {
    'formatter': true,
    'supportedQuotes': ['single', "double"],
    'modules': ['JSON', 'XML']
  },
  'metadata': null
}`;

export default function JsonFormatter() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [data, setData] = useState<unknown>(null);
  const [hasResult, setHasResult] = useState(false);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const formattedJson = useMemo(
    () => (hasResult ? JSON.stringify(data, null, 2) : ""),
    [data, hasResult],
  );

  function handleFormat() {
    setError("");
    setCopied(false);

    try {
      const parsed = parseJsonLike(input);
      setData(parsed);
      setHasResult(true);
      setCollapsed(new Set());
    } catch (cause) {
      setHasResult(false);
      setData(null);
      setError(
        cause instanceof Error ? cause.message : "Unable to parse this input.",
      );
    }
  }

  function togglePath(path: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function expandAll() {
    setCollapsed(new Set());
  }

  function collapseAll() {
    if (hasResult) {
      setCollapsed(new Set(collectContainerPaths(data)));
    }
  }

  async function copyFormatted() {
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not access the clipboard. Check browser permissions.");
    }
  }

  function clearInput() {
    setInput("");
    setData(null);
    setHasResult(false);
    setError("");
    setCopied(false);
    setCollapsed(new Set());
  }

  return (
    <ShadowModule css={styles} includeShadowStyles>
      <section className="mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-section-border bg-section p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">JSON input</h2>
              <p className="mt-1 text-sm text-subtext">
                Paste JSON using single or double quotes.
              </p>
            </div>
            <button
              type="button"
              onClick={clearInput}
              className="flex items-center gap-2 rounded-md border border-section-border px-3 py-2 text-sm text-text hover:bg-dark"
            >
              <RotateCcw size={15} />
              Clear
            </button>
          </div>

          <textarea
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setError("");
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="JSON input"
            placeholder="Paste your JSON here..."
            className="mt-4 min-h-64 w-full resize-y rounded-lg border border-section-border bg-dark p-4 font-mono text-sm leading-6 text-text outline-none placeholder:text-subtext/60 focus:border-subtext"
          />

          {error && (
            <p role="alert" className="mt-3 rounded-md bg-status-error/10 p-3 text-sm text-status-error">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleFormat}
            disabled={!input.trim()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-btn px-4 py-2.5 font-medium text-dark hover:bg-btn-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Braces size={17} />
            Parse &amp; Format
          </button>
          <p className="mt-3 text-xs text-subtext">
            Accepts single-quoted and double-quoted strings. Output is normalized
            to standard JSON with 2-space indentation.
          </p>
        </div>

        {hasResult && (
          <div className="min-w-0 rounded-2xl border border-section-border bg-section p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text">Formatted output</h2>
                <p className="mt-1 text-sm text-subtext">
                  Collapsible JSON tree · 2-space indentation
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={expandAll}
                  className="flex items-center gap-2 rounded-md border border-section-border px-3 py-2 text-sm text-text hover:bg-dark"
                >
                  <Expand size={15} />
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="flex items-center gap-2 rounded-md border border-section-border px-3 py-2 text-sm text-text hover:bg-dark"
                >
                  <Minimize2 size={15} />
                  Collapse all
                </button>
                <button
                  type="button"
                  onClick={copyFormatted}
                  className="flex items-center gap-2 rounded-md bg-btn px-3 py-2 text-sm font-medium text-dark hover:bg-btn-hover"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "Copied" : "Copy JSON"}
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-section-border bg-dark p-3 sm:p-4">
              <div className="min-w-max">
                <JsonNode
                  value={data}
                  depth={0}
                  path="root"
                  collapsed={collapsed}
                  onToggle={togglePath}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-subtext">
              <span>Strings are displayed with double quotes.</span>
              <button
                type="button"
                onClick={copyFormatted}
                className="inline-flex items-center gap-1 hover:text-text"
              >
                <Clipboard size={13} />
                Copy valid JSON
              </button>
            </div>
          </div>
        )}
      </section>
    </ShadowModule>
  );
}
