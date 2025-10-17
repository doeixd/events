/**
 * @module @doeixd/react/events
 *
 * Provides a React hook for declaratively attaching event handlers and
 * high-level interactions from `@doeixd/events` to DOM elements.
 */

import { useEffect, type RefObject } from 'react';
import { events, type EventDescriptor } from '@doeixd/events';

/**
 * A React hook that declaratively attaches `@doeixd/events` interactions and
 * event descriptors to a DOM element ref. It's the React-idiomatic way to
 * use the core `events()` system.
 *
 * It automatically handles the lifecycle, creating the event container when the
 * element is mounted and cleaning it up when the component unmounts or when
 * the event descriptors change.
 *
 * @param targetRef A React `RefObject` pointing to the target DOM element.
 * @param descriptors An array of `EventDescriptor` objects to attach. These are
 *   created by primitives like `press()`, `dom.click()`, etc.
 * @param enabled A boolean to conditionally enable or disable all the event listeners. Defaults to `true`.
 *
 * @example
 * import { useRef } from 'react';
 * import { useEvents } from '@doeixd/react';
 * import { press, dom } from '@doeixd/events';
 *
 * function InteractiveButton() {
 *   const buttonRef = useRef(null);
 *
 *   const handlePress = () => console.log('Button pressed!');
 *   const handleClick = () => console.log('Native click event fired.');
 *
 *   // Declaratively attach a high-level `press` interaction and a
 *   // standard click handler. The hook manages all setup and cleanup.
 *   useEvents(buttonRef, [
 *     press(handlePress),
 *     dom.click(handleClick)
 *   ]);
 *
 *   return <button ref={buttonRef}>Click or Press Me</button>;
 * }
 */
export function useEvents(
  targetRef: RefObject<EventTarget>,
  descriptors: EventDescriptor[],
  enabled: boolean = true
): void {
  useEffect(() => {
    // Do nothing if the hook is disabled or the ref is not yet attached.
    const target = targetRef.current;
    if (!enabled || !target) {
      return;
    }

    // Create the event container for the target element.
    const container = events(target);

    // Attach the provided event descriptors.
    container.on(descriptors);

    // The cleanup function from the effect will be called on unmount
    // or when dependencies change, ensuring listeners are removed.
    return () => {
      container.cleanup();
    };

    // The descriptors array is a key dependency. To prevent re-running this
    // effect on every render, the array and its callback functions should be
    // memoized with `useMemo` and `useCallback` by the consuming component.
  }, [targetRef, descriptors, enabled]);
}