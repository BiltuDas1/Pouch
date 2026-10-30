import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import ShadowModule from "../../components/ShadowModule";
import styles from "./main.css?inline";
import KeyCard from "./components/KeyCard";
import { downloadText } from "./lib/download";
import {
  generateRSAKeys,
  type GeneratedRSAKeys,
  type RSAAlgorithm,
} from "./lib/keygen";

export default function RSAKeyGenerator() {
  const [algorithm, setAlgorithm] = useState<RSAAlgorithm>("RSA-OAEP");
  const [modulusLength, setModulusLength] = useState(2048);
  const [keys, setKeys] = useState<GeneratedRSAKeys | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setCopied("");

    try {
      setKeys(await generateRSAKeys(algorithm, modulusLength));
    } catch (err) {
      setKeys(null);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate the RSA key pair.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(
        () => setCopied((current) => (current === label ? "" : current)),
        1500,
      );
    } catch {
      setError("Could not access the clipboard. Check browser permissions.");
    }
  }

  return (
    <ShadowModule css={styles} includeShadowStyles>
      <section className="mx-auto w-full max-w-4xl space-y-6">
        <div className="rounded-xl border border-border-primary bg-background-secondary p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-text-primary">
              RSA key settings
            </h2>
            <p className="text-sm text-text-secondary">
              Choose the RSA operation and key size. Keys are generated locally
              in your browser.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-text-primary">
              Algorithm
              <select
                value={algorithm}
                onChange={(event) =>
                  setAlgorithm(event.target.value as RSAAlgorithm)
                }
                className="rounded-md border border-border-primary bg-dark px-3 py-2.5 text-text-primary outline-none focus:border-text-secondary"
              >
                <option value="RSA-OAEP">RSA-OAEP (Encryption)</option>
                <option value="RSA-PSS">RSA-PSS (Digital signatures)</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-text-primary">
              Key size
              <select
                value={modulusLength}
                onChange={(event) =>
                  setModulusLength(Number(event.target.value))
                }
                className="rounded-md border border-border-primary bg-dark px-3 py-2.5 text-text-primary outline-none focus:border-text-secondary"
              >
                <option value={2048}>2048 bits</option>
                <option value={3072}>3072 bits</option>
                <option value={4096}>4096 bits</option>
                <option value={6144}>6144 bits</option>
                <option value={8192}>8192 bits</option>
              </select>
            </label>
          </div>

          <p className="mt-3 text-xs text-text-secondary">
            {algorithm === "RSA-OAEP"
              ? "RSA-OAEP keys are intended for encrypting and decrypting data."
              : "RSA-PSS keys are intended for creating and verifying digital signatures."}{" "}
            Both use SHA-256 and public exponent 65537.
          </p>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-button-primary px-4 py-2.5 font-medium text-dark hover:bg-button-hover disabled:cursor-not-allowed disabled:opacity-50 focus:outline-4 outline-menu-selection"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            {loading
              ? "Generating..."
              : keys
                ? "Generate New Keys"
                : "Generate Keys"}
          </button>
        </div>

        {error && (
          <p role="alert" className="text-center text-sm text-status-error">
            {error}
          </p>
        )}

        {keys && (
          <div className="flex flex-col items-center space-y-5">
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-text-primary">
                  Generated RSA keys
                </h2>
                <p className="text-xs text-text-secondary">
                  {keys.algorithm} · {keys.modulusLength}-bit · PEM format
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  downloadText(
                    "rsa-keys.txt",
                    `${keys.privateKey}\n\n${keys.publicKey}`,
                  )
                }
                className="flex items-center gap-2 rounded-md border border-border-primary bg-background-secondary px-3 py-2 text-sm text-text-primary"
              >
                <Download size={16} />
                Download Both
              </button>
            </div>

            <KeyCard
              title="Private Key"
              value={keys.privateKey}
              copied={copied === "private"}
              onCopy={() => handleCopy("private", keys.privateKey)}
              onDownload={() =>
                downloadText("rsa-private.pem", keys.privateKey)
              }
            />
            <KeyCard
              title="Public Key"
              value={keys.publicKey}
              copied={copied === "public"}
              onCopy={() => handleCopy("public", keys.publicKey)}
              onDownload={() => downloadText("rsa-public.pem", keys.publicKey)}
            />

            <p className="text-center text-sm text-text-secondary">
              Keep your private key secret. Anyone with access to it may decrypt
              data or create signatures, depending on the selected algorithm.
            </p>
          </div>
        )}
      </section>
    </ShadowModule>
  );
}
