import { useState } from "react";
import { RefreshCw, Download } from "lucide-react";
import styles from "./main.css?inline";
import ShadowModule from "../../components/ShadowModule";
import KeyCard from "./components/KeyCard";
import { generateEd25519Keys } from "./lib/keygen";
import { downloadText } from "./lib/download";
import type { GeneratedKeys } from "./types";

export default function EdDSAKeyGenerator() {
  const [keys, setKeys] = useState<GeneratedKeys | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  async function generateKeys() {
    setLoading(true);
    setError("");
    setCopied("");

    try {
      setKeys(await generateEd25519Keys());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate the key pair.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyKey(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      setError("Could not access the clipboard. Check browser permissions.");
    }
  }

  return (
    <ShadowModule css={styles} includeShadowStyles>
      <section className="mx-auto w-full max-w-4xl space-y-6 mt-8">
        <div className="flex flex-wrap justify-center items-center gap-3">
          <button
            type="button"
            onClick={generateKeys}
            disabled={loading}
            className="flex items-center gap-2 rounded-md bg-button-primary px-4 py-2.5 font-medium text-dark hover:bg-button-hover disabled:cursor-not-allowed disabled:opacity-50 focus:outline-4 outline-menu-selection"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            {loading
              ? "Generating..."
              : keys
                ? "Generate New Keys"
                : "Generate Keys"}
          </button>

          {keys && (
            <button
              type="button"
              onClick={() =>
                downloadText(
                  "ed25519-keys.txt",
                  `${keys.privateKey}\n${keys.publicKey}`,
                )
              }
              className="flex items-center gap-2 rounded-md border bg-background-secondary border-border-primary text-white px-4 py-2.5 focus:outline-4 outline-menu-selection"
            >
              <Download size={17} />
              Download Both
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-status-error text-center">
            {error}
          </p>
        )}

        {keys && (
          <div className="space-y-5 flex flex-col items-center">
            <KeyCard
              title="Private Key"
              value={keys.privateKey}
              copied={copied === "private"}
              onCopy={() => copyKey("private", keys.privateKey)}
              onDownload={() =>
                downloadText("ed25519-private.pem", keys.privateKey)
              }
            />

            <KeyCard
              title="Public Key"
              value={keys.publicKey}
              copied={copied === "public"}
              onCopy={() => copyKey("public", keys.publicKey)}
              onDownload={() =>
                downloadText("ed25519-public.pem", keys.publicKey)
              }
            />

            <p className="text-sm text-text-secondary text-center">
              Keep your private key secret. Anyone who obtains it can generate
              signatures as the key owner.
            </p>
          </div>
        )}
      </section>
    </ShadowModule>
  );
}
