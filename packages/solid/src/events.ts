/**
 * @module @doeixd/solid/events
 *
 * Provides a SolidJS primitive for declaratively attaching event handlers and
 * high-level interactions from `@doeixd/events` to DOM elements.
 */

import { createEffect, onCleanup, type Accessor } from 'solid-js';
import { events, type EventDescriptor } from '@doeixd/events';

/**
 * A SolidJS primitive that declaratively attaches `@doeixd/events` interactions
 * and event descriptors to a DOM element.
 *
 * It's the idiomatic way to use the core `events()` system in Solid. It creates
 * an effect that automatically manages the lifecycle, attaching handlers when the
 * target element is available and cleaning them up when the component unmounts
 * or dependencies change.
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
 * import { createEvents } from '@doeixd/solid';
 * import { press, dom } from '@doeixd/events';
 *
 * function InteractiveButton() {
 *   const [buttonEl, setButtonEl] = createSignal<HTMLButtonElement>();
 *
 *   const handlePress = () => console.log('Button pressed!');
 *
 *   // Declaratively attach a `press` interaction.
 *   // The hook handles all setup and cleanup automatically.
 *   createEvents(buttonEl, () => [press(handlePress)]);
 *
 *   return <button ref={setButtonEl}>Click or Press Me</button>;
 * }
 */
export function createEvents(
  target: Accessor<EventTarget | undefined | null> | EventTarget,
  descriptors: Accessor<EventDescriptor[]>,
  enabled: Accessor<boolean> = () => true
): void {
  createEffect(() => {
    const targetElement = typeof target === 'function' ? target() : target;
    const eventDescriptors = descriptors();

    // Do nothing if disabled, target is not ready, or no descriptors are provided.
    if (!enabled() || !targetElement || eventDescriptors.length === 0) {
      return;
    }

    // Create the event container for the target element.
    const container = events(targetElement);

    // Attach the provided event descriptors.
    container.on(eventDescriptors);

    // createEffect automatically uses `onCleanup` for the returned function.
    onCleanup(() => {
      container.cleanup();
    });
  });
}