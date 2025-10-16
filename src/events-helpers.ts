/**
 * Events Helpers Module
 *
 * Provides SolidJS-style helper primitives and utilities on top of the core event system.
 * Includes subjects, async subjects, stores, topic merging, and partitioning.
 *
 * @example
 * import { createSubject, createAsyncSubject, createTopic } from './events-helpers';
 *
 * // Create a reactive subject
 * const count = createSubject(0, incrementHandler, resetHandler);
 * count.subscribe((value) => console.log('Count:', value));
 *
 * // Create an async subject
 * const data = createAsyncSubject(() => fetchData(), updateHandler);
 */

import { Handler, createSubject as createSubj, type Subject, type Unsubscribe, DUMMY } from './main';

/* -------------------------------------------------------------------------- */
/*                             Renamed Existing                               */
/* -------------------------------------------------------------------------- */

export { createSubject as createSignal };
export { createAsyncSubject as createAsyncSignal };
export { createSubjectStore as createStore };
export { createTopic as mergeHandlers };
export { createPartition as splitHandler };

/* -------------------------------------------------------------------------- */
/*                               New SolidJS-style                             */
/* -------------------------------------------------------------------------- */

/**
 * Creates a subject derived from event handlers, similar to SolidJS createSubject.
 * @param initial Initial value or signal function.
 * @param handlers Event handlers that return new values or update functions.
 */
export function createSubject<T>(
initial: T | (() => T),
...handlers: Handler<any>[]
): Subject<T> {
const startingValue = typeof initial === 'function' ? (initial as () => T)() : initial;
const subject = createSubj<T>(startingValue);

let current = startingValue;

handlers.forEach((h) =>
h((update: any) => {
if (update === DUMMY) return;
if (typeof update === 'function') {
  try {
    current = update(current);
  } catch {}
} else {
current = update;
}
 subject(current);
 })
 );

return subject;
}

/**
 * Creates an async subject that loads from an async source and applies updates.
 * @param asyncSource Function returning a promise for initial value.
 * @param handlers Handlers that apply updates.
 */
export function createAsyncSubject<T>(
  asyncSource: () => Promise<T>,
  ...handlers: Handler<any>[]
): Subject<T> {
  const subject = createSubj<T>();

  let current: T | undefined;

  // Initial async load
  async function load() {
    try {
      const value = await asyncSource();
      current = value;
      subject(value);
    } catch (err) {
      console.error('createAsyncSubject error', err);
    }
  }

  load();

  // Wire handlers to transform current value
  handlers.forEach((h) =>
    h((update: any) => {
      if (current !== undefined) {
        if (typeof update === 'function') {
          current = update(current);
        } else {
          current = update;
        }
        subject(current);
      }
    })
  );

  return subject;
}

/**
 * Creates a subject store for direct mutation, similar to SolidJS stores.
 * @param initial Initial value or signal.
 * @param handlers Handlers that mutate the state.
 */
export function createSubjectStore<T>(
  initial: T | (() => T),
  ...handlers: Handler<any>[]
): Subject<T> {
  const startingValue = typeof initial === 'function' ? (initial as () => T)() : initial;
  const subject = createSubj<T>(startingValue);

  let current = startingValue;

  handlers.forEach((h) =>
    h((updater: any) => {
      updater(current);
      subject(current);
    })
  );

  return subject;
}

/**
 * Merges multiple event handlers into one.
 */
export function createTopic<T extends any[]>(
  ...handlers: Handler<T[number]>[]
): Handler<T[number]> {
  return ((cb) => {
    const unsubs: Unsubscribe[] = [];
    for (const h of handlers) {
      // @ts-ignore
      unsubs.push(h(cb));
    }
    return () => unsubs.forEach((u) => u());
  }) as Handler<T[number]>;
}

/**
 * Splits an event handler based on a predicate.
 */
export function createPartition<T>(
  source: Handler<T>,
  predicate: (value: T) => boolean
): [Handler<T>, Handler<T>] {
  const trueHandler: Handler<T> = ((cb) => source((v) => {
    if (typeof v === 'symbol') return;
    if (predicate(v)) return cb(v);
  })) as Handler<T>;

  const falseHandler: Handler<T> = ((cb) => source((v) => {
    if (typeof v === 'symbol') return;
    if (!predicate(v)) return cb(v);
  })) as Handler<T>;

  return [trueHandler, falseHandler];
}







/* -------------------------------------------------------------------------- */
/*                                Utilities                                    */
/* -------------------------------------------------------------------------- */

/**
* Combines multiple handlers into one that emits arrays of latest values.
* Emits when all handlers have emitted at least once.
 * @example
 * const [h1, e1] = createEvent<string>();
 * const [h2, e2] = createEvent<number>();
 * const combined = combineLatest(h1, h2);
 * combined(([msg, num]) => console.log(msg, num));
 * e1('hello'); e2(42); // Logs: hello 42
 */
export function combineLatest<T>(
  ...handlers: Handler<T>[]
): Handler<T[]> {
  const values: Partial<T>[] = [];
  return ((cb) => {
    const unsubs = handlers.map((h, i) =>
      h((v) => {
        values[i] = v;
        if (values.every((val) => val !== undefined)) cb([...values] as T[]);
      })
    );
    return () => unsubs.forEach((u) => u());
  }) as Handler<T[]>;
}

/* -------------------------------------------------------------------------- */
/*                                Exports                                      */
/* -------------------------------------------------------------------------- */

export default {
  createTopic,
  createPartition,
  createAsyncSubject,
  createSubjectStore,
  combineLatest
};
