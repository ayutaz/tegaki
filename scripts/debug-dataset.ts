import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { getKanjiSvg, hasKanji, KANJIVG_SHA } from '../packages/dataset-cjk-kanjivg/src/index.ts';
import { MANIFEST } from '../packages/dataset-cjk-kanjivg/src/manifest.ts';

console.log('SHA:', KANJIVG_SHA);
console.log('MANIFEST size:', MANIFEST.size);
console.log('MANIFEST.has(0x308A):', MANIFEST.has(0x308a));
console.log('MANIFEST.get(0x308A):', MANIFEST.get(0x308a));
console.log('hasKanji(0x308A):', hasKanji(0x308a));
const svg = getKanjiSvg(0x308a);
console.log('getKanjiSvg(0x308A) length:', svg?.length);
console.log('typeof process:', typeof process);

// Check if require actually works via new Function in this Bun runtime
const lookupRequire = new Function('return typeof require === "function" ? require : null');
console.log('new Function require:', typeof lookupRequire());
console.log('typeof globalThis.require:', typeof (globalThis as { require?: unknown }).require);

// Direct disk check
const filePath = resolve(import.meta.dir, '..', 'packages', 'dataset-cjk-kanjivg', 'kanjivg', '0308a.svg');
console.log('file exists direct:', existsSync(filePath));
console.log('file direct read length:', readFileSync(filePath, 'utf-8').length);
