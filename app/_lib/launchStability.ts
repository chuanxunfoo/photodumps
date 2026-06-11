/**
 * iOS Hermes crashes when multiple TurboModules initialize concurrently
 * (common right after paywall → hub navigation). Serialize native access here.
 */

let nativeIdleAfterMs = 0;
let hubEnteredAtMs = 0;

/** Call before navigating away from subscription / onboarding paywall. */
export function markPaywallExit(): void {
  const quietUntil = Date.now() + 6000;
  nativeIdleAfterMs = Math.max(nativeIdleAfterMs, quietUntil);
}

/** Call when hub shell mounts. */
export function markHubEntered(): void {
  hubEnteredAtMs = Date.now();
  const quietUntil = Date.now() + 5000;
  nativeIdleAfterMs = Math.max(nativeIdleAfterMs, quietUntil);
}

export function hubAgeMs(): number {
  if (!hubEnteredAtMs) return 0;
  return Date.now() - hubEnteredAtMs;
}

/** Block until the post-paywall quiet window has passed. */
export async function waitUntilNativeIdle(): Promise<void> {
  const wait = nativeIdleAfterMs - Date.now();
  if (wait > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, wait));
  }
}

/** True when hub has been up long enough to load secondary pages. */
export function isHubReadyForSidePages(): boolean {
  return hubAgeMs() >= 8000;
}

/** True when calendar may touch MediaLibrary / Blur modules. */
export function isHubReadyForCalendarNative(): boolean {
  return hubAgeMs() >= 4500;
}
