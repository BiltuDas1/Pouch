export interface CleanUrlOptions {
  removeQuery: boolean;
}

/**
 * Query parameter names used for analytics, advertising, affiliate
 * attribution, or campaign tracking. Matching is case-insensitive.
 */
const TRACKING_PARAMS = new Set([
  // Google Analytics / Google Ads
  "gclid",
  "gclsrc",
  "dclid",
  "gbraid",
  "wbraid",
  "gad_source",
  "gad_campaignid",
  "srsltid",
  "_ga",
  "_gl",
  // Meta / Facebook / Instagram
  "fbclid",
  "fb_action_ids",
  "fb_action_types",
  "fb_source",
  "fb_ref",
  "igshid",
  // Microsoft / Bing
  "msclkid",
  // Yahoo
  "yclid",
  "ncid",
  "guccounter",
  "guce_referrer",
  "guce_referrer_sig",
  // X / Twitter
  "twclid",
  "ref_src",
  "ref_url",
  "__twitter_impression",
  // TikTok / LinkedIn
  "ttclid",
  "li_fat_id",
  // Email marketing
  "mc_cid",
  "mc_eid",
  "mkt_tok",
  "hsctatracking",
  "_kx",
  "ml_subscriber",
  "ml_subscriber_hash",
  // Adobe / Alibaba / Reddit
  "s_cid",
  "spm",
  "scm",
  "rb_clickid",
  // Other attribution platforms
  "trk",
  "trkcampaign",
  "trkinfo",
]);

/** Tracking parameters that share a prefix rather than an exact name. */
const TRACKING_PREFIXES = [
  "utm_", // Google Analytics campaigns
  "pk_", // Matomo / Piwik
  "mtm_", // Matomo
  "hsa_", // HubSpot Ads
  "_hs", // HubSpot
  "oly_", // Omeda
  "vero_", // Vero
  "at_", // AT Internet
];

function decodeParamName(rawName: string): string {
  try {
    return decodeURIComponent(rawName).toLowerCase();
  } catch {
    return rawName.toLowerCase();
  }
}

function isTrackingParam(pair: string): boolean {
  const equalsIndex = pair.indexOf("=");
  const rawName = equalsIndex === -1 ? pair : pair.slice(0, equalsIndex);
  const name = decodeParamName(rawName);

  return (
    TRACKING_PREFIXES.some((prefix) => name.startsWith(prefix)) ||
    TRACKING_PARAMS.has(name)
  );
}

function parseHttpUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed;
    }
  } catch {
    // Try adding a scheme below.
  }

  // Accept bare domains such as "example.com/path?utm_source=email" while
  // avoiding text that only becomes URL-like after adding a scheme.
  try {
    const parsed = new URL(`https://${value}`);
    const isLikelyHost =
      parsed.hostname.includes(".") || parsed.hostname === "localhost";

    return isLikelyHost ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Removes tracking parameters from an HTTP(S) URL while preserving the
 * original formatting of the remaining query parameters and the fragment.
 *
 * When `removeQuery` is enabled, the complete query string is dropped but the
 * fragment is kept.
 */
export function cleanUrl(input: string, options: CleanUrlOptions): string {
  const trimmed = input.trim();

  if (!trimmed || !parseHttpUrl(trimmed)) {
    return trimmed;
  }

  const hashIndex = trimmed.indexOf("#");
  const beforeHash = hashIndex === -1 ? trimmed : trimmed.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : trimmed.slice(hashIndex);
  const queryIndex = beforeHash.indexOf("?");

  if (queryIndex === -1) {
    return trimmed;
  }

  const base = beforeHash.slice(0, queryIndex);

  if (options.removeQuery) {
    return `${base}${hash}`;
  }

  const keptParams = beforeHash
    .slice(queryIndex + 1)
    .split("&")
    .filter((pair) => pair.length > 0 && !isTrackingParam(pair));

  return keptParams.length > 0
    ? `${base}?${keptParams.join("&")}${hash}`
    : `${base}${hash}`;
}
