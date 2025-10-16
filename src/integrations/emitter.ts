/**
 * @module integrations/emitter
 * Utilities for bridging the classic EventEmitter pattern (e.g., Node.js, eventemitter3)
 * with the reactive, functional patterns of @doeixd/events.
 */

import { createEvent, Handler, Unsubscribe } from '../main';

/**
 * A minimal, generic interface for an object that follows the EventEmitter pattern.
 * This ensures compatibility with Node.js's EventEmitter, eventemitter3, and other popular implementations.
 */
export interface EventEmitterLike {
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
  emit(event: string | symbol, ...args: any[]): boolean;
}

/**
 * Creates a reactive `@doeixd/events` Handler from a specific event on an EventEmitter.
 *
 * This function acts as a bridge, allowing you to consume events from legacy or
 * third-party event emitters and process them through a modern, declarative pipeline.
 *
 * The underlying listener is attached to the emitter immediately. Use the `signal`
 * option for automatic cleanup to prevent memory leaks.
 *
 * @param emitter The EventEmitter instance to listen to.
 * @param eventName The name of the event to subscribe to.
 * @param options Optional configuration.
 * @param options.signal An AbortSignal to automatically remove the listener from the emitter.
 * @returns A chainable `Handler` that emits payloads from the EventEmitter event.
 *
 * @example
 * import { fromEmitterEvent } from './integrations/emitter';
 * import { legacyServiceEmitter } from './legacyService';
 *
 * // Create a handler that listens to the 'data' event
 * const onData = fromEmitterEvent<{ id: number; value: string }>(legacyServiceEmitter, 'data');
 *
 * // Now use the powerful chaining API of @doeixd/events
 * const onValidData = onData(payload => payload.value.length > 0 ? payload : halt());
 *
 * onValidData(data => {
 *   console.log('Received valid data:', data);
 * });
 */
export function fromEmitterEvent<T>(
  emitter: EventEmitterLike,
  eventName: string | symbol,
  options: { signal?: AbortSignal } = {}
): Handler<T> {
  const [handler, emit] = createEvent<T>(undefined, { signal: options.signal });

  const listener = (payload: T) => {
    emit(payload);
  };

  emitter.on(eventName, listener);

  // When the signal is aborted, clean up the listener from the source emitter
  options.signal?.addEventListener('abort', () => {
    emitter.off(eventName, listener);
  });

  return handler;
}

/**
 * Subscribes a Handler to an EventEmitter, causing the emitter to emit an event
 * whenever the handler's pipeline completes successfully.
 *
 * This is useful for driving legacy systems with events originating from your
 * reactive `@doeixd/events` logic.
 *
 * @param emitter The EventEmitter instance to emit events on.
 * @param eventName The name of the event to emit.
 * @param source The source `Handler` whose payloads will be emitted.
 * @returns An `Unsubscribe` function to tear down the connection.
 *
 * @example
 * import { toEmitterEvent } from './integrations/emitter';
 * import { createEvent } from '@doeixd/events';
 * import { commandEmitter } from './commandBus';
 *
 * const [onUserSubmit, emitUserSubmit] = createEvent<string>();
 *
 * // Pipe successful user submissions to the legacy command bus
 * const unsubscribe = toEmitterEvent(commandEmitter, 'dispatch', onUserSubmit);
 *
 * emitUserSubmit('update-profile'); // commandEmitter will emit 'dispatch' with the payload
 *
 * // Later...
 * unsubscribe();
 */
export function toEmitterEvent<T>(
  emitter: EventEmitterLike,
  eventName: string | symbol,
  source: Handler<T>
): Unsubscribe {
  return source(payload => {
    emitter.emit(eventName, payload);
  });
}

/**
 * A type representing a reactive wrapper around an EventEmitter.
 * For each key in the provided event map `T`, it exposes a chainable `Handler`.
 */
export type AdaptedEmitter<T extends Record<string | symbol, any>> = {
  [K in keyof T]: Handler<T[K]>;
};

/**
 * Adapts an entire EventEmitter instance into a type-safe, reactive interface.
 *
 * This is the most powerful utility. It takes an emitter and an optional AbortSignal
 * and returns a Proxy object. Accessing a property on this object corresponding
 * to an event name will return a memoized `Handler` for that event.
 *
 * This allows you to interact with a legacy emitter as if it were a native
 * `@doeixd/events` object, with full type-safety and autocompletion if you
 * provide an event map type.
 *
 * @param emitter The EventEmitter instance to adapt.
 * @param options Optional configuration.
 * @param options.signal An AbortSignal to clean up all underlying listeners when aborted.
 * @returns A proxy object where each property is a `Handler` for the corresponding event name.
 *
 * @example
 * // 1. Define the event map for your legacy emitter
 * interface LegacyServiceEvents {
 *   'user:login': { userId: string; timestamp: number };
 *   'user:logout': { userId: string };
 *   'data:update': { payload: unknown };
 *   'error': Error;
 * }
 *
 * // 2. Adapt the emitter
 * const reactiveService = adaptEmitter<LegacyServiceEvents>(legacyServiceEmitter);
 *
 * // 3. Use the fully typed, reactive API!
 * reactiveService['user:login'](loginEvent => {
 *   // loginEvent is fully typed as { userId: string; timestamp: number }
 *   console.log(`User ${loginEvent.userId} logged in.`);
 * });
 *
 * reactiveService.error(err => {
 *   console.error('Legacy service error:', err.message);
 * });
 */
export function adaptEmitter<T extends Record<string | symbol, any>>(
  emitter: EventEmitterLike,
  options: { signal?: AbortSignal } = {}
): AdaptedEmitter<T> {
  const handlerCache = new Map<string | symbol, Handler<any>>();

  // Use a Proxy to dynamically create handlers on property access
  return new Proxy({} as any, {
    get(_target, prop, _receiver) {
      if (handlerCache.has(prop)) {
        return handlerCache.get(prop);
      }

      // Create a new handler for this event name using our bridge function
      const newHandler = fromEmitterEvent(emitter, prop, {
        signal: options.signal,
      });

      // Cache it for subsequent accesses
      handlerCache.set(prop, newHandler);

      return newHandler;
    },
  });
}