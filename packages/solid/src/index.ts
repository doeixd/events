/**
 * @module @doeixd/solid
 *
 * Provides a suite of utilities for seamless, bidirectional integration between
 * `@doeixd/events`'s push-based system and SolidJS's pull-based reactivity.
 */

import { createEffect, onCleanup, untrack, createSignal, type Accessor, type Setter } from 'solid-js';
import { createStore, type SetStoreFunction, type Store } from 'solid-js/store';
import type { Handler, Subject } from '@doeixd/events';

// --- NEW ---
export { createEvents } from './events';
export { useActor } from './actor';
export { useInteraction } from './interaction';
// -----------

/* -------------------------------------------------------------------------- */
/*             Consuming @doeixd/events within SolidJS                        */
/* -------------------------------------------------------------------------- */

/**
 * Creates a SolidJS `effect` that subscribes to a `Handler`.
 * The subscription is automatically managed and cleaned up when the
 * reactive scope it's created in is destroyed.
 *
 * @param handler The `Handler` to subscribe to.
 * @param callback The function to execute when an event is emitted.
 *
 * @example
 * import { useEvent } from '@doeixd/solid';
 * import { createEvent } from '@doeixd/events';
 *
 * const [onAlert, emitAlert] = createEvent<string>();
 *
 * createRoot(() => {
 *   // The subscription will be active for the lifetime of this root.
 *   useEvent(onAlert, (message) => alert(message));
 * });
 *
 * emitAlert('Hello from Solid!');
 */
export function useEvent<T>(
  handler: Handler<T>,
  callback: (data: T) => void
): void {
  createEffect(() => {
    const unsubscribe = handler(callback);
    onCleanup(unsubscribe);
  });
}

/**
 * Converts an `@doeixd/events` `Subject` into a read-only SolidJS `Accessor` (a signal getter).
 * This creates a reactive bridge, causing any Solid `effect` or component that
 * reads the accessor to re-evaluate when the subject's value changes.
 *
 * @param subject The `Subject` to convert.
 * @returns A SolidJS `Accessor<T>` that reactively returns the subject's value.
 *
 * @example
 * import { useSubject } from '@doeixd/solid';
 * import { counterSubject } from './store';
 *
 * const count = useSubject(counterSubject);
 *
 * createEffect(() => {
 *   // This effect will re-run whenever counterSubject is updated.
 *   console.log(`The count is now: ${count()}`);
 * });
 */
export function useSubject<T>(subject: Subject<T>): Accessor<T> {
  const [signal, setSignal] = createSignal(subject(), { equals: false });

  createEffect(() => {
    const unsubscribe = subject.subscribe(setSignal);
    onCleanup(unsubscribe);
  });

  return signal;
}

/**
 * Converts an `@doeixd/events` `Subject` holding an object into a reactive
 * SolidJS `Store`. This provides deep, fine-grained reactivity for nested properties.
 *
 * @param subject The `Subject` containing an object to convert into a store.
 * @returns A tuple of [store, setStore] for reactive store access.
 *
 * @example
 * import { useSubjectStore } from '@doeixd/solid';
 * import { userSubject } from './store';
 *
 * const [user, setUser] = useSubjectStore(userSubject);
 *
 * createEffect(() => {
 *   // This effect will ONLY re-run when `user.name` changes.
 *   console.log(`User's name is: ${user.name}`);
 * });
 */
export function useSubjectStore<T extends object>(
  subject: Subject<T>
): [Store<T>, SetStoreFunction<T>] {
  const [store, setStore] = createStore(subject());

  createEffect(() => {
    const unsubscribe = subject.subscribe((newState) => setStore(newState as any));
    onCleanup(unsubscribe);
  });

  return [store, setStore];
}

/* -------------------------------------------------------------------------- */
/*              Driving @doeixd/events from SolidJS Reactivity                */
/* -------------------------------------------------------------------------- */

/**
 * Creates an `@doeixd/events` `Handler` from a SolidJS `Accessor` (signal).
 * The handler will emit a new value whenever the signal it's tracking changes.
 *
 * This is the primary way to push changes from Solid's reactive graph
 * into an `@doeixd/events` pipeline.
 *
 * @param accessor The SolidJS `Accessor<T>` to track.
 * @returns A `Handler<T>` that emits when the signal changes.
 *
 * @example
 * import { fromSignal } from '@doeixd/solid';
 * import { createSignal } from 'solid-js';
 * import { debounce } from '@doeixd/events/operators';
 *
 * const [query, setQuery] = createSignal("");
 * const onQueryChange = fromSignal(query);
 *
 * // Now, use the powerful operators from @doeixd/events!
 * const onDebouncedQuery = debounce(300)(onQueryChange);
 *
 * onDebouncedQuery(q => {
 *   console.log(`Fetching results for: ${q}`);
 * });
 *
 * setQuery('solid'); // Will trigger the handler chain after 300ms.
 */
export function fromSignal<T>(accessor: Accessor<T>): Handler<T> {
  const subscribers = new Set<(value: T) => void>();

  const handler = (callback: (value: T) => void) => {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  };

  createEffect(() => {
    const value = accessor();
    untrack(() => {
      subscribers.forEach(callback => callback(value));
    });
  });

  return handler as Handler<T>;
}

/**
 * Connects a SolidJS `Accessor` (signal) to an `@doeixd/events` `Subject`.
 * This creates a one-way binding: when the signal changes, the subject is updated.
 *
 * @param accessor The source SolidJS `Accessor<T>`.
 * @param subject The target `@doeixd/events` `Subject<T>`.
 * @returns A cleanup function to stop the binding.
 *
 * @example
 * import { bindSignalToSubject } from '@doeixd/solid';
 * import { createSignal } from 'solid-js';
 * import { createSubject } from '@doeixd/events';
 *
 * const [solidCount, setSolidCount] = createSignal(0);
 * const eventsCount = createSubject(0);
 *
 * const cleanup = bindSignalToSubject(solidCount, eventsCount);
 *
 * eventsCount.subscribe(val => console.log(val)); // Logs 0, then 10
 *
 * setSolidCount(10);
 * // cleanup(); // Call to stop the synchronization
 */
export function bindSignalToSubject<T>(
  accessor: Accessor<T>,
  subject: Subject<T>
): () => void {
  let isDisposed = false;

  createEffect(() => {
    if (isDisposed) return;
    const value = accessor();
    untrack(() => subject(value));
  });

  const cleanup = () => {
    isDisposed = true;
  };

  onCleanup(cleanup);
  return cleanup;
}

/**
 * Creates a two-way binding between a SolidJS signal `[get, set]` pair and an
 * `@doeixd/events` `Subject`. Changes to one will automatically update the other.
 *
 * The function carefully prevents infinite update loops.
 *
 * @param signal A tuple containing the SolidJS signal `[Accessor, Setter]`.
 * @param subject The `@doeixd/events` `Subject<T>`.
 * @returns A cleanup function to tear down the two-way binding.
 *
 * @example
 * import { syncSignalWithSubject } from '@doeixd/solid';
 * import { createSignal } from 'solid-js';
 * import { createSubject } from '@doeixd/events';
 *
 * const solidSignal = createSignal("Hello");
 * const eventsSubject = createSubject("Hello");
 *
 * syncSignalWithSubject(solidSignal, eventsSubject);
 *
 * // Change from Solid side
 * solidSignal[1]("Solid");
 * console.log(eventsSubject()); // "Solid"
 *
 * // Change from @doeixd/events side
 * eventsSubject("Events");
 * console.log(solidSignal[0]()); // "Events"
 */
export function syncSignalWithSubject<T>(
  [accessor, setter]: [Accessor<T>, Setter<T>],
  subject: Subject<T>
): () => void {
  let inUpdate = false; // A lock to prevent recursive updates

  const sub = subject.subscribe(value => {
    if (inUpdate) return;
    inUpdate = true;
    setter(() => value);
    inUpdate = false;
  });

  createEffect(() => {
    if (inUpdate) return;
    const value = accessor();
    inUpdate = true;
    untrack(() => subject(value));
    inUpdate = false;
  });

  const cleanup = () => {
    sub();
  };

  onCleanup(cleanup);
  return cleanup;
}

// --- UPDATE THE DEFAULT EXPORT ---
import { createEvents } from './events';
import { useActor } from './actor';
import { useInteraction } from './interaction'; // Import for default export

export default {
  // Existing hooks
  useEvent,
  useSubject,
  useSubjectStore,
  fromSignal,
  bindSignalToSubject,
  syncSignalWithSubject,
  // New hooks
  useActor,
  createEvents,
  useInteraction,
};
