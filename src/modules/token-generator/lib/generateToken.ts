const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?/\\\\|~`<>";

export interface TokenOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

export function generateToken(options: TokenOptions): string {
  let characters = "";
  if (options.uppercase) characters += UPPERCASE;
  if (options.lowercase) characters += LOWERCASE;
  if (options.numbers) characters += NUMBERS;
  if (options.symbols) characters += SYMBOLS;

  if (!characters) {
    throw new Error("Choose at least one character set.");
  }

  const length = Math.max(1, Math.min(4096, Math.floor(options.length)));
  const output: string[] = [];

  // Rejection sampling avoids modulo bias when choosing a character.
  const limit = 256 - (256 % characters.length);
  while (output.length < length) {
    const bytes = new Uint8Array(Math.max(16, (length - output.length) * 2));
    crypto.getRandomValues(bytes);

    for (const byte of bytes) {
      if (byte >= limit) continue;
      output.push(characters[byte % characters.length]);
      if (output.length === length) break;
    }
  }

  return output.join("");
}
