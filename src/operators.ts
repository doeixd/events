/**
 * @module operators
 * Pipeable handler operators for creating reusable, stateful interactions.
 *
 * Handler operators are functions that take a Handler and return a new Handler,
 * enabling composable, reusable event logic similar to RxJS operators.
 */

import { halt, Handler, DUMMY } from './main';

/**
 * Helper for creating custom handler operators.
 *
 * @param process Function that processes each event. Call `emit(result)` to pass data through,
 * or `haltFn()` to stop the event chain.
 * @returns A pipeable operator function
 *
 * @example
 * ```typescript
 * import { createOperator } from '@doeixd/events/operators';
 *
 * export const filter = <T>(predicate: (data: T) => boolean) =>
 *   createOperator<T>((data, emit, halt) => {
 *     if (predicate(data)) emit(data);
 *     else halt();
 *   });
 * ```
 */
export function createOperator<T>(
  process: (data: T, emit: (result: T) => void, haltFn: () => never) => void
) {
  return (source: Handler<T>): Handler<T> =>
    (callback) => source((data) => {
      if (data === DUMMY) return callback(data);

      process(data, callback, halt);
    });
}

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

  return createOperator<T>((event, emit, halt) => {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
      emit(event); // Pass through on double click
    } else {
      timer = window.setTimeout(() => (timer = 0), timeout);
      halt(); // Halt on first click
    }
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

  return createOperator<T>((data, emit, halt) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
      timeoutId = null;
      emit(data);
    }, delay);
    halt(); // Halt immediate execution
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

  return createOperator<T>((data, emit, halt) => {
    const now = Date.now();
    if (now - lastExecution >= interval) {
      lastExecution = now;
      emit(data); // Pass through
    } else {
      halt(); // Throttle - don't pass through
    }
  });
}