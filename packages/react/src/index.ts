/**
 * React Hooks for @doeixd/events
 *
 * Provides seamless integration between @doeixd/events and React components
 * with hooks that automatically handle subscription lifecycle.
 *
 * @example
 * import { useEvent, useSubject } from '@doeixd/react';
 * import { createEvent, createSubject } from '@doeixd/events';
 *
 * function MyComponent() {
 *   const [onIncrement, emitIncrement] = createEvent<number>();
 *   const count = createSubject(0);
 *
 *   useEvent(onIncrement, delta => count(count() + delta));
 *   const currentCount = useSubject(count);
 *
 *   return <button onClick={() => emitIncrement(1)}>Count: {currentCount}</button>;
 * }
 */

import { useEffect, useState, useRef } from 'react';
import type { Handler, Subject } from '@doeixd/events';
import type { DependencyList } from 'react';

/**
 * Hook that automatically subscribes to an event handler within a component's lifecycle.
 * The subscription is cleaned up when the component unmounts.
 *
 * @param handler Event handler to subscribe to
 * @param callback Function to call when events are emitted
 * @param deps Dependencies array for the callback (like useEffect)
 *
 * @example
 * const [onClick, emitClick] = createEvent<MouseEvent>();
 * useEvent(onClick, (event) => {
 *   console.log('Button clicked at:', event.clientX, event.clientY);
 * });
 */
export function useEvent<T>(
  handler: Handler<T>,
  callback: (data: T, meta?: { signal: AbortSignal }) => void,
  deps: DependencyList = []
): void {
  const callbackRef = useRef(callback);

  // Update callback ref when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
  }, deps);

  useEffect(() => {
    const unsubscribe = handler((data: T, meta?: { signal: AbortSignal }) => {
      // Check if callback expects meta parameter
      if (callbackRef.current.length > 1 && meta) {
        callbackRef.current(data, meta);
      } else {
        callbackRef.current(data);
      }
    });

    return unsubscribe;
  }, [handler]);
}

/**
 * Hook that subscribes to a subject and triggers component re-renders when the subject's value changes.
 * Returns the current value of the subject.
 *
 * @param subject Subject to subscribe to
 * @returns Current value of the subject
 *
 * @example
 * const count = createSubject(0);
 * const currentCount = useSubject(count);
 * // Component re-renders whenever count changes
 */
export function useSubject<T>(subject: Subject<T>): T {
  const [value, setValue] = useState<T>(() => subject());

  useEffect(() => {
    const unsubscribe = subject.subscribe(setValue);
    return unsubscribe;
  }, [subject]);

  return value;
}

/**
 * Optimized version of useSubject that only triggers re-renders when the selected part of the state changes.
 * Uses shallow comparison to prevent unnecessary re-renders.
 *
 * @param subject Subject to subscribe to
 * @param selector Function that selects a part of the state
 * @returns Selected value from the subject
 *
 * @example
 * const user = createSubject({ name: 'John', age: 30 });
 * const userName = useSubjectSelector(user, (user) => user.name);
 * // Only re-renders when name changes, not when age changes
 */
export function useSubjectSelector<T, R>(
  subject: Subject<T>,
  selector: (value: T) => R
): R {
  const [selectedValue, setSelectedValue] = useState<R>(() => selector(subject()));
  const selectorRef = useRef(selector);
  const lastValueRef = useRef<T>();

  // Update selector ref
  useEffect(() => {
    selectorRef.current = selector;
  }, [selector]);

  useEffect(() => {
    const unsubscribe = subject.subscribe((newValue) => {
      const newSelected = selectorRef.current(newValue);

      // Only update if selected value actually changed
      if (!shallowEqual(selectedValue, newSelected)) {
        setSelectedValue(newSelected);
      }

      lastValueRef.current = newValue;
    });

    return unsubscribe;
  }, [subject, selectedValue]);

  return selectedValue;
}

/**
 * Shallow equality check for useSubjectSelector optimization
 */
function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return false;

  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!(key in b) || a[key] !== b[key]) return false;
  }

  return true;
}

export default {
  useEvent,
  useSubject,
  useSubjectSelector
};