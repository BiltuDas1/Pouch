import { useState } from "react";
import { Check, Copy, Eraser, LockKeyhole, Trash2 } from "lucide-react";
import ShadowModule from "../../components/ShadowModule";
import styles from "./main.css?inline";
import { cleanUrl } from "./lib/url";

export default function UrlCleaner() {
  const [url, setUrl] = useState("");
  const [removeQuery, setRemoveQuery] = useState(false);
  const [live, setLive] = useState(true);
  const [manualOutput, setManualOutput] = useState("");
  const [manualCleaned, setManualCleaned] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const trimmedUrl = url.trim();
  const liveOutput = trimmedUrl ? cleanUrl(trimmedUrl, { removeQuery }) : "";
  const output = live ? liveOutput : manualOutput;

  function handleUrlChange(value: string) {
    setUrl(value);
    setCopied(false);
    setError("");

    if (!live) {
      setManualOutput("");
      setManualCleaned(false);
    }
  }

  function handleLiveChange(checked: boolean) {
    setLive(checked);
    setManualOutput(checked ? "" : liveOutput);
    setManualCleaned(false);
    setCopied(false);
  }

  function handleRemoveQueryChange(checked: boolean) {
    setRemoveQuery(checked);
    setCopied(false);

    if (!live) {
      setManualOutput("");
      setManualCleaned(false);
    }
  }

  function handleClean() {
    setManualOutput(trimmedUrl ? cleanUrl(trimmedUrl, { removeQuery }) : "");
    setManualCleaned(Boolean(trimmedUrl));
    setCopied(false);
    setError("");
  }

  function handleClear() {
    setUrl("");
    setManualOutput("");
    setManualCleaned(false);
    setCopied(false);
    setError("");
  }

  async function handleCopy() {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);

      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not access the clipboard.");
    }
  }

  const status = !trimmedUrl
    ? "Paste a URL to get started."
    : live
      ? "Output updates automatically as you type."
      : manualCleaned
        ? "Cleaned manually."
        : "Live cleaning is off. Press Clean URL to update the output.";

  return (
    <ShadowModule css={styles} includeShadowStyles>
      <section className="mx-auto w-full max-w-5xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              URL Cleaner
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Strip tracking parameters and unnecessary query strings from a
              link before sharing it.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border-primary px-3 py-1.5 text-xs text-text-secondary">
            <LockKeyhole size={14} /> Processed locally in your browser
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="rounded-2xl border border-border-primary bg-background-secondary p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    URL to clean
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    Paste a link that contains tracking information.
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary select-none">
                  <input
                    type="checkbox"
                    checked={live}
                    onChange={(event) => handleLiveChange(event.target.checked)}
                    className="size-4 accent-white"
                  />
                  Live cleaning
                </label>
              </div>

              <label className="mt-5 block">
                <span className="sr-only">URL to clean</span>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(event) => handleUrlChange(event.target.value)}
                    placeholder="https://example.com/article?utm_source=newsletter&utm_medium=email"
                    spellCheck={false}
                    className="min-w-0 flex-1 rounded-lg border border-border-primary bg-dark px-3 py-2.5 font-mono text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-text-secondary"
                  />
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={!url}
                    title="Clear URL"
                    className="flex shrink-0 items-center gap-2 rounded-lg border border-border-primary px-3 py-2 text-sm text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 select-none"
                  >
                    <Trash2 size={16} />
                    Clear
                  </button>
                </div>
              </label>

              <p className="mt-2 text-xs text-text-secondary">
                The URL is processed locally and never uploaded.
              </p>
            </div>

            <div className="rounded-2xl border border-border-primary bg-background-secondary p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-text-primary">
                Options
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                Choose what the cleaner should remove.
              </p>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-border-primary bg-dark p-3 select-none">
                <input
                  type="checkbox"
                  checked={removeQuery}
                  onChange={(event) =>
                    handleRemoveQueryChange(event.target.checked)
                  }
                  className="mt-0.5 size-4 accent-white"
                />
                <span>
                  <span className="block text-sm text-text-primary">
                    Remove everything after “?”
                  </span>
                  <span className="mt-0.5 block text-xs text-text-secondary">
                    Drops the entire query string, including non-tracking
                    parameters.
                  </span>
                </span>
              </label>

              <button
                type="button"
                onClick={handleClean}
                disabled={!trimmedUrl}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-button-primary px-4 py-2.5 text-sm font-semibold text-dark disabled:cursor-not-allowed disabled:opacity-40 select-none"
              >
                <Eraser size={16} /> Clean URL
              </button>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-border-primary bg-background-secondary p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  Cleaned URL
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Copy this version and share it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCopy()}
                disabled={!output}
                className="flex items-center gap-2 rounded-lg border border-border-primary px-3 py-2 text-sm text-text-primary hover:bg-dark disabled:cursor-not-allowed disabled:opacity-40 select-none"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <textarea
              readOnly
              value={output}
              rows={8}
              placeholder="The cleaned URL will appear here."
              spellCheck={false}
              className="mt-5 w-full flex-1 resize-none rounded-lg border border-border-primary bg-dark p-3 font-mono text-sm leading-6 text-text-primary outline-none placeholder:text-text-secondary"
            />

            <p
              role="status"
              aria-live="polite"
              className="mt-2 text-xs text-text-secondary"
            >
              {status}
            </p>
          </div>
        </div>

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
