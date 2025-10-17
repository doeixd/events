import { createSubject, Subject, Emitter } from './index';

/**
 * A map of method names to their corresponding Emitter functions. This is the
 * structure that the user's `setup` function is expected to return. The types
 * are intentionally broad here as they will be precisely inferred later.
 * @hidden
 */
type EmitterMap = Record<string, Emitter<any>>;

/**
 * The public interface for an actor.
 *
 * It combines three key features:
 * 1. A function signature `()` to ergonomically access the current state snapshot.
 * 2. A `subscribe` method to reactively listen for state changes.
 * 3. A set of methods, automatically inferred from the `setup` function's return
 *    value, for emitting events and triggering the actor's behavior.
 *
 * @template TContext The shape of the actor's internal state object.
 * @template TEmitters The shape of the emitter map returned by the `setup` function.
 */
export type Actor<
  TContext extends object,
  TEmitters extends EmitterMap
> = {
  /**
   * Returns a snapshot of the actor's current state (context).
   * Note: For deep objects, this is a shallow clone to prevent external mutation.
   * @returns {TContext} The current state object.
   */
  (): TContext;

  /**
   * Subscribes to changes in the actor's context.
   * The callback will be invoked whenever the context is mutated.
   * @param {(context: TContext) => void} callback The function to call with the new state.
   * @returns {() => void} An unsubscribe function.
   */
  subscribe: Subject<TContext>['subscribe'];
} & TEmitters;

/**
 * An optional function that runs after a state change, allowing for side effects
 * such as logging, analytics, or communication with other actors.
 *
 * @example
 * ```typescript
 * const logEffect = (newContext, oldContext) => {
 *   console.log('State changed:', { old: oldContext, new: newContext });
 * };
 * ```
 *
 * @param {TContext} newContext The new state of the actor.
 * @param {TContext} oldContext The previous state of the actor.
 */
export type ActorEffect<TContext> = (
  newContext: TContext,
  oldContext: TContext,
) => void;

/**
 * Creates a new, type-safe actor.
 *
 * An actor is a self-contained unit that encapsulates a mutable state object (`context`)
 * and a set of behaviors (`events`). Its public methods are derived directly
 * from the emitters you return from the `setup` function, providing a clean,
 * discoverable, and fully type-safe API.
 *
 * The `context` object provided to your setup function is reactive. You can
 * mutate it directly using standard JavaScript syntax (e.g., `context.count++`
 * or `context.items.push(newItem)`), and any subscribers will be automatically
 * and efficiently notified of the change.
 *
 * @template TContext The type of the actor's internal state. Must be an object.
 * @template TEmitters The type of the object returned by `setup`, which maps
 *   method names to emitter functions. This is inferred automatically.
 *
 * @example
 * ```typescript
 * import { createActor, createEvent } from './index';
 *
 * const counterActor = createActor(
 *   { count: 0 },
 *   (context) => {
 *     const [incrementHandler, increment] = createEvent();
 *     incrementHandler((data) => { if (typeof data === 'symbol' || data === 'dummy') return; context.count++; });
 *     const [decrementHandler, decrement] = createEvent();
 *     decrementHandler((data) => { if (typeof data === 'symbol' || data === 'dummy') return; context.count--; });
 *     return { increment, decrement };
 *   }
 * );
 *
 * // Use the actor
 * counterActor.increment();
 * console.log(counterActor()); // { count: 1 }
 * ```
 *
 * @param {TContext} initialContext The starting state for the actor.
 * @param {(context: TContext) => TEmitters} setup A function that receives the
 *   actor's live, mutable context. In this function, you create events with
 *   `createEvent`, define their behavior by modifying the context, and return an
 *   object of the emitter functions. These emitters will become the actor's public methods.
 * @param {ActorEffect<TContext>} [effects] An optional function for handling side effects
 *   in a controlled manner, separating them from the pure state-mutation logic.
 * @returns {Actor<TContext, TEmitters>} A fully typed Actor instance.
 */
export function createActor<
  TContext extends object,
  TEmitters extends EmitterMap
>(
  initialContext: TContext,
  setup: (context: TContext) => TEmitters,
  effects?: ActorEffect<TContext>,
): Actor<TContext, TEmitters> {
  const internalState = { ...initialContext };
  const contextSubject = createSubject(internalState);

  // The function to notify subscribers. Centralizing it cleans up the proxy handlers.
  const notify = () => {
    contextSubject({ ...internalState });
  };
  
  // A recursive Proxy handler to deeply wrap the context, making nested objects reactive.
  const proxyHandler: ProxyHandler<any> = {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      // If the property is an object or array, wrap it in a proxy as well.
      if (typeof value === 'object' && value !== null) {
        return new Proxy(value, proxyHandler);
      }
      return value;
    },
    set(target, prop, value, receiver) {
      if (Reflect.get(target, prop, receiver) === value) return true;
      const success = Reflect.set(target, prop, value, receiver);
      if (success) notify();
      return success;
    },
    deleteProperty(target, prop) {
      const success = Reflect.deleteProperty(target, prop);
      if (success) notify();
      return success;
    },
  };

  const reactiveContext = new Proxy(internalState, proxyHandler);

  // Wire up the effects function if it was provided.
  if (effects) {
    let oldContext = { ...initialContext };
    contextSubject.subscribe(newContext => {
      // Pass shallow clones to the effects function to prevent it from
      // mutating the state directly, preserving the one-way data flow.
      effects({ ...newContext }, { ...oldContext });
      oldContext = { ...newContext };
    });
  }

  const emitters = setup(reactiveContext);

  const actor = (() => ({ ...contextSubject() })) as Actor<TContext, TEmitters>;
  actor.subscribe = contextSubject.subscribe;

  Object.assign(actor, emitters);

  return Object.freeze(actor);
}

// import { createSubject, Subject } from '@doeixd/events';

/**
 * A generic interface representing any object with a `subscribe` method,
 * such as an Actor or a Subject from `@doeixd/events`.
 */
interface Subscribable<T> {
  subscribe: (callback: (value: T) => void) => () => void;
}

/**
 * Creates a new reactive value that is derived from the state of one or more actors.
 * The derived state automatically updates whenever any of the source actors change.
 *
 * @template T The type of the derived state.
 *
 * @param {Subscribable<any>[]} sources An array of actors or other subscribable objects.
 * @param {() => T} projection A function that computes the derived state from the
 *   current states of the source actors (e.g., `() => authActor().isLoggedIn && cartActor().items.length > 0`).
 * @returns {Subject<T>} A read-only reactive subject representing the derived state.
 *   You can access its value with `derivedState()` and subscribe to it with `derivedState.subscribe()`.
 *
 * @example
 * const canCheckout = select(
 *   [authActor, cartActor],
 *   () => authActor().isLoggedIn && cartActor().items.length > 0
 * );
 *
 * canCheckout.subscribe(value => console.log(`Can checkout: ${value}`));
 */
export function select<T>(
  sources: Subscribable<any>[],
  projection: () => T,
): Subject<T> {
  const derivedSubject = createSubject(projection());

  const update = () => derivedSubject(projection());
  
  // Subscribe to all source actors and store the unsubscribe functions.
  const unsubs = sources.map(source => source.subscribe(update));

  // Enhance the subject with a `dispose` method to clean up all subscriptions.
  const enhancedSubject = derivedSubject as Subject<T> & { dispose: () => void };
  enhancedSubject.dispose = () => unsubs.forEach(u => u());

  return enhancedSubject;
}