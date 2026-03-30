import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import type { PipelineResult } from '../commands/generate.ts';
import { charToFilename } from '../processing/animated-svg.ts';
import {
  renderBitmap,
  renderCurvature,
  renderDebugAnimation,
  renderDistance,
  renderFlattened,
  renderOutline,
  renderOverlay,
  renderSkeleton,
  renderStrokes,
  renderTraced,
} from '../processing/visualize.ts';

export { charToFilename };

export async function writeDebugOutput(debugDir: string, char: string, result: PipelineResult): Promise<void> {
  const name = charToFilename(char);
  const glyphDir = join(debugDir, name);
  mkdirSync(glyphDir, { recursive: true });

  await Bun.write(join(glyphDir, '1-outline.svg'), renderOutline(result));
  await Bun.write(join(glyphDir, '2-flattened.svg'), renderFlattened(result));
  await Bun.write(join(glyphDir, '3-bitmap.png'), renderBitmap(result));
  await Bun.write(join(glyphDir, '4-skeleton.png'), renderSkeleton(result));
  await Bun.write(join(glyphDir, '5-overlay.png'), renderOverlay(result));
  await Bun.write(join(glyphDir, '6-distance.png'), renderDistance(result));
  await Bun.write(join(glyphDir, '7-traced.svg'), renderTraced(result));
  await Bun.write(join(glyphDir, '8-curvature.svg'), renderCurvature(result));
  await Bun.write(join(glyphDir, '9-strokes.svg'), renderStrokes(result));
  await Bun.write(join(glyphDir, '10-animation.svg'), renderDebugAnimation(result));
}
