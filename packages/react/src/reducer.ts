/**
 * @module @doeixd/react/reducer
 *
 * Provides a React hook for using `@doeixd/events`'s `createReducer`
 * primitive in a way that is idiomatic to React.
 */

import { useState, useMemo, useSyncExternalStore } from 'react';
import type { ReducerStore, ReducerConfig } from '@doeixd/events';

/**
 * A React hook that creates and manages an `@doeixd/events` reducer store,
 * providing a familiar `[state, dispatch]` API.
 *
 * It mirrors React's `useReducer` but is powered by the fluent, immutable
 * `createReducer` primitive. It ensures the `dispatch` function is stable
 * and that the component re-renders correctly on state updates.
 *
 * @template TState The shape of the reducer's state.
 * @template TActions The shape of the reducer's actions.
 * @param reducerFactory A factory function that returns a `ReducerStore` instance
 *   (e.g., `() => createReducer({ initialState: ..., actions: ... })`).
 * @returns A tuple `[state, dispatch]`, where `state` is the reactive state
 *   and `dispatch` is a stable object of dispatcher methods.
 *
 * @example
 * import { useEventReducer, useEvent } from '@doeixd/react';
 * import { createReducer, createEvent } from '@doeixd/events';
 *
 * const counterReducer = () => createReducer({
 *   initialState: { count: 0 },
 *   actions: {
 *     increment: (state, amount: number) => ({ count: state.count + amount }),
 *     reset: (state) => ({ count: 0 }),
 *   },
 * });
 *
 * const [onReset, reset] = createEvent();
 *
 * function CounterComponent() {
 *   const [state, dispatch] = useEventReducer(counterReducer);
 *
 *   // You can still connect event streams to your dispatch actions
 *   useEvent(onReset, () => dispatch.reset());
 *
 *   return (
 *     <div>
 *       <p>Count: {state.count}</p>
 *       <button onClick={() => dispatch.increment(1)}>Increment</button>
 *       <button onClick={reset}>Reset via Event</button>
 *     </div>
 *   );
 * }
 */
export function useEventReducer<
  TState extends object,
  TActions extends Record<string, (...args: any[]) => any>
>(
  reducerFactory: () => ReducerStore<TState, TActions>
): [TState, ReducerStore<TState, TActions>['dispatch']] {
  // 1. Create a stable instance of the reducer store using useState's initializer.
  const [reducerInstance, setReducerInstance] = useState(reducerFactory);

  // 2. Subscribe to the store's state reactively using useSyncExternalStore.
  const state = useSyncExternalStore(
    (onStoreChange) => reducerInstance.subscribe(onStoreChange),
    () => reducerInstance()
  );

  // 3. Create a stable dispatch object.
  // This is crucial, as `reducerInstance.dispatch` is tied to an immutable
  // version of the store. We create our own stable dispatcher that always
  // calls the method on the *current* instance and updates our state.
  const dispatch = useMemo(() => {
    const dispatcher = {} as ReducerStore<TState, TActions>['dispatch'];
    for (const key in reducerInstance.dispatch) {
      if (Object.prototype.hasOwnProperty.call(reducerInstance.dispatch, key)) {
        (dispatcher as any)[key] = (...args: any[]) => {
          // Get the current instance of the reducer from state.
          const currentInstance = reducerInstance;
          // Call the real dispatch method, which returns a *new* store instance.
          const newInstance = (currentInstance.dispatch as any)[key](...args);
          // Update our React state to hold the new immutable instance.
          setReducerInstance(newInstance);
        };
      }
    }
    return dispatcher;
  }, [reducerInstance]); // Re-memoize if the reducer's actions change (rare)

  return [state, dispatch];
}