import type { GeneratedKeys } from "../types";

function toPem(data: ArrayBuffer, label: string): string {
  const bytes = new Uint8Array(data);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  const base64 = btoa(binary);
  const lines = base64.match(/.{1,64}/g) ?? [];

  return [`-----BEGIN ${label}-----`, ...lines, `-----END ${label}-----`].join(
    "\n",
  );
}

export async function generateEd25519Keys(): Promise<GeneratedKeys> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API is unavailable. Use HTTPS or localhost.");
  }

  const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ]);

  const [publicData, privateData] = await Promise.all([
    crypto.subtle.exportKey("spki", keyPair.publicKey),
    crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
  ]);

  return {
    publicKey: toPem(publicData, "PUBLIC KEY"),
    privateKey: toPem(privateData, "PRIVATE KEY"),
  };
}
