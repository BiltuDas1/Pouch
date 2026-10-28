import { useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import ShadowModule from "../../components/ShadowModule";
import styles from "./main.css?inline";
import { generateToken } from "./lib/generateToken";
import { Checkbox } from "@headlessui/react";

const CHARACTER_OPTIONS = [
  { key: "uppercase", label: "Uppercase letters", sample: "A–Z" },
  { key: "lowercase", label: "Lowercase letters", sample: "a–z" },
  { key: "numbers", label: "Numbers", sample: "0–9" },
  { key: "symbols", label: "Special characters", sample: "!@#$…" },
] as const;

type CharacterOption = (typeof CHARACTER_OPTIONS)[number]["key"];

export default function TokenGenerator() {
  const [length, setLength] = useState(32);
  const [count, setCount] = useState(1);
  const [enabled, setEnabled] = useState<Record<CharacterOption, boolean>>({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: false,
  });
  const [tokens, setTokens] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | false>(false);
  const [copiedAll, setCopiedAll] = useState(false);

  function handleGenerate() {
    setError("");
    setCopiedToken(false);
    setCopiedAll(false);

    try {
      setTokens(
        Array.from({ length: count }, () =>
          generateToken({ length, ...enabled }),
        ),
      );
    } catch (err) {
      setTokens([]);
      setError(
        err instanceof Error ? err.message : "Could not generate tokens.",
      );
    }
  }

  async function handleCopy(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);

      window.setTimeout(() => {
        setCopiedToken((current) => (current === token ? false : current));
      }, 1500);
    } catch {
      setError("Could not access the clipboard.");
    }
  }

  async function handleCopyAll() {
    try {
      await navigator.clipboard.writeText(tokens.join("\n"));
      setCopiedAll(true);

      window.setTimeout(() => setCopiedAll(false), 1500);
    } catch {
      setError("Could not access the clipboard.");
    }
  }

  const hasCharacterSet = Object.values(enabled).some(Boolean);

  return (
    <ShadowModule css={styles} includeShadowStyles>
      <section className="mx-auto w-full max-w-2xl space-y-5">
        <div className="rounded-2xl border border-section-border bg-section p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-text">Token settings</h2>
            <p className="text-sm text-subtext">
              Choose the characters and length for your random token.
            </p>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-text">
              Token length
              <input
                type="number"
                min={1}
                max={4096}
                value={length}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setLength(
                    Number.isFinite(value)
                      ? Math.max(1, Math.min(4096, value))
                      : 1,
                  );
                }}
                className="w-full rounded-md border border-section-border bg-dark px-3 py-2.5 text-text outline-none focus:border-subtext"
              />
              <span className="text-xs font-normal text-subtext">
                1–4096 characters
              </span>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-text">
              Number of tokens
              <input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setCount(
                    Number.isFinite(value)
                      ? Math.max(1, Math.min(20, value))
                      : 1,
                  );
                }}
                className="w-full rounded-md border border-section-border bg-dark px-3 py-2.5 text-text outline-none focus:border-subtext"
              />
              <span className="text-xs font-normal text-subtext">
                Generate 1–20 tokens at once
              </span>
            </label>
          </div>

          <fieldset className="mt-5">
            <legend className="mb-3 text-sm font-medium text-text">
              Character sets
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {CHARACTER_OPTIONS.map((option) => (
                <div
                  key={option.key}
                  role="checkbox"
                  aria-checked={enabled[option.key]}
                  tabIndex={0}
                  onClick={() =>
                    setEnabled((current) => ({
                      ...current,
                      [option.key]: !current[option.key],
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === " " || event.key === "Enter") {
                      event.preventDefault();
                      setEnabled((current) => ({
                        ...current,
                        [option.key]: !current[option.key],
                      }));
                    }
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-section-border px-3 py-3 hover:bg-dark"
                >
                  <Checkbox
                    checked={enabled[option.key]}
                    onChange={(checked) =>
                      setEnabled((current) => ({
                        ...current,
                        [option.key]: checked,
                      }))
                    }
                    onClick={(event) => event.stopPropagation()}
                    className="group flex size-5 shrink-0 items-center justify-center rounded-md border border-section-border bg-dark data-checked:border-white data-checked:bg-white"
                  >
                    <Check
                      size={14}
                      strokeWidth={3}
                      className="hidden text-dark group-data-checked:block"
                    />
                  </Checkbox>

                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm text-text select-none">
                      {option.label}
                    </span>
                    <span className="text-xs text-subtext select-none">
                      {option.sample}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </fieldset>

          {!hasCharacterSet && (
            <p role="alert" className="mt-3 text-sm text-status-error">
              Select at least one character set.
            </p>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!hasCharacterSet}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-btn px-4 py-2.5 font-medium text-dark hover:bg-btn-hover disabled:cursor-not-allowed disabled:opacity-50 select-none"
          >
            <RefreshCw size={17} />
            Generate token{count > 1 ? "s" : ""}
          </button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-status-error">
            {error}
          </p>
        )}

        {tokens.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-section-border bg-section p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-text">Generated tokens</h2>
                <p className="text-sm text-subtext">
                  {tokens.length} token{tokens.length === 1 ? "" : "s"} ·{" "}
                  {length} characters each
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyAll}
                className="flex items-center gap-2 rounded-md border border-section-border px-3 py-2 text-sm text-text hover:bg-dark"
              >
                {copiedAll ? <Check size={16} /> : <Copy size={16} />}
                {copiedAll ? "Copied all" : "Copy all"}
              </button>
            </div>

            <div className="space-y-2">
              {tokens.map((token, index) => (
                <div
                  key={`${index}-${token}`}
                  className="flex items-center gap-2 rounded-md border border-section-border bg-dark p-2"
                >
                  <code className="min-w-0 flex-1 break-all px-1 text-sm text-text">
                    {token}
                  </code>

                  <button
                    type="button"
                    onClick={() => handleCopy(token)}
                    className="flex shrink-0 items-center gap-2 rounded-md border border-section-border px-3 py-2 text-sm text-text hover:bg-section"
                  >
                    {copiedToken === token ? (
                      <Check size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                    {copiedToken === token ? "Copied" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-subtext">
              Tokens are generated in your browser using the Web Crypto API.
            </p>
          </div>
        )}
      </section>
    </ShadowModule>
  );
}
