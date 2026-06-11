/**
 * iOS Hermes SIGABRT when multiple TurboModules initialize concurrently.
 * All native module work must go through runNativeOperation().
 */

let nativeIdleAfterMs = 0;
let hubEnteredAtMs = 0;
let nativeChain: Promise<void> = Promise.resolve();

export function markPaywallExit(): void {
  markNativeQuiet(8000);
}

export function markHubEntered(): void {
  hubEnteredAtMs = Date.now();
  markNativeQuiet(5000);
}

/** Call before navigating to Apple Sign In. */
export function markAuthFlowStart(): void {
  markNativeQuiet(10000);
}

export function markNativeQuiet(durationMs: number): void {
  nativeIdleAfterMs = Math.max(nativeIdleAfterMs, Date.now() + durationMs);
}

export function hubAgeMs(): number {
  if (!hubEnteredAtMs) return 0;
  return Date.now() - hubEnteredAtMs;
}

export async function waitUntilNativeIdle(): Promise<void> {
  const wait = nativeIdleAfterMs - Date.now();
  if (wait > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, wait));
  }
}

/** Serialize every native TurboModule call app-wide (one at a time). */
export async function runNativeOperation<T>(fn: () => Promise<T>): Promise<T> {
  const op = async () => {
    await waitUntilNativeIdle();
    return fn();
  };
  const result = nativeChain.then(op, op);
  nativeChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function isHubReadyForSidePages(): boolean {
  return hubAgeMs() >= 10000;
}

export function isHubReadyForCalendarNative(): boolean {
  return hubAgeMs() >= 6000;
}
