import { DEFAULT_OPTIONS, type PipelineOptions } from '../commands/generate.ts';
import { DEFAULT_CHARS } from '../constants.ts';

type Stage =
  | 'outline'
  | 'flattened'
  | 'bitmap'
  | 'skeleton'
  | 'overlay'
  | 'distance'
  | 'traced'
  | 'curvature'
  | 'strokes'
  | 'animation'
  | 'final';
type PreviewMode = 'glyph' | 'text';

/** All state that gets persisted to the URL */
export interface UrlState {
  fontFamily: string;
  chars: string;
  selectedChar: string;
  activeStage: Stage;
  previewMode: PreviewMode;
  previewText: string;
  options: PipelineOptions;
  // Text preview settings
  animSpeed: number;
  fontSizePx: number;
  showOverlay: boolean;
}

export const URL_DEFAULTS: UrlState = {
  fontFamily: 'Caveat',
  chars: DEFAULT_CHARS,
  selectedChar: 'A',
  activeStage: 'final',
  previewMode: 'glyph',
  previewText: 'Hello World',
  options: DEFAULT_OPTIONS,
  animSpeed: 1,
  fontSizePx: 128,
  showOverlay: false,
};

// Short keys for compact URLs — only non-default values are written
const OPTION_KEYS: Record<keyof PipelineOptions, string> = {
  resolution: 'res',
  skeletonMethod: 'sk',
  lineCap: 'lc',
  bezierTolerance: 'bt',
  rdpTolerance: 'rt',
  spurLengthRatio: 'sl',
  mergeThresholdRatio: 'mr',
  traceLookback: 'tl',
  curvatureBias: 'cb',
  thinMaxIterations: 'ti',
  junctionCleanupIterations: 'jc',
  dtMethod: 'dt',
  voronoiSamplingInterval: 'vs',
  drawingSpeed: 'ds',
  strokePause: 'sp',
};

const REVERSE_OPTION_KEYS = Object.fromEntries(Object.entries(OPTION_KEYS).map(([k, v]) => [v, k])) as Record<
  string,
  keyof PipelineOptions
>;

/** Read URL state from the current location search params. Returns only overrides (merged with defaults). */
export function parseUrlState(): UrlState {
  const p = new URLSearchParams(window.location.search);
  const state: UrlState = { ...URL_DEFAULTS, options: { ...DEFAULT_OPTIONS } };

  if (p.has('f')) state.fontFamily = p.get('f')!;
  if (p.has('ch')) state.chars = p.get('ch')!;
  if (p.has('g')) state.selectedChar = p.get('g')!;
  if (p.has('s')) state.activeStage = p.get('s') as Stage;
  if (p.has('m')) state.previewMode = p.get('m') as PreviewMode;
  if (p.has('t')) state.previewText = p.get('t')!;
  if (p.has('as')) state.animSpeed = Number(p.get('as'));
  if (p.has('fs')) state.fontSizePx = Number(p.get('fs'));
  if (p.has('ol')) state.showOverlay = p.get('ol') === '1';

  // Pipeline options — read short keys
  for (const [short, long] of Object.entries(REVERSE_OPTION_KEYS)) {
    if (!p.has(short)) continue;
    const raw = p.get(short)!;
    const defaultVal = DEFAULT_OPTIONS[long];
    if (typeof defaultVal === 'number') {
      (state.options as unknown as Record<string, unknown>)[long] = Number(raw);
    } else {
      (state.options as unknown as Record<string, unknown>)[long] = raw;
    }
  }

  return state;
}

/** Build URLSearchParams from state, only including values that differ from defaults. */
export function buildUrlParams(state: UrlState): URLSearchParams {
  const p = new URLSearchParams();

  if (state.fontFamily !== URL_DEFAULTS.fontFamily) p.set('f', state.fontFamily);
  if (state.chars !== URL_DEFAULTS.chars) p.set('ch', state.chars);
  if (state.selectedChar !== URL_DEFAULTS.selectedChar) p.set('g', state.selectedChar);
  if (state.activeStage !== URL_DEFAULTS.activeStage) p.set('s', state.activeStage);
  if (state.previewMode !== URL_DEFAULTS.previewMode) p.set('m', state.previewMode);
  if (state.previewText !== URL_DEFAULTS.previewText) p.set('t', state.previewText);
  if (state.animSpeed !== URL_DEFAULTS.animSpeed) p.set('as', String(state.animSpeed));
  if (state.fontSizePx !== URL_DEFAULTS.fontSizePx) p.set('fs', String(state.fontSizePx));
  if (state.showOverlay !== URL_DEFAULTS.showOverlay) p.set('ol', '1');

  // Pipeline options — only non-defaults
  for (const [long, short] of Object.entries(OPTION_KEYS)) {
    const key = long as keyof PipelineOptions;
    if (state.options[key] !== DEFAULT_OPTIONS[key]) {
      p.set(short, String(state.options[key]));
    }
  }

  return p;
}

/** Replace the current URL search params without a navigation/reload. */
export function syncUrlState(state: UrlState): void {
  const params = buildUrlParams(state);
  const search = params.toString();
  const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}
