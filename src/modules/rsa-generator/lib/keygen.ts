export type RSAAlgorithm = "RSA-OAEP" | "RSA-PSS";

export interface GeneratedRSAKeys {
  publicKey: string;
  privateKey: string;
  algorithm: RSAAlgorithm;
  modulusLength: number;
}

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

export async function generateRSAKeys(
  algorithm: RSAAlgorithm,
  modulusLength: number,
): Promise<GeneratedRSAKeys> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API is unavailable. Use HTTPS or localhost.");
  }

  const keyUsages: KeyUsage[] =
    algorithm === "RSA-OAEP" ? ["encrypt", "decrypt"] : ["sign", "verify"];

  const keyPair = await crypto.subtle.generateKey(
    {
      name: algorithm,
      modulusLength,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    keyUsages,
  );

  const [publicData, privateData] = await Promise.all([
    crypto.subtle.exportKey("spki", keyPair.publicKey),
    crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
  ]);

  return {
    publicKey: toPem(publicData, "PUBLIC KEY"),
    privateKey: toPem(privateData, "PRIVATE KEY"),
    algorithm,
    modulusLength,
  };
}
