/**
 * @module @doeixd/react/store
 *
 * Provides a React hook for using @doeixd/events stores (Reducers, Actors, etc.)
 * in a controlled component pattern with unidirectional data flow.
 */

import { useState, useMemo, useSyncExternalStore } from 'react';

/**
 * A generic interface for a store-like object from @doeixd/events.
 * It must be a function to get the current state, have a subscribe method,
 * and an object of action methods.
 */
interface StoreLike<TState, TActions> {
  (): TState;
  subscribe: (callback: (value: TState) => void) => () => void;
  // A generic stand-in for dispatch, or the methods returned by an Actor's setup
  [key: string]: any;
}

/**
 * A React hook for creating and managing an instance of an @doeixd/events
 * store (like a Reducer or Actor) using a controlled component pattern.
 *
 * This is the recommended primitive for most use cases, as it aligns perfectly
 * with React's unidirectional data flow.
 *
 * @param storeFactory A factory function that returns a store instance.
 *   This ensures the store is created only once per component lifecycle.
 * @returns A tuple `[state, actions]`, where `state` is the reactive state
 *   and `actions` is a memoized object of the store's methods (e.g., `dispatch`).
 *
 * @example
 * import { useStore } from '@doeixd/react';
 * import { createCounterActor } from './counterActor';
 *
 * function Counter() {
  *   const [state, actions] = useStore(createCounterActor);
  *
  *   return (
  *     <div>
  *       <p>Count: {state.count}</p>
  *       <button onClick={() => actions.increment()}>Increment</button>
  *     </div>
  *   );
  * }
 */
export function useStore<
  TState extends object,
  TActions extends object,
  TStore extends StoreLike<TState, TActions>
>(
  storeFactory: () => TStore
): [TState, TActions] {
  // 1. Create a stable instance of the store for the component's lifecycle.
  const [storeInstance, setStoreInstance] = useState(storeFactory);

  // 2. Subscribe to the store using React's canonical hook.
  const state = useSyncExternalStore(
    (onStoreChange) => storeInstance.subscribe(onStoreChange),
    () => storeInstance()
  );

  // 3. Create a memoized, stable object of action methods.
  // This is crucial for performance and to prevent re-running effects.
  // This works for both a Reducer's `dispatch` and an Actor's methods.
  const actions = useMemo(() => {
    const actionMethods = storeInstance.dispatch || storeInstance; // Support both reducer and actor shapes
    const stableActions = {} as TActions;

    for (const key in actionMethods) {
      if (typeof actionMethods[key] === 'function' && key !== 'subscribe') {
        (stableActions as any)[key] = (...args: any[]) => {
          // For Reducers, dispatch returns a new instance which we must track.
          const result = actionMethods[key](...args);
          if (result && typeof result.subscribe === 'function') {
            setStoreInstance(result as TStore);
          }
        };
      }
    }
    return stableActions;
  }, [storeInstance]);

  return [state, actions];
}