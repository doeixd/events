/**
 * @module @doeixd/vue
 *
 * Provides Vue Composables for seamless integration between `@doeixd/events`
 * and Vue's Composition API. These hooks automatically manage subscription
 * lifecycles within a component's scope.
 */

import { onScopeDispose, shallowRef, type Ref } from 'vue';
import type { Handler, Subject } from '@doeixd/events';

/**
 * A Vue composable that subscribes to a `Handler` and automatically
 * cleans up the subscription when the component's scope is disposed.
 *
 * @param handler The `Handler` to subscribe to.
 * @param callback The function to execute when an event is emitted.
 *
 * @example
 * <script setup>
 * import { useEvent } from '@doeixd/vue';
 * import { createEvent } from '@doeixd/events';
 *
 * const [onClick, emitClick] = createEvent();
 *
 * useEvent(onClick, (event) => {
 *   console.log('Button clicked!', event);
 * });
 * </script>
 */
export function useEvent<T>(
  handler: Handler<T>,
  callback: (data: T) => void
): void {
  const unsubscribe = handler(callback);
  onScopeDispose(unsubscribe);
}

/**
 * A Vue composable that subscribes to a `Subject` and returns its value
 * as a reactive `Ref`. The component will re-render whenever the
 * subject's value changes.
 *
 * @param subject The `Subject` to subscribe to.
 * @returns A read-only `Ref` containing the subject's current value.
 *
 * @example
 * <script setup>
 * import { useSubject } from '@doeixd/vue';
 * import { countSubject } from './store'; // Assuming a subject is exported from a store file
 *
 * const count = useSubject(countSubject);
 * </script>
 *
 * <template>
 *   <p>Count is: {{ count }}</p>
 * </template>
 */
export function useSubject<T>(subject: Subject<T>): Ref<T> {
  const value = shallowRef(subject());

  const unsubscribe = subject.subscribe(newValue => {
    value.value = newValue;
  });

  onScopeDispose(unsubscribe);

  return value;
}

/**
 * An optimized version of `useSubject` that subscribes to a `Subject` but
 * only triggers updates when a selected part of the state changes.
 * This is crucial for performance when working with large state objects.
 *
 * @param subject The `Subject` to subscribe to.
 * @param selector A function that selects a value from the subject's state.
 * @returns A read-only `Ref` containing the selected value.
 *
 * @example
 * <script setup>
 * import { useSubjectSelector } from '@doeixd/vue';
 * import { userSubject } from './store';
 *
 * // This component will ONLY re-render when the user's name changes,
 * // not when their age or other properties change.
 * const userName = useSubjectSelector(userSubject, (user) => user.name);
 * </script>
 */
export function useSubjectSelector<T, R>(
  subject: Subject<T>,
  selector: (value: T) => R
): Ref<R> {
  const selectedValue = shallowRef(selector(subject()));

  const unsubscribe = subject.subscribe(newValue => {
    const newSelected = selector(newValue);
    if (selectedValue.value !== newSelected) {
      selectedValue.value = newSelected;
    }
  });

  onScopeDispose(unsubscribe);

  return selectedValue;
}

export default {
  useEvent,
  useSubject,
  useSubjectSelector
};
