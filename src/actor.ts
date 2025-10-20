import { createSubject, Subject, Emitter, createEvent } from './index';
import { createSubscriptionStack} from './stack';

// =========================================
// Core Actor Types
// =========================================

/**
 * A map of behavior names to their corresponding handler functions.
 * This is the internal representation of an actor's capabilities.
 * @hidden
 */
type BehaviorMap = Record<string, (...args: any[]) => any>;

/**
 * A generic interface representing any object with a `subscribe` method,
 * such as an Actor or a Subject. Used by the `select` utility.
 */
interface Subscribable<T> {
  subscribe: (callback: (value: T) => void) => () => void;
}

/**
 * A highly advanced mapped type that transforms a user-provided behavior definition
 * into the final, public-facing actor methods. It intelligently infers whether a
 * method should be a "cast" (returning `void` for 'direct' mode, or `Promise<void>` for
 * 'queued' mode) or a "call" (returning `Promise<Reply>`), based on its
 * return signature.
 * @template TState The type of the actor's state.
 * @template TBehavior The user-defined behavior map.
 * @template TMode The actor's execution mode, which affects the return types.
 * @hidden
 */
type MethodsFromBehavior<
  TState extends object,
  TBehavior extends BehaviorMap,
  TMode extends 'direct' | 'queued'
> = {
  // Maps each key (method name) from the behavior map...
  [K in keyof TBehavior]: (
    //...to a function whose parameters are inferred from the user's handler.
    // In queued mode, skip the initial `state` argument. In direct mode, use all parameters.
    ...args: TMode extends 'queued'
      ? Parameters<TBehavior[K]> extends [any, ...infer P] ? P : []
      : Parameters<TBehavior[K]>
  ) => // The return type depends on the mode and the handler's own return type.
  TMode extends 'queued'
    ? ReturnType<TBehavior[K]> extends TState | void // Is the handler a state update or fire-and-forget?
      ? Promise<void> // If so, it's a "cast" in queued mode, returning a Promise that resolves when the action is done.
      : Promise<Awaited<ReturnType<TBehavior[K]>>> // Otherwise, it's a "call", returning a Promise with the reply.
    : void; // In 'direct' mode, all methods are fire-and-forget and return void.
};

/**
 * The public interface for an Actor.
 *
 * It combines a state accessor function `()`, a `subscribe` method for reactive updates,
 * a `dispose` method for cleanup, and all the custom methods derived from its behavior.
 * This unified interface applies to actors created in both `'direct'` and `'queued'` modes.
 *
 * @template TContext The shape of the actor's internal state object.
 * @template TBehavior The map of behaviors defining the actor's methods.
 * @template TMode The execution mode (`'direct'` or `'queued'`).
 */
export type Actor<
  TContext extends object,
  TBehavior extends BehaviorMap,
  TMode extends 'direct' | 'queued' = 'direct'
> = {
  /**
   * Returns a snapshot of the actor's current state (context).
   * Note: This is a shallow clone to prevent accidental external mutation.
   * @returns {TContext} The current state object.
   */
  (): TContext;

  /**
   * Subscribes to changes in the actor's context.
   * The callback is invoked whenever the state is updated.
   * @param {(context: TContext) => void} callback The function to call with the new state.
   * @returns {() => void} An unsubscribe function to stop listening for changes.
   */
  subscribe: Subject<TContext>['subscribe'];

  /**
   * Shuts down the actor, stops it from processing any further actions,
   * and cleans up all internal subscriptions.
   */
  dispose: () => void;
} & MethodsFromBehavior<TContext, TBehavior, TMode>;

/**
 * An optional function that runs as a side effect after a state change.
 * Useful for logging, analytics, or triggering external actions without cluttering
 * the core state logic.
 *
 * @param {TContext} newContext The new state of the actor after the update.
 * @param {TContext} oldContext The state of the actor before the update.
 */
export type ActorEffect<TContext> = (
  newContext: TContext,
  oldContext: TContext,
) => void;

/**
 * Configuration options for creating an actor, allowing customization of its
 * execution model and side effects.
 */
export type ActorOptions<TContext> = {
  /**
   * Defines the execution model of the actor. This is the most critical choice
   * when creating an actor, as it determines its concurrency guarantees.
   *
   * - `'direct'`: **(Default)** Synchronous and mutable. Method calls immediately
   *   execute their logic. The state object (`context`) can be directly mutated.
   *   This mode is simple and fast, making it ideal for self-contained UI component
   *   state where operations are synchronous. **This maintains the original `createActor` behavior.**
   *
   * - `'queued'`: Asynchronous and immutable. Method calls are treated as messages
   *   added to a queue. The actor processes one message at a time, ensuring
   *   sequential execution. This model **guarantees no race conditions**, even with
   *   complex async logic. Handlers must return a new state object instead of
   *   mutating the old one. This mode is essential for managing shared resources,
   *   handling concurrent API calls, or any scenario requiring robust async state safety.
   */
  mode?: 'direct' | 'queued';

  /** An optional function for handling side effects. */
  effects?: ActorEffect<TContext>;
};

// =========================================
// `createActor` Overloads & Implementation
// =========================================

/**
 * Creates a new, type-safe actor for state management and concurrency.
 *
 * An actor encapsulates state (`context`) and behavior, providing a clean,
 * discoverable, and fully type-safe API for state interaction. This function
 * supports two powerful execution modes: `'direct'` (for simple, synchronous UI state)
 * and `'queued'` (for robust, concurrent state management).
 *
 * @template TContext The type of the actor's internal state object.
 * @template TBehavior The type of the object defining the actor's behavior.
 *
 * @param initialContext The starting state for the actor.
 * @param behavior A map of methods that define the actor's public API and logic.
 * @param options Configuration for mode (`'queued'`) and side effects.
 */
export function createActor<
  TContext extends object,
  TBehavior extends BehaviorMap
>(
  initialContext: TContext,
  behavior: TBehavior,
  options: ActorOptions<TContext> & { mode: 'queued' }
): Actor<TContext, TBehavior, 'queued'>;

/**
 * Creates a new, type-safe actor. (Backward-compatible API).
 *
 * This signature maintains compatibility with the original `createActor` API,
 * which uses a setup function and operates in `'direct'` (synchronous, mutable) mode.
 *
 * @param initialContext The starting state for the actor.
 * @param setup A function that receives the actor's live, mutable context and returns an object of emitter functions.
 * @param options Configuration for side effects. The mode is implicitly `'direct'`.
 */
export function createActor<
  TContext extends object,
  TEmitters extends Record<string, Emitter<any>>
>(
  initialContext: TContext,
  setup: (context: TContext) => TEmitters,
  options?: Omit<ActorOptions<TContext>, 'mode'>
): Actor<TContext, TEmitters, 'direct'>;

/**
 * Main `createActor` implementation.
 * @hidden
 */
export function createActor(
  initialContext: object,
  behaviorOrSetup: BehaviorMap | ((context: any) => Record<string, Emitter<any>>),
  options: ActorOptions<any> = {},
): Actor<any, any, any> {
  const { mode = 'direct', effects } = options;

  // Handle the backward-compatible setup function API.
  if (typeof behaviorOrSetup === 'function') {
    if (mode === 'queued') {
      throw new Error("The setup function API is only compatible with `mode: 'direct'`. To use `mode: 'queued'`, please provide a behavior map object.");
    }
    return createDirectActor(initialContext, behaviorOrSetup, effects);
  }

  // Handle the new behavior map API.
  if (mode === 'queued') {
    return createQueuedActor(initialContext, behaviorOrSetup, effects);
  }
  
  // Guide users away from a confusing API combination.
  throw new Error("The behavior map API is designed for `mode: 'queued'`. For `mode: 'direct'`, please use the setup function API for clarity and to enable direct mutation.");
}

// =========================================
// Internal Actor Implementations
// =========================================

/**
 * Creates a `'direct'` mode actor for synchronous, mutable state management.
 * This is the original `createActor` implementation.
 * @hidden
 */
function createDirectActor<
  TContext extends object,
  TEmitters extends Record<string, Emitter<any>>
>(
  initialContext: TContext,
  setup: (context: TContext) => TEmitters,
  effects?: ActorEffect<TContext>,
): Actor<TContext, any, 'direct'> {
  const internalState = { ...initialContext };
  const contextSubject = createSubject(internalState);
  const stack = createSubscriptionStack();

  const notify = () => {
    contextSubject({ ...internalState });
  };
  
  const proxyHandler: ProxyHandler<any> = {
    get: (target, prop, receiver) => {
      const value = Reflect.get(target, prop, receiver);
      return (typeof value === 'object' && value !== null) ? new Proxy(value, proxyHandler) : value;
    },
    set: (target, prop, value, receiver) => {
      if (Reflect.get(target, prop, receiver) === value) return true;
      const success = Reflect.set(target, prop, value, receiver);
      if (success) notify();
      return success;
    },
    deleteProperty: (target, prop) => {
      const success = Reflect.deleteProperty(target, prop);
      if (success) notify();
      return success;
    },
  };

  const reactiveContext = new Proxy(internalState, proxyHandler);

  if (effects) {
    let oldContext = { ...initialContext };
    stack.defer(contextSubject.subscribe(newContext => {
      effects({ ...newContext }, { ...oldContext });
      oldContext = { ...newContext };
    }));
  }

  const emitters = setup(reactiveContext);
  const actor = (() => ({ ...contextSubject() })) as Actor<TContext, any, 'direct'>;
  
  actor.subscribe = contextSubject.subscribe;
  actor.dispose = () => stack.dispose();
  Object.assign(actor, emitters);

  return Object.freeze(actor);
}


/**
 * Creates a `'queued'` mode actor for asynchronous, immutable, and sequentially processed state.
 * @hidden
 */
function createQueuedActor<
  TContext extends object,
  TBehavior extends BehaviorMap
>(
  initialContext: TContext,
  behavior: TBehavior,
  effects?: ActorEffect<TContext>
): Actor<TContext, TBehavior, 'queued'> {
  let currentState = initialContext;
  const stateSubject = createSubject(currentState);
  let running = true;
  
  const [onMessage, emitMessage] = createEvent<{
    fn: Function;
    args: any[];
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }>();

  // The actor's main processing loop, which ensures one-at-a-time execution.
  const unsub = onMessage(async ({ fn, args, resolve, reject }) => {
    if (!running) return;
    try {
      const oldState = currentState;
      const result = await fn(currentState, ...args);

      // Distinguish between a "call" (returns a value) and a "cast" (returns a new state).
      if (result !== undefined && (typeof result !== 'object' || result === null || Object.getPrototypeOf(result) !== Object.prototype)) {
        // It's a "call": the result is the reply, and the state does not change.
        resolve(result);
      } else {
        // It's a "cast": the result is the new state (or void if no change).
        if (result !== undefined) {
          currentState = result;
          stateSubject(currentState); // Notify subscribers of the state change.
          if (effects) {
            effects({ ...currentState }, { ...oldState });
          }
        }
        resolve(undefined as any); // Resolve with no value for casts.
      }
    } catch (error) {
      console.error(`[createActor] Actor crashed in queued mode:`, error);
      reject(error);
      dispose(); // Halt the actor on an unhandled error.
    }
  });

  const dispose = () => {
    if (!running) return;
    running = false;
    unsub();
    stateSubject.dispose?.();
  };

  const methods = Object.entries(behavior).reduce((acc, [key, fn]) => {
    acc[key] = (...args: any[]) => {
      if (!running) {
        return Promise.reject(new Error("Actor has been disposed."));
      }
      // Wrap the message dispatch in a Promise for the caller.
      return new Promise((resolve, reject) => {
        emitMessage({ fn, args, resolve, reject });
      });
    };
    return acc;
  }, {} as any);

  const actor = (() => ({ ...currentState })) as Actor<TContext, TBehavior, 'queued'>;
  
  actor.subscribe = stateSubject.subscribe;
  actor.dispose = dispose;
  Object.assign(actor, methods);

  return Object.freeze(actor);
}


// =========================================
// `select` Utility
// =========================================

/**
 * Creates a new reactive value that is derived from the state of one or more
 * subscribable sources, such as Actors or Subjects. The derived state automatically
 * updates whenever any of the source states change.
 *
 * This is useful for creating computed values from multiple parts of your application's state.
 *
 * @template T The type of the derived state.
 * @param sources An array of actors or other subscribable objects to depend on.
 * @param projection A pure function that computes the derived state from the current
 *   states of the sources (e.g., `() => authActor().isLoggedIn && cartActor().items.length > 0`).
 * @returns {Subject<T> & { dispose: () => void }} A read-only reactive subject
 *   representing the derived state, with an added `dispose` method to clean up all subscriptions.
 *
 * @example
 * const canCheckout = select(
 *   [authActor, cartActor],
 *   () => authActor().isLoggedIn && cartActor().items.length > 0
 * );
 *
 * canCheckout.subscribe(value => console.log(`Can checkout: ${value}`));
 * // ...later, to prevent memory leaks...
 * canCheckout.dispose();
 */
export function select<T>(
  sources: Subscribable<any>[],
  projection: () => T,
): Subject<T> & { dispose: () => void } {
  const derivedSubject = createSubject(projection());
  const update = () => derivedSubject(projection());

  const stack = createSubscriptionStack();
  sources.forEach(source => stack.defer(source.subscribe(update)));

  const enhancedSubject = derivedSubject as Subject<T> & { dispose: () => void };
  enhancedSubject.dispose = () => stack.dispose();

  return enhancedSubject;
}