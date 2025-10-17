/**
 * @module @doeixd/solid/store
 *
 * Provides a powerful primitive for integrating component-owned state engines
 * from `@doeixd/events` (like Actors or Reducers) into SolidJS components.
 */

import { createSignal, createEffect, onCleanup } from 'solid-js';
import { createStore as createSolidStore, reconcile } from 'solid-js/store';

/**
 * A generic interface for a store-like object from @doeixd/events.
 */
interface StoreLike<TState, TActions> {
  (): TState;
  subscribe: (callback: (value: TState) => void) => () => void;
  // This is a stand-in for a reducer's `dispatch` or an actor's methods
  [key: string]: any;
}

/**
 * Adapts an `@doeixd/events` store (like an Actor or Reducer) for idiomatic
 * use within a SolidJS component.
 *
 * It subscribes to the external store and syncs its state to a fine-grained
 * Solid store, providing optimal performance. It also creates a stable `actions`
 * object that correctly handles the immutable nature of reducers.
 *
 * @param storeInstance The store instance created by a factory like `createFormStore()`.
 * @returns A tuple `[state, actions]`, where `state` is a reactive Solid store
 *   and `actions` is a stable object of the store's methods.
 *
 * @example
 * import { createStoreAdapter } from '@doeixd/solid';
 * import { createCounterActor } from './counterActor';
 *
 * function CounterComponent() {
 *   // 1. Create the instance once.
 *   const counterActor = createCounterActor();
 *   // 2. Adapt it for Solid.
 *   const [state, actions] = createStoreAdapter(counterActor);
 *
 *   // `state` is now a fine-grained Solid store.
 *   // `actions` contains stable methods like `increment`.
 *
 *   return (
 *     <div>
 *       <p>Count: {state.count}</p>
 *       <button onClick={() => actions.increment()}>Increment</button>
 *     </div>
 *   );
 * }
 */
export function createStoreAdapter<
  TState extends object,
  TActions extends object,
  TStore extends StoreLike<TState, TActions>
>(
  storeInstance: TStore
): [TState, TActions] {
  // 1. Use a signal to track the current immutable instance of the store.
  // This is crucial for reducers that return new instances on dispatch.
  const [instance, setInstance] = createSignal(storeInstance);

  // 2. Create a fine-grained Solid store to hold the reactive state.
  // We use `reconcile` in the effect to perform efficient, deep updates.
  const [state, setState] = createSolidStore(instance()());

  // 3. Create an effect that subscribes to the *current* store instance.
  // When the instance changes (e.g., after a reducer dispatch), this
  // effect will re-run, unsubscribing from the old and subscribing to the new.
  createEffect(() => {
    const currentInstance = instance();
    const unsubscribe = currentInstance.subscribe((newState) => {
      setState(reconcile(newState));
    });
    onCleanup(unsubscribe);
  });

  // 4. Create a stable actions object.
  // Since the component body only runs once, this object is naturally stable.
  const actions = {} as TActions;
  const initialInstance = instance();
  const actionMethods = initialInstance.dispatch || initialInstance.actions || initialInstance;

  for (const key in actionMethods) {
    if (typeof actionMethods[key] === 'function' && key !== 'subscribe') {
      (actions as any)[key] = (...args: any[]) => {
        // Always call the action on the *latest* store instance.
        const currentStore = instance();
        const result = (currentStore.dispatch || currentStore.actions || currentStore)[key](...args);

        // If the action returned a new store instance (like a reducer does),
        // update our instance signal to trigger the subscription effect.
        if (result && typeof result.subscribe === 'function') {
          setInstance(result as any);
        }
      };
    }
  }

  return [state, actions];
}