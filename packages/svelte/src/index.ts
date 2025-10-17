/**
 * @module @doeixd/svelte
 *
 * Provides Svelte Store utilities for integrating `@doeixd/events` with Svelte.
 * This is compatible with all modern versions of Svelte. For Svelte 5+, consider
 * using the more fine-grained utilities in `@doeixd/svelte/runes`.
 */

import { readable, type Readable } from 'svelte/store';
import type { Subject } from '@doeixd/events';

/**
 * Converts an `@doeixd/events` `Subject` into a readable Svelte store.
 *
 * This allows you to use the `$store` auto-subscription syntax in your Svelte
 * components, creating a reactive link between the subject's state and your UI.
 * The subscription is managed automatically by Svelte's store mechanism.
 *
 * @param subject The `Subject` to convert.
 * @returns A readable Svelte store (`Readable<T>`).
 *
 * @example
 * <!-- MyComponent.svelte -->
 * <script>
 *   import { useSubjectStore } from '@doeixd/svelte';
 *   import { countSubject } from './store';
 *
 *   const count = useSubjectStore(countSubject);
 * </script>
 *
 * <template>
 *   <!-- Use the $ prefix for auto-subscription -->
 *   <p>The current count is: {$count}</p>
 * </template>
 */
export function useSubjectStore<T>(subject: Subject<T>): Readable<T> {
  // Svelte's `readable` store is perfect for this. It sets up a subscription
  // when the first subscriber joins and tears it down when the last one leaves.
  return readable(subject(), (set) => {
    const unsubscribe = subject.subscribe(set);
    // Return the cleanup function, as required by the readable store contract.
    return unsubscribe;
  });
}

export default {
  useSubjectStore
};
