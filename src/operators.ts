/**
 * @module operators
 * Pipeable handler operators for creating reusable, stateful interactions.
 *
 * Handler operators are functions that take a Handler and return a new Handler,
 * enabling composable, reusable event logic similar to RxJS operators.
 */

import { halt, Handler } from './main';

/**
 * Creates a double-click handler operator that only triggers on double clicks within a timeout.
 *
 * @param timeout The maximum time in milliseconds between clicks to be considered a double click
 * @returns A pipeable operator function
 *
 * @example
 * ```typescript
 * import { dom } from '@doeixd/events';
 * import { doubleClick } from '@doeixd/events/operators';
 *
 * const onButtonClick = dom.click(button);
 * const onButtonDoubleClick = doubleClick(500)(onButtonClick);
 *
 * onButtonDoubleClick(() => console.log('Double click detected!'));
 * ```
 */
export function doubleClick<T extends Event>(timeout = 300) {
  let timer: number = 0;

  return (source: Handler<T>): Handler<T> =>
    source(event => {
      if (timer) {
        clearTimeout(timer);
        timer = 0;
        return event; // Pass through on double click
      }
      timer = window.setTimeout(() => (timer = 0), timeout);
      return halt(); // Halt on first click
    });
}

/**
 * Creates a debounced handler operator that delays execution until after a timeout.
 *
 * @param delay The delay in milliseconds
 * @returns A pipeable operator function
 *
 * @example
 * ```typescript
 * import { dom } from '@doeixd/events';
 * import { debounce } from '@doeixd/events/operators';
 *
 * const onInput = dom.input(textInput);
 * const onDebouncedInput = debounce(300)(onInput);
 *
 * onDebouncedInput((event) => {
 *   console.log('User stopped typing:', event.target.value);
 * });
 * ```
 */
export function debounce<T>(delay: number) {
  let timeoutId: number | null = null;

  return (source: Handler<T>): Handler<T> =>
    source(data => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        // Re-emit the data after the delay
        source(() => data);
      }, delay);
      return halt(); // Always halt - we'll re-emit manually
    });
}

/**
 * Creates a throttled handler operator that limits execution to once per interval.
 *
 * @param interval The minimum time in milliseconds between executions
 * @returns A pipeable operator function
 *
 * @example
 * ```typescript
 * import { dom } from '@doeixd/events';
 * import { throttle } from '@doeixd/events/operators';
 *
 * const onScroll = dom.scroll(window);
 * const onThrottledScroll = throttle(100)(onScroll);
 *
 * onThrottledScroll(() => {
 *   console.log('Scroll event (throttled)');
 * });
 * ```
 */
export function throttle<T>(interval: number) {
  let lastExecution = 0;

  return (source: Handler<T>): Handler<T> =>
    source(data => {
      const now = Date.now();
      if (now - lastExecution >= interval) {
        lastExecution = now;
        return data; // Pass through
      }
      return halt(); // Throttle - don't pass through
    });
}