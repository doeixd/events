/**
 * @module @doeixd/solid/actor
 *
 * Provides a React-like `useActor` hook for integrating component-owned state
 * engines from `@doeixd/events` (like Actors or Reducers) into SolidJS components.
 */

import { createSignal, createEffect, onCleanup } from 'solid-js';
import { createStore as createSolidStore, reconcile } from 'solid-js/store';

/**
 * A generic interface for a store-like object from @doeixd/events.
 */
interface ActorLike<TState, TActions> {
  (): TState;
  subscribe: (callback: (value: TState) => void) => () => void;
  // This is a stand-in for a reducer's `dispatch` or an actor's own methods
  [key: string]: any;
}

/**
 * A SolidJS hook that creates and manages a component-owned instance of an
 * `@doeixd/events` actor or reducer.
 *
 * It provides a `[state, actions]` tuple, similar to React's `useReducer` or
 * our own `useActor` for React, making the API familiar across frameworks. It
 * subscribes to the external store and syncs its state to a fine-grained
 * Solid store for optimal performance.
 *
 * @param actorFactory A factory function that creates and returns the actor instance
 *   (e.g., `() => createFormStore()`). In Solid, this runs only once.
 * @returns A tuple `[state, actions]`, where `state` is a reactive Solid store
 *   and `actions` is a stable object of the actor's methods.
 *
 * @example
 * import { useActor } from '@doeixd/solid';
 * import { createCounterActor } from './counterActor';
 *
 * function CounterComponent() {
  *   // Create and adapt the actor in one idiomatic line.
  *   const [state, actions] = useActor(createCounterActor);
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
export function useActor<
  TState extends object,
  TActions extends object,
  TActor extends ActorLike<TState, TActions>
>(
  actorFactory: () => TActor
): [TState, TActions] {
  // 1. In Solid, the component body runs once, so we can create the instance directly.
  const initialInstance = actorFactory();

  // 2. Use a signal to track the *current* immutable instance of the store.
  // This is essential for createReducer, which returns a new instance on every dispatch.
  const [instance, setInstance] = createSignal(initialInstance);

  // 3. Create a fine-grained Solid store to hold the reactive state.
  const [state, setState] = createSolidStore(instance()());

  // 4. Create an effect that subscribes to the current store instance.
  createEffect(() => {
    const currentInstance = instance();
    const unsubscribe = currentInstance.subscribe((newState) => {
      // Use `reconcile` for efficient, deep updates to the Solid store.
      setState(reconcile(newState));
    });
    // The effect's cleanup automatically handles unsubscription.
    onCleanup(unsubscribe);
  });

  // 5. Create a stable actions object that is safe to use in event handlers.
  const actions = {} as TActions;
  const actionMethods = initialInstance.dispatch || initialInstance.actions || initialInstance;

  for (const key in actionMethods) {
    if (typeof actionMethods[key] === 'function' && key !== 'subscribe') {
      (actions as any)[key] = (...args: any[]) => {
        // Always get the LATEST instance from the signal before dispatching.
        const currentStore = instance();
        const result = (currentStore.dispatch || currentStore.actions || currentStore)[key](...args);

        // If the action returned a new store instance (i.e., it was a reducer),
        // update our instance signal. This will trigger the effect to re-subscribe.
        if (result && typeof result.subscribe === 'function') {
          setInstance(result as any);
        }
      };
    }
  }

  return [state, actions];
}