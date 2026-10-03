/**
 * Call `installWorkerShims()` before TensorFlow.js runs inside the analysis
 * worker (an explicit call, not a side-effect import: the package is marked
 * `sideEffects: false`, so a bare import could be tree-shaken).
 *
 * tfjs-core 3.x `PlatformBrowser.setTimeoutCustom` does `if (!window || …)`,
 * which throws `ReferenceError: window is not defined` in a worker (hit by the
 * WebGL backend's fence polling). Declaring a global `window` binding whose
 * value is `undefined` makes that check safe while every `typeof window`
 * feature test keeps reporting "no window", so tfjs still behaves as in a
 * worker (plain setTimeout, OffscreenCanvas for WebGL).
 */
export function installWorkerShims(): void {
  if (!('window' in globalThis)) {
    Object.defineProperty(globalThis, 'window', { value: undefined, configurable: true, writable: true })
  }
}
