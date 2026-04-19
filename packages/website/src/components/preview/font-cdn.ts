/**
 * Fetch a Google Font from the Fontsource CDN (CORS-enabled, no server needed).
 *
 * First queries the Fontsource API for available subsets, then downloads the Latin
 * subset as primary and any extra subsets (e.g., japanese, korean, cyrillic) as
 * additional font files. This enables CJK and other non-Latin fonts to work.
 */
export interface FontSubsetBuffer {
  /** Subset identifier from Fontsource (e.g. `japanese`, `cyrillic`). */
  subset: string;
  buffer: ArrayBuffer;
}

/**
 * Per-family weight override for fonts whose 400 (Regular) is too thin for
 * legible Tegaki output. Looked up after the Fontsource metadata is fetched
 * and intersected with the font's available weights.
 */
const WEIGHT_PREFERENCES: Record<string, number> = {
  'Klee One': 600,
  'Zen Maru Gothic': 700,
  'Zen Kaku Gothic New': 700,
  'Noto Sans JP': 700,
};

export async function fetchFontFromCDN(family: string): Promise<{ primary: ArrayBuffer; extra: FontSubsetBuffer[] }> {
  const slug = family.toLowerCase().replace(/\s+/g, '-');
  const baseUrl = `https://cdn.jsdelivr.net/fontsource/fonts/${slug}@latest`;

  let subsets: string[] = ['latin'];
  let weights: number[] = [400];
  try {
    const metaResp = await fetch(`https://api.fontsource.org/v1/fonts/${slug}`);
    if (metaResp.ok) {
      const meta: { subsets?: string[]; weights?: number[] } = await metaResp.json();
      if (meta.subsets?.length) subsets = meta.subsets;
      if (meta.weights?.length) weights = meta.weights;
    }
  } catch {
    // Fall back to latin-only + default weight if metadata fetch fails.
  }

  const preferredWeight = WEIGHT_PREFERENCES[family];
  const weight = preferredWeight && weights.includes(preferredWeight) ? preferredWeight : weights.includes(400) ? 400 : weights[0]!;

  const latinResp = await fetch(`${baseUrl}/latin-${weight}-normal.ttf`);
  if (!latinResp.ok) {
    throw new Error(`Font "${family}" not found on CDN (${latinResp.status}). Try uploading a .ttf file instead.`);
  }
  const primary = await latinResp.arrayBuffer();

  const extraSubsets = subsets.filter((s) => s !== 'latin');
  const extraResults = await Promise.allSettled(
    extraSubsets.map(async (subset): Promise<FontSubsetBuffer | null> => {
      const resp = await fetch(`${baseUrl}/${subset}-${weight}-normal.ttf`);
      if (!resp.ok) return null;
      return { subset, buffer: await resp.arrayBuffer() };
    }),
  );

  const extra = extraResults
    .filter((r): r is PromiseFulfilledResult<FontSubsetBuffer | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((v): v is FontSubsetBuffer => v !== null);

  return { primary, extra };
}
