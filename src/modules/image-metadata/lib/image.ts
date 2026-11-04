import exifr from "exifr";

export type MetadataGroup =
  | "EXIF"
  | "GPS"
  | "XMP"
  | "IPTC"
  | "ICC"
  | "Comments"
  | "PNG Text"
  | "Thumbnail"
  | "Content Credentials"
  | "Custom"
  | "Image Properties"
  | "Other";
export type MetadataField = {
  key: string;
  value: unknown;
  group: MetadataGroup;
};
export type ImageInfo = {
  format: string;
  fields: MetadataField[];
  raw: unknown;
};

function formatName(file: File, bytes: Uint8Array): string {
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8) return "JPEG";
  if (b[0] === 0x89 && b[1] === 0x50) return "PNG";
  if (
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP"
  )
    return "WebP";
  if (String.fromCharCode(...b.slice(0, 3)) === "GIF") return "GIF";
  if (String.fromCharCode(...b.slice(4, 8)) === "ftyp") {
    const brand = String.fromCharCode(...b.slice(8, 12));
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand))
      return "HEIC/HEIF";
    if (["avif", "avis"].includes(brand)) return "AVIF";
  }
  if ((b[0] === 0x49 && b[1] === 0x49) || (b[0] === 0x4d && b[1] === 0x4d))
    return "TIFF";
  if (file.type.startsWith("image/")) return file.type;
  return "Unknown";
}

function classify(key: string, group?: string): MetadataGroup {
  const s = `${group ?? ""} ${key}`.toLowerCase();
  if (/gps|latitude|longitude|altitude|coordinates/.test(s)) return "GPS";
  if (/ifd1|thumbnail|previewimage/.test(s)) return "Thumbnail";
  if (/ifd0|(^|\s)exif/.test(s)) return "EXIF";
  if (/ihdr/.test(s)) return "Image Properties";
  if (/xmp/.test(s)) return "XMP";
  if (/iptc|photoshop|caption|byline|keywords/.test(s)) return "IPTC";
  if (/icc|color.?profile|profiledescription/.test(s)) return "ICC";
  if (/thumbnail|previewimage/.test(s)) return "Thumbnail";
  if (/comment|usercomment/.test(s)) return "Comments";
  if (
    /png|text|description|software|author|title/.test(s) &&
    /png|text|software|author|title/.test(s)
  )
    return "PNG Text";
  return "Custom";
}

function flatten(
  value: unknown,
  prefix = "",
  group?: string,
  out: MetadataField[] = [],
): MetadataField[] {
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    out.push({
      key: prefix || "Binary data",
      value: `[${value.byteLength} bytes]`,
      group: classify(prefix, group),
    });
    return out;
  }
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  ) {
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const next = prefix ? `${prefix}.${key}` : key;
      flatten(child, next, group ?? key, out);
    }
  } else if (value !== undefined) {
    out.push({
      key: prefix,
      value: value instanceof Date ? value.toISOString() : value,
      group: classify(prefix, group),
    });
  }
  return out;
}

export async function inspectImage(file: File): Promise<ImageInfo> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = formatName(file, bytes);
  let raw: unknown = {};
  try {
    raw = await exifr.parse(bytes, {
      tiff: true,
      xmp: true,
      icc: true,
      iptc: true,
      jfif: true,
      ihdr: true,
      ifd0: true,
      ifd1: true,
      exif: true,
      gps: true,
      interop: true,
      makerNote: true,
      userComment: true,
      multiSegment: true,
      mergeOutput: false,
      sanitize: false,
      silentErrors: true,
    });
  } catch {
    /* Some formats have no supported metadata parser. */
  }
  const fields = flatten(raw);
  fields.push(
    ...readImageProperties(bytes, format),
    ...readContentCredentials(bytes, format),
    ...readUnknownMetadata(bytes, format),
  );
  if (format === "PNG")
    fields.push(...readPngText(bytes), ...(await readPngExif(bytes)));
  if (format === "WebP") fields.push(...(await readWebpMetadata(bytes)));
  if (format === "JPEG") fields.push(...readJpegComments(bytes));
  if (format === "GIF") fields.push(...readGifComments(bytes));
  return { format, fields, raw };
}

function readImageProperties(
  bytes: Uint8Array,
  format: string,
): MetadataField[] {
  const fields: MetadataField[] = [];
  if (format === "PNG" && bytes.length >= 33) {
    fields.push(
      {
        key: "PNG.Width",
        value: readU32(bytes, 16),
        group: "Image Properties",
      },
      {
        key: "PNG.Height",
        value: readU32(bytes, 20),
        group: "Image Properties",
      },
      { key: "PNG.Bit depth", value: bytes[24], group: "Image Properties" },
      {
        key: "PNG.Color type",
        value:
          (
            {
              0: "Grayscale",
              2: "RGB",
              3: "Indexed",
              4: "Grayscale + alpha",
              6: "RGBA",
            } as Record<number, string>
          )[bytes[25]] ?? bytes[25],
        group: "Image Properties",
      },
      { key: "PNG.Compression", value: bytes[26], group: "Image Properties" },
      { key: "PNG.Filter", value: bytes[27], group: "Image Properties" },
      {
        key: "PNG.Interlace",
        value: bytes[28] === 0 ? "None" : "Adam7",
        group: "Image Properties",
      },
    );
  }
  if (format === "GIF" && bytes.length >= 10)
    fields.push(
      {
        key: "GIF.Width",
        value: bytes[6] | (bytes[7] << 8),
        group: "Image Properties",
      },
      {
        key: "GIF.Height",
        value: bytes[8] | (bytes[9] << 8),
        group: "Image Properties",
      },
    );
  if (format === "JPEG") {
    let p = 2;
    while (p + 4 < bytes.length && bytes[p] === 0xff) {
      while (bytes[p] === 0xff) p++;
      const marker = bytes[p++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const n = (bytes[p] << 8) | bytes[p + 1];
      if (n < 2 || p + n > bytes.length) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker) &&
        n >= 7
      ) {
        fields.push(
          {
            key: "JPEG.Height",
            value: (bytes[p + 3] << 8) | bytes[p + 4],
            group: "Image Properties",
          },
          {
            key: "JPEG.Width",
            value: (bytes[p + 5] << 8) | bytes[p + 6],
            group: "Image Properties",
          },
          {
            key: "JPEG.Components",
            value: bytes[p + 7],
            group: "Image Properties",
          },
        );
        break;
      }
      p += n;
    }
  }
  if (format === "WebP" && bytes.length >= 30)
    fields.push({
      key: "WebP.Container",
      value: "RIFF",
      group: "Image Properties",
    });
  return fields;
}

function readContentCredentials(
  bytes: Uint8Array,
  format: string,
): MetadataField[] {
  const asciiText = new TextDecoder("latin1").decode(bytes);
  const signatures = [
    "c2pa",
    "cabx",
    "jumd",
    "jumb",
    "jumbf",
    "content credentials",
    "content_credentials",
    "urn:c2pa",
  ];
  const found = signatures.filter((sig) =>
    asciiText.toLowerCase().includes(sig),
  );
  return found.length
    ? [
        {
          key: `${format}.Content credentials marker`,
          value: `Possible C2PA/JUMBF data detected (${found.join(", ")}). Details are not decoded by this inspector.`,
          group: "Content Credentials",
        },
      ]
    : [];
}

function readUnknownMetadata(
  bytes: Uint8Array,
  format: string,
): MetadataField[] {
  const fields: MetadataField[] = [];
  if (format === "PNG") {
    let p = 8;
    while (p + 12 <= bytes.length) {
      const n = readU32(bytes, p);
      if (p + n + 12 > bytes.length) break;
      const type = ascii(bytes, p + 4, 4);
      const ancillary = (bytes[p + 4] & 0x20) !== 0;
      const known = [
        "IHDR",
        "PLTE",
        "IDAT",
        "IEND",
        "tRNS",
        "gAMA",
        "cHRM",
        "sRGB",
        "iCCP",
        "eXIf",
        "tEXt",
        "zTXt",
        "iTXt",
        "tIME",
        "bKGD",
        "pHYs",
        "sBIT",
        "hIST",
        "sPLT",
        "acTL",
        "fcTL",
        "fdAT",
        "caBX",
      ];
      if (ancillary && !known.includes(type))
        fields.push({
          key: `PNG.${type}`,
          value: `Unrecognized ancillary chunk (${n} bytes). Its contents may be custom metadata and cannot be interpreted.`,
          group: "Custom",
        });
      p += n + 12;
      if (type === "IEND") break;
    }
  }
  if (format === "JPEG") {
    let p = 2;
    while (p + 4 <= bytes.length && bytes[p] === 0xff) {
      while (bytes[p] === 0xff) p++;
      const marker = bytes[p++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const n = (bytes[p] << 8) | bytes[p + 1];
      if (n < 2 || p + n > bytes.length) break;
      if (marker >= 0xe0 && marker <= 0xef) {
        const payload = bytes.slice(p + 2, p + n);
        const known =
          marker === 0xe0 ||
          (marker === 0xe1 &&
            [
              "Exif\\0\\0",
              "http://ns.adobe.com/xap/1.0/",
              "http://ns.adobe.com/xmp/extension/",
            ].some((x) => new TextDecoder().decode(payload).startsWith(x))) ||
          marker === 0xed ||
          (marker === 0xe2 && ascii(payload, 0, 12) === "ICC_PROFILE\\0") ||
          marker === 0xeb ||
          marker === 0xeb;
        if (!known)
          fields.push({
            key: `JPEG.APP${marker - 0xe0}`,
            value: `Unrecognized application segment (${n - 2} bytes). It may contain custom metadata that cannot be interpreted.`,
            group: "Custom",
          });
      }
      p += n;
    }
  }
  if (format === "WebP") {
    let p = 12;
    const known = [
      "VP8 ",
      "VP8L",
      "VP8X",
      "ALPH",
      "ANIM",
      "ANMF",
      "EXIF",
      "XMP ",
      "ICCP",
    ];
    while (p + 8 <= bytes.length) {
      const type = ascii(bytes, p, 4),
        n = readU32le(bytes, p + 4),
        end = p + 8 + n + (n & 1);
      if (end > bytes.length) break;
      if (!known.includes(type))
        fields.push({
          key: `WebP.${type}`,
          value: `Unrecognized chunk (${n} bytes). It may contain custom metadata that cannot be interpreted.`,
          group: "Custom",
        });
      p = end;
    }
  }
  return fields;
}

async function readPngExif(bytes: Uint8Array): Promise<MetadataField[]> {
  const fields: MetadataField[] = [];
  let p = 8;
  while (p + 12 <= bytes.length) {
    const n = readU32(bytes, p);
    if (p + n + 12 > bytes.length) break;
    const type = ascii(bytes, p + 4, 4);
    if (type === "eXIf") {
      try {
        const parsed = await exifr.parse(bytes.slice(p + 8, p + 8 + n), {
          tiff: true,
          ifd0: true,
          exif: true,
          gps: true,
          ifd1: true,
          mergeOutput: false,
          sanitize: false,
        });
        fields.push(...flatten(parsed, "PNG.eXIf"));
      } catch {
        fields.push({ key: "PNG.eXIf", value: `${n} bytes`, group: "EXIF" });
      }
    }
    p += n + 12;
    if (type === "IEND") break;
  }
  return fields;
}

async function readWebpMetadata(bytes: Uint8Array): Promise<MetadataField[]> {
  const fields: MetadataField[] = [];
  let p = 12;
  while (p + 8 <= bytes.length) {
    const type = ascii(bytes, p, 4),
      n = readU32le(bytes, p + 4),
      end = p + 8 + n + (n & 1);
    if (end > bytes.length) break;
    const payload = bytes.slice(p + 8, p + 8 + n);
    if (type === "EXIF") {
      try {
        const parsed = await exifr.parse(payload, {
          tiff: true,
          ifd0: true,
          exif: true,
          gps: true,
          ifd1: true,
          mergeOutput: false,
          sanitize: false,
        });
        fields.push(...flatten(parsed, "WebP.EXIF"));
      } catch {
        fields.push({ key: "WebP.EXIF", value: `${n} bytes`, group: "EXIF" });
      }
    } else if (type === "XMP ") {
      const text = new TextDecoder().decode(payload);
      fields.push({
        key: "WebP.XMP",
        value: text.slice(0, 4000),
        group: "XMP",
      });
    } else if (type === "ICCP")
      fields.push({
        key: "WebP.ICC Profile",
        value: `${n} bytes`,
        group: "ICC",
      });
    p = end;
  }
  return fields;
}

function readJpegComments(bytes: Uint8Array): MetadataField[] {
  const fields: MetadataField[] = [];
  let p = 2;
  while (p + 4 <= bytes.length && bytes[p] === 0xff) {
    const start = p;
    while (bytes[p] === 0xff) p++;
    const marker = bytes[p++];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const n = (bytes[p] << 8) | bytes[p + 1];
    if (n < 2 || p + n > bytes.length) break;
    if (marker === 0xfe)
      fields.push({
        key: "JPEG.Comment",
        value: new TextDecoder().decode(bytes.slice(p + 2, p + n)),
        group: "Comments",
      });
    p += n;
    if (p <= start) break;
  }
  return fields;
}

function readGifComments(bytes: Uint8Array): MetadataField[] {
  const fields: MetadataField[] = [];
  let p = 13;
  if (bytes.length < 13) return fields;
  const packed = bytes[10];
  if (packed & 0x80) p += 3 * 2 ** ((packed & 7) + 1);
  while (p < bytes.length) {
    const marker = bytes[p++];
    if (marker === 0x3b) break;
    if (marker === 0x2c) {
      if (p + 9 > bytes.length) break;
      const local = bytes[p + 8];
      p += 9;
      if (local & 0x80) p += 3 * 2 ** ((local & 7) + 1);
      if (p >= bytes.length) break;
      p++;
      while (p < bytes.length) {
        const n = bytes[p++];
        if (!n) break;
        p += n;
      }
      continue;
    }
    if (marker === 0x21) {
      if (p >= bytes.length) break;
      const label = bytes[p++];
      let text = "";
      while (p < bytes.length) {
        const n = bytes[p++];
        if (!n) break;
        const block = bytes.slice(p, p + n);
        if (label === 0xfe) text += new TextDecoder().decode(block);
        p += n;
      }
      if (label === 0xfe)
        fields.push({ key: "GIF.Comment", value: text, group: "Comments" });
      continue;
    }
    break;
  }
  return fields;
}

function readPngText(bytes: Uint8Array): MetadataField[] {
  const out: MetadataField[] = [];
  if (bytes.length < 8) return out;
  let p = 8;
  while (p + 12 <= bytes.length) {
    const n = readU32(bytes, p);
    if (n < 0 || p + 12 + n > bytes.length) break;
    const type = ascii(bytes, p + 4, 4);
    if (["tEXt", "zTXt", "iTXt", "tIME"].includes(type))
      out.push({ key: `PNG.${type}`, value: `${n} bytes`, group: "PNG Text" });
    p += n + 12;
    if (type === "IEND") break;
  }
  return out;
}

function readU32(b: Uint8Array, p: number) {
  return ((b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]) >>> 0;
}
function ascii(b: Uint8Array, p: number, n: number) {
  return String.fromCharCode(...b.slice(p, p + n));
}

export type RemoveOptions = { groups: MetadataGroup[] };
export type RemoveResult = {
  blob: Blob;
  removed: string[];
  format: string;
  supported: boolean;
  note?: string;
};

export function removeMetadata(
  input: Uint8Array,
  format: string,
  options: RemoveOptions,
  mime: string,
): RemoveResult {
  const selected = new Set(options.groups);
  if (!selected.size)
    return {
      blob: new Blob([input.slice().buffer as ArrayBuffer], { type: mime }),
      removed: [],
      format,
      supported: true,
    };
  let output: Uint8Array;
  let removed: string[] = [];
  if (format === "JPEG") ({ output, removed } = scrubJpeg(input, selected));
  else if (format === "PNG") ({ output, removed } = scrubPng(input, selected));
  else if (format === "WebP")
    ({ output, removed } = scrubWebp(input, selected));
  else if (format === "GIF") ({ output, removed } = scrubGif(input, selected));
  else
    return {
      blob: new Blob([input.slice().buffer as ArrayBuffer], { type: mime }),
      removed: [],
      format,
      supported: false,
      note: `${format} is currently view-only. No re-encoding was performed.`,
    };
  return {
    blob: new Blob([output.buffer as ArrayBuffer], { type: mime }),
    removed,
    format,
    supported: true,
  };
}

function scrubJpeg(b: Uint8Array, selected: Set<MetadataGroup>) {
  const parts: Uint8Array[] = [b.slice(0, 2)],
    removed: string[] = [];
  let p = 2;
  while (p + 4 <= b.length && b[p] === 0xff) {
    const start = p;
    while (b[p] === 0xff) p++;
    const marker = b[p++];
    if (marker === 0xda) {
      parts.push(b.slice(start));
      p = b.length;
      break;
    }
    if (
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7) ||
      marker === 0x01
    ) {
      parts.push(b.slice(start, p));
      continue;
    }
    const len = (b[p] << 8) | b[p + 1];
    if (len < 2 || p + len > b.length) {
      parts.push(b.slice(start));
      break;
    }
    const end = p + len;
    let group: MetadataGroup | null = null;
    if (marker === 0xe1) {
      const sig = ascii(b, p + 2, Math.min(29, len - 2));
      group = sig.startsWith("http://ns.adobe.com/xap/1.0/")
        ? "XMP"
        : sig.startsWith("Exif\0\0")
          ? "EXIF"
          : "Other";
    } else if (marker === 0xed) group = "IPTC";
    else if (marker === 0xe2 && ascii(b, p + 2, 12) === "ICC_PROFILE\0")
      group = "ICC";
    else if (marker === 0xfe) group = "Comments";
    else if (
      marker === 0xeb &&
      /jumb|c2pa/i.test(
        new TextDecoder("latin1").decode(b.slice(p + 2, p + len)),
      )
    )
      group = "Content Credentials";
    else if (marker >= 0xe0 && marker <= 0xef) group = "Other";
    const isExif = group === "EXIF";
    const shouldRemove =
      Boolean(group && selected.has(group)) ||
      (isExif && (selected.has("GPS") || selected.has("Thumbnail")));
    if (shouldRemove)
      removed.push(
        isExif && !selected.has("EXIF")
          ? `EXIF container (GPS/thumbnail removal also removes other EXIF fields)`
          : `${group} (JPEG APP${marker - 0xe0}/COM)`,
      );
    else parts.push(b.slice(start, end));
    p = end;
  }
  return { output: concat(parts), removed };
}

function scrubPng(b: Uint8Array, selected: Set<MetadataGroup>) {
  const parts: Uint8Array[] = [b.slice(0, 8)],
    removed: string[] = [];
  let p = 8;
  while (p + 12 <= b.length) {
    const n = readU32(b, p);
    if (p + n + 12 > b.length) {
      parts.push(b.slice(p));
      break;
    }
    const type = ascii(b, p + 4, 4);
    let group: MetadataGroup | null = null;
    if (["tEXt", "zTXt", "iTXt"].includes(type)) {
      const keywordEnd = b.indexOf(0, p + 8);
      const keyword =
        keywordEnd >= 0
          ? new TextDecoder().decode(b.slice(p + 8, keywordEnd))
          : "";
      group = keyword === "XML:com.adobe.xmp" ? "XMP" : "PNG Text";
    } else if (type === "eXIf") group = "EXIF";
    else if (type === "iCCP") group = "ICC";
    else if (type === "tIME") group = "Comments";
    else if (type === "caBX") group = "Content Credentials";
    else if (
      type === "tRNS" ||
      type === "sRGB" ||
      type === "gAMA" ||
      type === "cHRM"
    )
      group = "Other";
    const shouldRemove =
      Boolean(group && selected.has(group)) ||
      (type === "eXIf" && (selected.has("GPS") || selected.has("Thumbnail")));
    if (shouldRemove)
      removed.push(
        type === "eXIf" && !selected.has("EXIF")
          ? "EXIF chunk (GPS/thumbnail removal also removes other EXIF fields)"
          : `${group} (${type})`,
      );
    else parts.push(b.slice(p, p + n + 12));
    p += n + 12;
    if (type === "IEND") {
      if (p < b.length) parts.push(b.slice(p));
      break;
    }
  }
  return { output: concat(parts), removed };
}

function scrubWebp(b: Uint8Array, selected: Set<MetadataGroup>) {
  const chunks: Uint8Array[] = [],
    removed: string[] = [];
  let p = 12;
  while (p + 8 <= b.length) {
    const type = ascii(b, p, 4),
      n = readU32le(b, p + 4),
      end = p + 8 + n + (n & 1);
    if (end > b.length) break;
    const group: MetadataGroup | null =
      type === "EXIF"
        ? "EXIF"
        : type === "XMP "
          ? "XMP"
          : type === "ICCP"
            ? "ICC"
            : ["JUMD", "JUMB"].includes(type)
              ? "Content Credentials"
              : null;
    const shouldRemove =
      Boolean(group && selected.has(group)) ||
      (type === "EXIF" && (selected.has("GPS") || selected.has("Thumbnail")));
    if (shouldRemove)
      removed.push(
        type === "EXIF" && !selected.has("EXIF")
          ? "EXIF chunk (GPS/thumbnail removal also removes other EXIF fields)"
          : `${group} (${type})`,
      );
    else chunks.push(b.slice(p, end));
    p = end;
  }
  for (const chunk of chunks) {
    if (ascii(chunk, 0, 4) !== "VP8X" || chunk.length < 10) continue;
    if (selected.has("ICC")) chunk[8] &= ~0x20;
    if (
      selected.has("EXIF") ||
      selected.has("GPS") ||
      selected.has("Thumbnail")
    )
      chunk[8] &= ~0x08;
    if (selected.has("XMP")) chunk[8] &= ~0x04;
  }
  const body = concat(chunks),
    header = b.slice(0, 12);
  const out = concat([header, body]);
  writeU32le(out, 4, out.length - 8);
  return { output: out, removed };
}
function readU32le(b: Uint8Array, p: number) {
  return (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0;
}
function writeU32le(b: Uint8Array, p: number, n: number) {
  b[p] = n & 255;
  b[p + 1] = (n >>> 8) & 255;
  b[p + 2] = (n >>> 16) & 255;
  b[p + 3] = (n >>> 24) & 255;
}
function scrubGif(b: Uint8Array, selected: Set<MetadataGroup>) {
  if (!selected.has("Comments") && !selected.has("Other"))
    return { output: b, removed: [] as string[] };
  const out: number[] = Array.from(b.slice(0, 13)),
    removed: string[] = [];
  let p = 13;
  const packed = b[10];
  if (packed & 0x80) p += 3 * 2 ** ((packed & 7) + 1);
  while (p < b.length) {
    const marker = b[p++];
    out.push(marker);
    if (marker === 0x3b) {
      out.push(...b.slice(p));
      break;
    }
    if (marker === 0x2c) {
      const size = 9 + (b[p + 8] & 0x80 ? 3 * 2 ** ((b[p + 8] & 7) + 1) : 0);
      out.push(...b.slice(p, p + size));
      p += size;
      const l = b[p++];
      out.push(l);
      while (p < b.length) {
        const n = b[p++];
        out.push(n);
        if (!n) break;
        out.push(...b.slice(p, p + n));
        p += n;
      }
      continue;
    }
    if (marker === 0x21) {
      const label = b[p++];
      let q = p;
      while (q < b.length) {
        const n = b[q++];
        if (!n) break;
        q += n;
      }
      const isComment = label === 0xfe;
      if (
        (isComment && selected.has("Comments")) ||
        (!isComment && selected.has("Other"))
      ) {
        removed.push(isComment ? "GIF Comment" : "GIF Extension");
        p = q;
      } else {
        out.push(label, ...b.slice(p, q));
        p = q;
      }
      continue;
    }
    break;
  }
  return { output: new Uint8Array(out), removed };
}
function concat(parts: Uint8Array[]) {
  const size = parts.reduce((n, p) => n + p.length, 0),
    out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
