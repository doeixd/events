
import type { Unsubscribe } from './main';

// Ensure Symbol.dispose exists to support older environments gracefully.
// This is a simplified polyfill for type-checking and basic functionality.
if (typeof Symbol.dispose !== 'symbol') {
  (Symbol as any).dispose = Symbol.for('Symbol.dispose');
}
declare global {
  interface SymbolConstructor {
    readonly dispose: unique symbol;
  }
  interface DisposableStack {
    use<T extends { [Symbol.dispose](): void }>(value: T): T;
    defer(onDispose: () => void): void;
    dispose(): void;
  }
}

/**
 * A manager for collecting and disposing of multiple subscriptions.
 * It implements the Disposable protocol, allowing it to be used with
 * the `using` keyword for automatic cleanup.
 */
export interface SubscriptionManager {
  /**
   * Adds an unsubscribe function to the manager's stack.
   * This function will be called when the manager is disposed.
   * @param unsubscribe The unsubscribe function returned from a handler or subject.
   */
  add(unsubscribe: Unsubscribe): void;

  /**
   * Manually disposes of all managed subscriptions. This is called
   * automatically when using the `using` keyword.
   */
  dispose(): void;

  /**
   * Implements the Disposable protocol for automatic cleanup via `using`.
   */
  [Symbol.dispose](): void;
}

/**
 * Creates a new SubscriptionManager to handle the lifecycle of multiple
 * event and subject subscriptions.
 *
 * @returns {SubscriptionManager} A manager instance.
 *
 * @example
 * using manager = createSubscriptionManager();
 * manager.add(myHandler(() => {}));
 * manager.add(mySubject.subscribe(() => {}));
 * // All subscriptions are cleaned up automatically at the end of the scope.
 */
export function createSubscriptionManager(): SubscriptionManager {
  // Relies on the environment's DisposableStack.
  // A polyfill might be needed for full cross-browser support if desired.
  const stack = new DisposableStack();

  return {
    add(unsubscribe: Unsubscribe): void {
      // The 'defer' method is perfect for registering cleanup functions.
      stack.defer(unsubscribe);
    },
    dispose(): void {
      stack.dispose();
    },
    [Symbol.dispose](): void {
      stack.dispose();
    }
  };
}