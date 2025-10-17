/**
 * @module @doeixd/svelte/runes
 *
 * Provides Svelte Runes for seamless, fine-grained integration between
 * `@doeixd/events` and Svelte 5+. These functions must be used inside
 * `.svelte` files or other `.svelte.ts`/`.svelte.js` modules.
 */

import { untrack } from 'svelte';
import type { Handler, Subject } from '@doeixd/events';

/**
 * A Svelte Rune that subscribes to a `Handler`. The subscription is
 * automatically created and destroyed with the component's lifecycle.
 *
 * This must be called during component initialization (not in an event handler).
 *
 * @param handler The `Handler` to subscribe to.
 * @param callback The function to execute when an event is emitted.
 *
 * @example
 * // inside a .svelte file or .svelte.ts module
 * <script>
 *   import { useEvent } from '@doeixd/svelte/runes';
 *   import { createEvent } from '@doeixd/events';
 *
 *   const [onAlert, emitAlert] = createEvent<string>();
 *
 *   // The subscription is automatically managed by the effect rune.
 *   useEvent(onAlert, (message) => {
 *     alert(message);
 *   });
 * </script>
 */
export function useEvent<T>(
  handler: Handler<T>,
  callback: (data: T) => void
): void {
  $effect(() => {
    const unsubscribe = handler(callback);
    // The function returned from an effect is its cleanup function.
    // Svelte will call this when the component is unmounted.
    return unsubscribe;
  });
}

/**
 * A Svelte 5 Rune that subscribes to a `Subject` and returns its value
 * as a reactive `$state` variable.
 *
 * This provides fine-grained reactivity, meaning only the parts of your
 * template that actually use this value will update when it changes.
 *
 * @param subject The `Subject` to subscribe to.
 * @returns A reactive state variable containing the subject's value.
 *
 * @example
 * // inside a .svelte file or .svelte.ts module
 * <script>
 *   import { useSubjectState } from '@doeixd/svelte/runes';
 *   import { userSubject } from './store';
 *
 *   let user = useSubjectState(userSubject);
 *
 *   // You can derive state from it reactively
 *   let greeting = $derived(`Hello, ${user.name}`);
 * </script>
 *
 * <template>
 *   <p>{greeting}</p>
 *   <p>Age: {user.age}</p>
 * </template>
 */
export function useSubjectState<T>(subject: Subject<T>): T {
  // Use Svelte's `$state` rune to create a reactive variable.
  // We initialize it with the subject's current value.
  let value = $state(subject());

  // Use an effect to create a subscription and keep the state in sync.
  $effect(() => {
    // This effect runs once on component mount.
    const unsubscribe = subject.subscribe(newValue => {
      // When the subject emits, update our reactive state variable.
      // Use untrack to prevent creating a dependency on the value read
      untrack(() => {
        value = newValue;
      });
    });
    // The effect's cleanup function handles unsubscription on component unmount.
    return unsubscribe;
  });

  return value;
}

export default {
  useEvent,
  useSubjectState
};
