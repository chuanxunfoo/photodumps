export type CutoutPipeline = 'wasm' | 'native' | 'cloud' | 'prepare';

/** Rough ETA from progress % and pipeline (seconds remaining). */
export function estimateCutoutEtaSec(
  pct: number,
  pipeline: CutoutPipeline,
  stage: string,
): number {
  const p = Math.min(100, Math.max(0, pct));
  if (p >= 98) return 2;

  const stageLower = stage.toLowerCase();
  if (stageLower.includes('download') || stageLower.includes('loading ai')) {
    return pipeline === 'wasm' ? 50 : 15;
  }

  const totalGuess =
    pipeline === 'wasm'
      ? p < 15
        ? 40
        : p < 40
          ? 22
          : p < 70
            ? 12
            : 5
      : pipeline === 'cloud'
        ? 12
        : pipeline === 'native'
          ? 10
          : 20;

  const remaining = Math.round(totalGuess * (1 - p / 100));
  return Math.max(3, remaining);
}

export function formatEta(sec: number): string {
  if (sec <= 5) return 'just a few seconds';
  if (sec < 60) return `~${sec} sec`;
  const m = Math.ceil(sec / 60);
  return m === 1 ? '~1 min' : `~${m} min`;
}

export function cutoutPipelineLabel(pipeline: CutoutPipeline): string {
  if (pipeline === 'wasm') return 'On-device AI (Expo Go)';
  if (pipeline === 'native') return 'On-device ML';
  if (pipeline === 'cloud') return 'Cloud enhance';
  return 'Getting ready';
}
