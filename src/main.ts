import type {
EventDescriptor,
EventHandler,
EventWithTargets
} from './events-remix-types';

// Re-export SolidJS-style functions
export {
  createSubject as createSubjectSolid,
  createAsyncSubject,
  createSubjectStore,
  createTopic,
  createPartition,
  combineLatest,
  // Renamed originals
  createSubject as createSignal,
  createAsyncSubject as createAsyncSignal,
  createSubjectStore as createStore,
  createTopic as mergeHandlers,
  createPartition as splitHandler
} from './events-helpers';

/* -------------------------------------------------------------------------- */
/*                             Core Event System                               */
/* -------------------------------------------------------------------------- */

/**
 * Unique symbol used for halting event chains without throwing errors.
 * Used internally by the halt() function.
 */
const HaltSymbol: unique symbol = Symbol('halt');

import { DUMMY } from './dummy';
export { DUMMY };

/**
 * Halts the current event chain execution without throwing an error.
 * Useful for conditionally stopping event processing in handler chains.
 *
 * Note: halt() only affects the current handler chain. Other handlers
 * attached to the same event will continue to execute normally.
 *
 * @example
 * const [handler, emit] = createEvent<number>();
 * handler((n) => {
 *   if (n < 0) halt(); // Stop processing negative numbers
 *   console.log('Processing:', n);
 * });
 */
function halt(): never {
  throw HaltSymbol;
}



/**
 * Function to emit events with data of type T.
 */
export type Emitter<T> = (data?: T) => void;

/**
 * Higher-order function for handling events.
 * Pass a callback to listen to events of type T.
 * If the callback returns void, returns an unsubscribe function.
 * If it returns a value, returns a chained Handler for further processing.
 *
 * The callback receives the event data and optionally a meta object containing an AbortSignal
 * that is aborted when a new event is emitted before the current handler completes.
 */
export type Handler<T> = <R>(
  cb: (data: T, meta?: { signal: AbortSignal }) => R | Promise<R> | void | Promise<void>
) => R extends void | Promise<void> ? Unsubscribe : Handler<Awaited<R>>;

export type Unsubscribe = () => void;

/**
 * Creates an event system with a handler and emitter.
 * The handler can be used to attach listeners, and the emitter to send events.
 * @example
 * const [handler, emit] = createEvent<string>();
 * handler((message) => console.log('Received:', message));
 * emit('hello world'); // Logs: Received: hello world
 */
function createEvent<T>(defaultValue?: T, options?: { signal?: AbortSignal }): [Handler<T>, Emitter<T>] {
  const eventName = Math.random().toString(36).slice(2);
  const target = new EventTarget();

  // Auto-unsubscribe on abort
  const unsubscribers = new Set<() => void>();
  if (options?.signal) {
    options.signal.addEventListener('abort', () => {
      unsubscribers.forEach(unsub => unsub());
      unsubscribers.clear();
    }, { once: true });
  }

  // AbortController for re-entry safety
  let currentController: AbortController | null = null;

  const emit: Emitter<T> = (data?: T) => {
    if (data === undefined) data = defaultValue;

    // Abort previous async operations
    if (currentController) {
      currentController.abort();
    }

    // Create new controller for this emission
    currentController = new AbortController();

    target.dispatchEvent(new CustomEvent(eventName, {
      detail: { data, signal: currentController.signal }
    }));
  };



  const createHandler = <A>(eventTarget: EventTarget, name: string): Handler<A> =>
    ((cb: (data: A, meta?: { signal: AbortSignal }) => any) => {
      let testResult: any;
      try {
        testResult = cb(DUMMY as any);
      } catch (err) {
        if (err === HaltSymbol) testResult = {};
        else testResult = {};
      }

      if (testResult === undefined) {
      const listener = (ev: CustomEvent<{ data: A; signal: AbortSignal }>) => {
      const { data, signal } = ev.detail;
      // Check if callback expects meta parameter
      const result = cb.length > 1 ? cb(data, { signal }) : cb(data);
      if (result instanceof Promise) result.catch(console.error);
      };
      eventTarget.addEventListener(name, listener as any);
      const unsub = () => eventTarget.removeEventListener(name, listener as any);
        if (options?.signal) unsubscribers.add(unsub);
      return unsub;
    } else {
        const newName = Math.random().toString(36).slice(2);
        const newTarget = new EventTarget();
        const newHandler = createHandler<any>(newTarget, newName);

        const listener = (ev: CustomEvent<{ data: A; signal: AbortSignal }>) => {
          const { data, signal } = ev.detail;
          let result: any;
          try {
            // Check if callback expects meta parameter
            result = cb.length > 1 ? cb(data, { signal }) : cb(data);
          } catch (err) {
            if (err === HaltSymbol) return;
            throw err;
          }

          if (result instanceof Promise) {
            result
              .then((res) => {
                if (res !== undefined) {
                  newTarget.dispatchEvent(new CustomEvent(newName, { detail: { data: res, signal } }));
                }
              })
              .catch((err) => {
                if (err === HaltSymbol) return;
                throw err;
              });
          } else if (result !== undefined) {
            newTarget.dispatchEvent(new CustomEvent(newName, { detail: { data: result, signal } }));
          }
        };
        eventTarget.addEventListener(name, listener as any);
        return newHandler;
      }
    }) as Handler<A>;

  return [createHandler(target, eventName), emit];
}

/* -------------------------------------------------------------------------- */
/*                         Remix-Compatible Bridge Helpers                     */
/* -------------------------------------------------------------------------- */

/**
 * Wrap Handler<T> as an EventDescriptor for direct use with Remix `events()`.
 */
function toEventDescriptor<T>(
  handler: Handler<T>,
  type: string,
  signal?: AbortSignal
): EventDescriptor {
  return {
  type,
  handler: ((ev: EventWithTargets<any>, _evtSignal: AbortSignal) => {
  // @ts-ignore
  const unsub = handler((ev.detail as T), { signal: _evtSignal });
  if (signal) {
  // @ts-ignore
  signal.addEventListener('abort', unsub, { once: true });
  // @ts-ignore
  if (signal.aborted) unsub();
  }
  return unsub;
  }) as EventHandler
  };
}

/**
 * Wrap Subject<T> as an EventDescriptor.
 */
function subjectToEventDescriptor<T>(
subject: Subject<T>,
type: string,
_signal?: AbortSignal
): EventDescriptor {
  return {
    type,
    handler: ((ev: EventWithTargets<any>, _evtSignal: AbortSignal) => {
      try {
        subject(ev.detail as T);
      } catch (err) {
        if (err === HaltSymbol) return;
        throw err;
      }
    }) as EventHandler
  };
}

/**
 * Convert DOM element + event into a Handler<T> with AbortSignal support.
 */
function fromDomEvent<E extends Element, K extends keyof HTMLElementEventMap>(
  el: E,
  eventName: K,
  opts?: { signal?: AbortSignal; capture?: boolean; passive?: boolean }
): Handler<HTMLElementEventMap[K]> {
  return ((cb: (ev: HTMLElementEventMap[K], meta?: { signal: AbortSignal }) => any) => {
    const listener = (ev: Event) => {
      try {
        // Check if callback expects meta parameter
        const result = cb.length > 1 ? cb(ev as any, { signal: new AbortController().signal }) : cb(ev as any);
        if (result instanceof Promise) result.catch(console.error);
      } catch (err) {
        if (err === HaltSymbol) return;
        throw err;
      }
    };
    el.addEventListener(eventName as string, listener as any, opts as any);
    const unsub = () => el.removeEventListener(eventName as string, listener as any, opts as any);
    if (opts?.signal) {
      // @ts-ignore
      if (opts.signal.aborted) unsub();
      else opts.signal.addEventListener('abort', unsub, { once: true });
    }
    return unsub;
  }) as Handler<any>;
}

/* -------------------------------------------------------------------------- */
/*                              Subjects / State                               */
/* -------------------------------------------------------------------------- */

export interface Subject<S> {
  (value?: S): S;
  subscribe(cb: (value: S) => void): Unsubscribe;
  dispose?: () => void;
  _notifyImmediate: (value: S) => void; // Internal method for batching
}

// Global batching state
let batchDepth = 0;
let pendingNotifications = new Map<Subject<any>, any>();

/**
 * Executes a function with batched updates. All subject notifications are deferred
 * until the end of the microtask, preventing redundant computations.
 * @param fn Function to execute with batching
 * @example
 * batch(() => {
 *   subject1('value1');
 *   subject2('value2'); // Notifications happen once at end
 * });
 */
function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      // Schedule flush at end of microtask
      queueMicrotask(() => {
        pendingNotifications.forEach((value, subject) => {
          subject._notifyImmediate(value);
        });
        pendingNotifications.clear();
      });
    }
  }
}

/**
 * Creates a reactive subject that can hold a value and notify subscribers.
 * Call subject() to get the current value, subject(newValue) to set and notify.
 * @param initial Initial value for the subject
 * @param options Configuration options
 * @param options.batch Whether to batch notifications (default: false)
 * @example
 * const count = createSubject(0);
 * count.subscribe((value) => console.log('Count:', value));
 * count(5); // Logs: Count: 5
 * console.log(count()); // 5
 *
 * // Batched subject
 * const batched = createSubject(0, { batch: true });
 */
function createSubject<T>(initial?: T, options?: { batch?: boolean }): Subject<T> {
  let current = initial;
  const subscribers = new Set<(value: T) => void>();
  const isBatched = options?.batch ?? false;

  const notify = (value: T) => {
    if (batchDepth > 0) {
      // In manual batch, always queue
      pendingNotifications.set(subject, value);
    } else if (isBatched) {
      // For batched subjects, queue and flush immediately
      pendingNotifications.set(subject, value);
      queueMicrotask(() => {
        pendingNotifications.forEach((val, subj) => {
          subj._notifyImmediate(val);
        });
        pendingNotifications.clear();
      });
    } else {
      // Immediate notification
      subscribers.forEach(cb => cb(value));
    }
  };

  const subject = ((value?: T) => {
    if (value === undefined) {
      return current;
    } else {
      current = value;
      notify(current as T);
      return current;
    }
  }) as Subject<T>;

  // Internal method for immediate notification (used by batch flush)
  subject._notifyImmediate = (value: T) => {
    subscribers.forEach(cb => cb(value));
  };

  subject.subscribe = (cb: (value: T) => void) => {
    subscribers.add(cb);
    if (current !== undefined) cb(current as T); // Emit current value immediately on subscribe if defined
    return () => subscribers.delete(cb);
  };

  subject.dispose = () => {
    subscribers.clear();
    pendingNotifications.delete(subject);
  };

  return subject;
}

/* -------------------------------------------------------------------------- */
/*                           Exports                                           */
/* -------------------------------------------------------------------------- */

export {
  HaltSymbol,
  halt,
  createEvent,
  toEventDescriptor,
  subjectToEventDescriptor,
  fromDomEvent,
  createSubject,
  batch
};