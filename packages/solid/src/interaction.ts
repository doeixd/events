/**
 * @module @doeixd/solid/interaction
 *
 * Provides a React-like `useInteraction` hook for declaratively attaching
 * interactions and event handlers from `@doeixd/events` to DOM elements in SolidJS.
 */

import { createEvents } from './events';
import type { Accessor } from 'solid-js';
import type { EventDescriptor } from '@doeixd/events';

/**
 * A SolidJS hook that declaratively attaches `@doeixd/events` interactions
 * and event descriptors to a DOM element.
 *
 * This hook provides API parity with the `@doeixd/react` package, offering a
 * consistent developer experience across frameworks. It is an alias for the
 * more generically named `createEvents` primitive.
 *
 * @param target An accessor `() => Element` or a direct element reference.
 *   Using an accessor is recommended for refs that may not be available immediately.
 * @param descriptors An accessor `() => EventDescriptor[]` that returns the array of
 *   descriptors to attach.
 * @param enabled An optional accessor `() => boolean` to conditionally enable or disable
 *   all the event listeners. Defaults to `true`.
 *
 * @example
 * import { createSignal } from 'solid-js';
 * import { useInteraction } from '@doeixd/solid';
 * import { press } from '@doeixd/events';
 *
 * function InteractiveButton() {
 *   const [buttonEl, setButtonEl] = createSignal<HTMLButtonElement>();
 *
 *   const handlePress = () => console.log('Button pressed!');
 *
 *   // Declaratively attach a `press` interaction.
 *   // The hook's name makes the intent clear.
 *   useInteraction(buttonEl, () => [press(handlePress)]);
 *
 *   return <button ref={setButtonEl}>Click or Press Me</button>;
 * }
 */
export function useInteraction(
  target: Accessor<EventTarget | undefined | null> | EventTarget,
  descriptors: Accessor<EventDescriptor[]>,
  enabled?: Accessor<boolean>
): void {
  // This hook is a simple, ergonomic alias for the `createEvents` primitive.
  createEvents(target, descriptors, enabled);
}