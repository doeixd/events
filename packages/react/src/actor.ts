/**
 * @module @doeixd/react/actor
 *
 * Provides React hooks for creating and subscribing to component-owned instances
 * of stateful engines from `@doeixd/events` (like Actors, Reducers, or State Machines).
 *
 * These hooks are the ideal primitives for when a component "owns" a piece of
 * complex, non-React state logic.
 */

import { useState, useSyncExternalStore } from 'react';

/**
 * A generic interface describing the shape of a stateful object
 * from @doeixd/events (e.g., an Actor or a Reducer store).
 * It must have a subscribe method and be callable to get its current state.
 * @template TState The shape of the state object.
 */
interface SubscribableWithValue<TState> {
  (value?: TState): TState;
  subscribe: (callback: (value: TState) => void) => () => void;
}

/**
 * Creates a stable, component-bound instance of a stateful actor/store and
 * subscribes to its state, triggering re-renders on updates.
 *
 * This hook is the canonical way to integrate a stateful `@doeixd/events`
 * primitive whose lifecycle is tied to a specific component. It uses React's
 * `useSyncExternalStore` for a robust and performant subscription.
 *
 * @template TState The type of the actor's state.
 * @template TActor The type of the actor instance.
 * @param actorFactory A factory function that creates and returns the actor instance (e.g., `() => createCounterActor()`).
 *   The factory is called only once on the component's initial render.
 * @returns A tuple `[state, actor]`, where `state` is the reactive state and `actor` is the stable instance.
 *
 * @example
 * import { useActor } from '@doeixd/react';
 * import { createCounterActor } from './counterActor';
 *
 * function CounterComponent() {
 *   // The counter actor's lifecycle is now tied to this component.
 *   const [counterState, counterActor] = useActor(createCounterActor);
 *
 *   return (
 *     <div>
 *       <p>Count: {counterState.count}</p>
 *       <button onClick={() => counterActor.increment(1)}>Increment</button>
 *     </div>
 *   );
 * }
 */
export function useActor<
  TState extends object,
  TActor extends SubscribableWithValue<TState>
>(actorFactory: () => TActor): [TState, TActor] {
  // 1. Create a stable instance of the actor that persists for the
  // component's entire lifecycle. `useState`'s initializer ensures this runs only once.
  const [actor] = useState(actorFactory);

  // 2. Subscribe to the external actor's state using React's canonical hook.
  const state = useSyncExternalStore(
    (onStoreChange) => actor.subscribe(onStoreChange), // How to subscribe
    () => actor() // How to get a snapshot of the current state
  );

  return [state, actor];
}

/**
 * An optimized version of `useActor` that only triggers a re-render when a
 * selected part of the actor's state changes.
 *
 * This is essential for performance when a component only depends on a small
 * slice of a large state object.
 *
 * @template TState The type of the actor's state.
 * @template TActor The type of the actor instance.
 * @template TSelection The type of the selected value.
 * @param actorFactory A factory function that creates the actor instance.
 * @param selector A function that selects a value from the actor's state.
 * @returns The selected reactive state value.
 *
 * @example
 * import { useActorSelector } from '@doeixd/react';
 * import { createUserProfileActor } from './userProfileActor';
 *
 * function UserNameDisplay() {
 *   // This component will ONLY re-render when `user.name` changes.
 *   const userName = useActorSelector(
 *     createUserProfileActor,
 *     (state) => state.user.name
 *   );
 *
 *   return <h1>{userName}</h1>;
 * }
 */
export function useActorSelector<
  TState extends object,
  TActor extends SubscribableWithValue<TState>,
  TSelection
>(
  actorFactory: () => TActor,
  selector: (state: TState) => TSelection
): TSelection {
  const [actor] = useState(actorFactory);

  // useSyncExternalStore is smart enough to only re-render if the
  // return value of the `getSnapshot` function changes.
  const selectedState = useSyncExternalStore(
    (onStoreChange) => actor.subscribe(onStoreChange),
    () => selector(actor()) // The snapshot is now the selected value
  );

  return selectedState;
}