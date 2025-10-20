import { createActor, Actor, ActorOptions } from './actor';

// =========================================
// Public Types
// =========================================

/**
 * A map of behavior names to their corresponding handler functions for a Service.
 * This defines the service's public API.
 * @template TState The type of the service's internal state.
 */
type ServiceBehavior<TState extends object> = Record<
  string,
  (state: TState, ...payload: any[]) => (TState | void) | Promise<TState | void> | any
>;

/**
 * The result of a service's initialization function. On success, it provides
 * the initial state. On failure, it provides a reason.
 */
export type InitResult<TState> =
  | { readonly ok: true; state: TState }
  | { readonly ok: false; reason?: unknown };

/**
 * The result of starting a service. On success, it returns a running Actor
 * instance representing the service.
 */
export type StartResult<TContext extends object, TBehavior extends ServiceBehavior<TContext>> =
  | { readonly ok: true; service: Actor<TContext, TBehavior, 'queued'> }
  | { readonly ok: false; reason?: unknown };

/**
 * Defines the implementation of a long-running, concurrent Service.
 * This is the "behavior" that the user will implement.
 *
 * @template TState The type of the service's internal state.
 * @template TArgs The tuple type for arguments passed to the `init` function.
 * @template TBehavior The map of methods that define the service's public API.
 */
export interface ServiceModule<
  TState extends object,
  TArgs extends any[],
  TBehavior extends ServiceBehavior<TState>
> {
  /**
   * Initializes the service's state. Called once when the service starts.
   * If this function is async, `createService` will await its result.
   * @param args The arguments passed to `service.start()`.
   * @returns An `InitResult` indicating success or failure.
   */
  init(...args: TArgs): InitResult<TState> | Promise<InitResult<TState>>;

  /**
   * The core logic of the service, defined as a map of named methods.
   * This is directly equivalent to the `behavior` map in `createActor`.
   *
   * - To update state (a "cast"), return a new state object: `{ ...state, foo: 'bar' }`.
   * - To reply with a value (a "call"), return any other value: `state.foo`.
   */
  behavior: TBehavior;

  /**
   * Optional configuration for the underlying actor, such as side effects.
   * The `mode` is always locked to `'queued'`.
   */
  options?: Omit<ActorOptions<TState>, 'mode'>;
}

// =========================================
// Public API
// =========================================

/**
 * Defines a concurrent, long-running Service and creates a factory for starting it.
 *
 * A Service is a specialized, high-level actor designed for encapsulating
 * business logic, managing shared resources, or handling background tasks.
 * It is built on top of `createActor` in `'queued'` mode, guaranteeing
 * sequential message processing and eliminating race conditions.
 *
 * This primitive is the library's native, modern replacement for the traditional
 * `GenServer` pattern, offering better type inference and a more ergonomic API.
 *
 * @param module The `ServiceModule` object containing the service's logic.
 * @returns An object with a `start` method to launch new instances of the service.
 */
export function createService<
  TState extends object,
  TArgs extends any[],
  TBehavior extends ServiceBehavior<TState>
>(module: ServiceModule<TState, TArgs, TBehavior>) {
  return {
    /**
     * Starts a new instance of this Service.
     * @param args The arguments for the module's `init` function.
     * @returns A Promise that resolves with a `StartResult`.
     */
    start: async (...args: TArgs): Promise<StartResult<TState, TBehavior>> => {
      try {
        const initResult = await module.init(...args);
        if (!initResult.ok) {
          return { ok: false, reason: initResult.reason };
        }

        const serviceActor = createActor(
          initResult.state,
          module.behavior,
          {
            ...module.options,
            mode: 'queued', // Services are always concurrent and queued.
          }
        );

        return { ok: true, service: serviceActor };
      } catch (error) {
        console.error(`[createService] Failed to start service:`, error);
        return { ok: false, reason: error };
      }
    },
  };
}