/**
 * iOS Hermes SIGABRT when multiple TurboModules initialize concurrently.
 * All native module work must go through runNativeOperation().
 */

let nativeIdleAfterMs = 0;
let hubEnteredAtMs = 0;
let nativeChain: Promise<void> = Promise.resolve();
let nativeOperationDepth = 0;

export function markPaywallExit(): void {
  markNativeQuiet(8000);
}

export function markHubEntered(): void {
  hubEnteredAtMs = Date.now();
  markNativeQuiet(5000);
}

/** Brief quiet window before auth UI — avoid long blocks that stall the sign-in sheet. */
export function markAuthFlowStart(): void {
  markNativeQuiet(1500);
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
  // Nested calls deadlock on nativeChain — run inline when already inside an op.
  if (nativeOperationDepth > 0) {
    return fn();
  }
  const op = async () => {
    await waitUntilNativeIdle();
    nativeOperationDepth += 1;
    try {
      return await fn();
    } finally {
      nativeOperationDepth -= 1;
    }
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
