/**
 * @module operators
 * Pipeable handler operators for creating reusable, stateful interactions.
 *
 * Handler operators are functions that take a Handler and return a new Handler,
 * enabling composable, reusable event logic similar to RxJS operators.
 */

import { halt, Handler, DUMMY, Unsubscribe } from './main';

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

/**
 * Creates a map handler operator that transforms event data using a mapping function.
 *
 * @param transform Function to transform the event data. Can be async and receives optional AbortSignal.
 * @returns A pipeable operator function
 *
 * @example
 * ```typescript
 * import { createEvent, map } from '@doeixd/events';
 *
 * const [onNumber, emitNumber] = createEvent<number>();
 * const doubledNumbers = map((n: number) => n * 2)(onNumber);
 *
 * doubledNumbers((result) => console.log('Doubled:', result));
 * emitNumber(5); // Logs: Doubled: 10
 * ```
 *
 * @example Async transformation
 * ```typescript
 * const validatedEmails = map(async (email: string, meta) => {
 *   if (meta?.signal.aborted) return;
 *   const isValid = await validateEmail(email);
 *   return { email, isValid };
 * })(onEmailInput);
 * ```
 */
export function map<T, R>(
  transform: (data: T) => R | Promise<R>
) {
  return (source: Handler<T>): Handler<R> =>
    (callback) => source((data, meta) => {
      if (data === DUMMY) return callback(data as any);

      try {
        const result = transform(data);
        if (result instanceof Promise) {
          result.then((transformed) => callback(transformed))
                .catch((error) => {
                  // Handle async transformation errors by halting
                  console.error('Map transform error:', error);
                  // For terminal errors in async transforms, we can't halt
                  // since we're already in the callback. Log and continue.
                });
        } else {
          callback(result);
        }
      } catch (error) {
        // Handle sync transformation errors by halting
        console.error('Map transform error:', error);
        // Can't halt here since we're in the callback, so we skip calling callback
      }
    });
}

/**
 * Creates a filter handler operator that conditionally passes through events based on a predicate.
 *
 * @param predicate Function that returns true to pass the event through, false to halt. Can be async.
 * @returns A pipeable operator function
 *
 * @example
 * ```typescript
 * import { createEvent, filter } from '@doeixd/events';
 *
 * const [onNumber, emitNumber] = createEvent<number>();
 * const evenNumbers = filter((n: number) => n % 2 === 0)(onNumber);
 *
 * evenNumbers((result) => console.log('Even:', result));
 * emitNumber(1); // No output
 * emitNumber(2); // Logs: Even: 2
 * ```
 *
 * @example Async filtering
 * ```typescript
 * const validEmails = filter(async (email: string, meta) => {
 *   if (meta?.signal.aborted) return false;
 *   return await isValidEmail(email);
 * })(onEmailInput);
 * ```
 */
export function filter<T>(
  predicate: (data: T, meta?: { signal: AbortSignal }) => boolean | Promise<boolean>
) {
  return createOperator<T>((data, emit, halt) => {
    try {
      const result = predicate(data);
      if (result instanceof Promise) {
        result.then((passed) => {
          if (passed) {
            emit(data);
          } else {
            halt();
          }
        }).catch((error) => {
          // Handle async predicate errors by halting
          console.error('Filter predicate error:', error);
          halt();
        });
      } else {
        if (result) {
          emit(data);
        } else {
          halt();
        }
      }
    } catch (error) {
      // Handle sync predicate errors by halting
      console.error('Filter predicate error:', error);
      halt();
    }
  });
}

/**
 * Creates a reduce handler operator that accumulates values over time.
 *
 * @param accumulator Function that combines accumulated value with new data. Can be async.
 * @param initial The initial accumulated value
 * @param options Optional AbortSignal for cleanup
 * @returns A pipeable operator function
 *
 * @example
 * ```typescript
 * import { createEvent, reduce } from '@doeixd/events';
 *
 * const [onPurchase, emitPurchase] = createEvent<number>();
 * const runningTotal = reduce((total: number, amount: number) => total + amount, 0)(onPurchase);
 *
 * runningTotal((total) => console.log('Total spent:', total));
 * emitPurchase(10); // Logs: Total spent: 10
 * emitPurchase(5);  // Logs: Total spent: 15
 * emitPurchase(8);  // Logs: Total spent: 23
 * ```
 *
 * @example With cleanup
 * ```typescript
 * const controller = new AbortController();
 * const runningTotal = reduce(
 *   (total, amount) => total + amount,
 *   0,
 *   { signal: controller.signal }
 * )(onPurchase);
 *
 * // Later: controller.abort(); // Resets accumulation
 * ```
 */
export function reduce<T, R>(
  accumulator: (acc: R, data: T) => R | Promise<R>,
  initial: R,
  options?: { signal?: AbortSignal }
) {
  let accumulated = initial;

  // Reset state on abort signal
  if (options?.signal) {
    options.signal.addEventListener('abort', () => {
      accumulated = initial;
    }, { once: true });
  }

  return (source: Handler<T>): Handler<R> =>
    (callback) => source((data, meta) => {
      if (data === DUMMY) return callback(data as any);

      try {
        const result = accumulator(accumulated, data);
        if (result instanceof Promise) {
          result.then((newAcc) => {
            accumulated = newAcc;
            callback(accumulated);
          }).catch((error) => {
            // Handle async accumulator errors
            console.error('Reduce accumulator error:', error);
          });
        } else {
          accumulated = result;
          callback(accumulated);
        }
      } catch (error) {
        // Handle sync accumulator errors
        console.error('Reduce accumulator error:', error);
        // Can't halt here since we're in the callback
      }
    });
}

/**
 * Creates a sink handler operator that consumes events without further chaining.
 * This is a terminal operator that returns an Unsubscribe function instead of a Handler.
 *
 * @param consumer Function that consumes the event data. Can be async.
 * @param options Optional AbortSignal for cleanup
 * @returns A function that takes a handler and returns an unsubscribe function
 *
 * @example
 * ```typescript
 * import { createEvent, sink } from '@doeixd/events';
 *
 * const [onMessage, emitMessage] = createEvent<string>();
 * const logMessages = sink((message: string) => console.log('Received:', message))(onMessage);
 *
 * emitMessage('Hello!'); // Logs: Received: Hello!
 *
 * // Cleanup when done
 * logMessages(); // Unsubscribes
 * ```
 *
 * @example Async consumption
 * ```typescript
 * const saveToDatabase = sink(async (data, meta) => {
 *   if (meta?.signal.aborted) return;
 *   await api.save(data);
 * })(onData);
 * ```
 */
export function sink<T>(
  consumer: (data: T, meta?: { signal: AbortSignal }) => void | Promise<void>,
  options?: { signal?: AbortSignal }
) {
  return (source: Handler<T>): Unsubscribe => {
    let unsubscribed = false;

    const unsubscribe = source(async (data, meta) => {
      if (unsubscribed || data === DUMMY) return;

      try {
        await consumer(data, meta);
      } catch (error) {
        // Log errors in terminal operators but don't throw
        console.error('Sink consumer error:', error);
      }
    });

    // Handle abort signal for cleanup
    if (options?.signal) {
      const abortHandler = () => {
        unsubscribed = true;
        unsubscribe();
      };
      options.signal.addEventListener('abort', abortHandler, { once: true });
    }

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  };
}