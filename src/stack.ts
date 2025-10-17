/**
 * @internal
 * A private abstraction for managing a stack of cleanup functions (Unsubscribe).
 * This provides a consistent interface that uses the native `DisposableStack`
 * if available, and falls back to a simple array-based implementation otherwise.
 */

import type { Unsubscribe } from './main';

/**
 * The unified interface for our internal subscription stack.
 * Both the native and fallback implementations will conform to this.
 */
interface SubscriptionStack {
  /** Registers a cleanup function to be called on disposal. */
  defer(onDispose: Unsubscribe): void;
  /** Executes all registered cleanup functions. */
  dispose(): void;
}

/**
 * Creates and returns a `SubscriptionStack` manager.
 * It intelligently chooses the best available implementation at runtime.
 */
export function createSubscriptionStack(): SubscriptionStack {
  // Runtime check for the native DisposableStack.
  if (typeof DisposableStack === 'function') {
    // MODERN PATH: Use the native, robust implementation.
    const stack = new DisposableStack();
    return {
      defer: (onDispose) => stack.defer(onDispose),
      dispose: () => stack.dispose(),
    };
  } else {
    // FALLBACK PATH: Use a simple, universally compatible array-based implementation.
    const unsubs: Unsubscribe[] = [];
    return {
      defer: (onDispose) => {
        unsubs.push(onDispose);
      },
      dispose: () => {
        // We iterate in reverse to maintain LIFO behavior, same as DisposableStack.
        for (let i = unsubs.length - 1; i >= 0; i--) {
          try {
            unsubs[i]();
          } catch (e) {
            // In the fallback, we can only log the error and continue,
            // as we don't have access to SuppressedError.
            // This is a reasonable trade-off for compatibility.
            console.error('An error occurred during unsubscription:', e);
          }
        }
      },
    };
  }
}