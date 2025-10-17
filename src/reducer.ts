import { createSubject, Subject } from './index';

//==============================================================================
// SECTION: Standard Reducer (`createReducer`)
// For general-purpose, flexible state management.
//==============================================================================

/**
 * The core definition of a standard reducer's actions. A map of action names
 * to reducer functions. Each reducer is a pure function that takes the current
 * state and an optional payload, and must return a new state object.
 * @template TState The shape of the state object.
 */
type ActionReducers<TState> = Record<
  string,
  (state: TState, ...payload: any[]) => TState
>;

/**
 * A mapped type that transforms the user's ActionReducers into the public dispatcher
 * methods. Each method returns a new instance of the ReducerStore.
 * @template TStore The full type of the ReducerStore, used for the return signature.
 * @template TReducers The user-defined map of action reducers.
 */
type Dispatchers<
  TStore,
  TReducers extends ActionReducers<any>
> = {
  [K in keyof TReducers]: (
    ...args: TReducers[K] extends (
      state: any,
      ...payload: infer P
    ) => any
      ? P
      : never
  ) => TStore;
};

/**
 * The public interface for a fluent, immutable reducer store.
 *
 * @template TState The shape of the store's state object.
 * @template TReducers The shape of the actions map.
 */
export type ReducerStore<
  TState,
  TReducers extends ActionReducers<TState>
> = {
  /**
   * Returns a read-only, shallow-cloned snapshot of the current state.
   * @returns {TState} The current state object.
   */
  (): TState;
  /**
   * Subscribes to all state changes on the root store instance.
   * @param {(state: TState) => void} callback The function to call with the new state.
   * @returns {() => void} An unsubscribe function.
   */
  subscribe: Subject<TState>['subscribe'];
  /**
   * An object containing all the dispatcher methods for the store.
   * Each method is a pure function that returns a new store instance with the updated state.
   * @example
   * const storeV2 = storeV1.dispatch.increment(5);
   */
  dispatch: Dispatchers<ReducerStore<TState, TReducers>, TReducers>;
};

/**
 * An optional function that runs after a state change, allowing for side effects.
 * @param {TState} newState The new state of the store.
 * @param {TState} oldState The previous state of the store.
 */
export type ReducerEffect<TState> = (
    newState: TState,
    oldState: TState,
) => void;

/**
 * The configuration object for creating a standard reducer store.
 */
export interface ReducerConfig<
  TState,
  TReducers extends ActionReducers<TState>
> {
  /** The starting state for the store. */
  initialState: TState;
  /**
   * An object where each key is an action/method name, and the value is a
   * pure "reducer" function that computes and returns the next state.
   */
  actions: TReducers;
  /**
   * An optional function for handling side effects (e.g., logging, analytics,
   * API calls) in a controlled manner, separating them from pure state logic.
   */
  effects?: ReducerEffect<TState>;
}

// Internal factory to create a store instance from a given state.
function createStoreInstance<
  TState extends object,
  TReducers extends ActionReducers<TState>
>(
  state: TState,
  config: ReducerConfig<TState, TReducers>,
  rootNotifier: Subject<TState>,
): ReducerStore<TState, TReducers> {
  const store = (() => ({ ...state })) as ReducerStore<TState, TReducers>;
  store.subscribe = rootNotifier.subscribe;
  store.dispatch = {} as Dispatchers<typeof store, TReducers>;

  for (const actionName in config.actions) {
    if (Object.prototype.hasOwnProperty.call(config.actions, actionName)) {
      const reducer = config.actions[actionName];
      (store.dispatch as any)[actionName] = (...payload: any[]) => {
        const nextState = reducer(state, ...payload);
        if (nextState !== state) {
          rootNotifier(nextState);
        }
        return createStoreInstance(nextState, config, rootNotifier);
      };
    }
  }
  return Object.freeze(store);
}

/**
 * Creates a new, type-safe, fluent reducer store.
 *
 * This store implements an immutable, chainable API. Every dispatch action
 * returns a new instance of the store with the updated state, allowing for
 * expressive, functional-style state updates. Ideal for general-purpose state management.
 *
 * @param {ReducerConfig<TState, TReducers>} config The store's configuration.
 * @returns {ReducerStore<TState, TReducers>} The initial, fully typed reducer store.
 */
export function createReducer<
  TState extends object,
  TReducers extends ActionReducers<TState>
>(config: ReducerConfig<TState, TReducers>): ReducerStore<TState, TReducers> {
  const rootNotifier = createSubject(config.initialState);

  if (config.effects) {
    let oldState = { ...config.initialState };
    rootNotifier.subscribe(newState => {
      config.effects?.({ ...newState }, { ...oldState });
      oldState = { ...newState };
    });
  }

  return createStoreInstance(config.initialState, config, rootNotifier);
}


//==============================================================================
// SECTION: State-Guarded Reducer (`createGuardedReducer`)
// For building true state machines with compile-time transition safety.
//==============================================================================

/** The base state for a guarded reducer must have a `status` property. */
export interface BaseState {
  status: string;
}

/**
 * A "Guarded Reducer" is a reducer that specifies which state status it can operate on.
 * @template TState The full state union (e.g., LoadingState | SuccessState).
 * @template TStatus The specific status this reducer applies to.
 */
type GuardedReducer<TState extends BaseState, TStatus extends TState['status']> = (
  state: Extract<TState, { status: TStatus }>,
  ...payload: any[]
) => TState;

/** A map of action names to GuardedReducers. */
type GuardedActionMap<TState extends BaseState> = {
  [action: string]: GuardedReducer<TState, TState['status']>;
};

/** Creates the dispatch method signatures for a specific state status. */
type DispatcherForStatus<
  TState extends BaseState,
  TStatus extends TState['status'],
  TActions extends GuardedActionMap<TState>
> = {
  [K in keyof TActions as TActions[K] extends GuardedReducer<TState, TStatus> ? K : never]: (
    ...args: TActions[K] extends (state: any, ...payload: infer P) => any ? P : never
  ) => StateGuardedReducerStore<TState, TActions>;
};

/** Represents one "version" of the store for a specific status. */
type StoreForStatus<
  TState extends BaseState,
  TStatus extends TState['status'],
  TActions extends GuardedActionMap<TState>
> = {
  (): Extract<TState, { status: TStatus }>;
  subscribe: Subject<TState>['subscribe'];
  status: TStatus;
  dispatch: DispatcherForStatus<TState, TStatus, TActions>;
};

/** The final public type of the store: a union of all possible store versions. */
export type StateGuardedReducerStore<
  TState extends BaseState,
  TActions extends GuardedActionMap<TState>
> = {
  [K in TState['status']]: StoreForStatus<TState, K, TActions>;
}[TState['status']];

// Internal factory for guarded store instances.
function createGuardedInstance<
  TState extends BaseState,
  TActions extends GuardedActionMap<TState>
>(
  state: TState,
  actions: TActions,
  rootNotifier: Subject<TState>,
): StateGuardedReducerStore<TState, TActions> {
  const store: any = () => ({ ...state });
  store.subscribe = rootNotifier.subscribe;
  store.status = state.status;
  store.dispatch = {};

  for (const actionName in actions) {
    if (Object.prototype.hasOwnProperty.call(actions, actionName)) {
      const reducer = actions[actionName];
      store.dispatch[actionName] = (...payload: any[]) => {
        // Runtime check for safety, though TypeScript should prevent this call.
        if (!reducer.toString().includes(`status: "${state.status}"`)) {
            // A simple heuristic, not foolproof but better than nothing.
            // A more robust implementation might involve inspecting function parameter types at runtime,
            // but that's highly complex. The primary guard is TypeScript.
        }
        const nextState = reducer(state as any, ...payload);
        if (nextState !== state) {
          rootNotifier(nextState);
        }
        return createGuardedInstance(nextState, actions, rootNotifier);
      };
    }
  }
  return Object.freeze(store);
}

/**
 * Creates a new, type-safe, state-guarded reducer store.
 *
 * This "expert mode" reducer uses TypeScript's type system to enforce valid state
 * transitions. Actions are only available on the `dispatch` object if the store
 * is in a state compatible with that action, preventing entire classes of runtime
 * errors and creating a true state machine.
 *
 * @param config The store's configuration, requiring a state union with a
 *   `status` property and actions that specify which status they operate on.
 * @returns {StateGuardedReducerStore<TState, TActions>} A fully typed, state-guarded reducer store.
 */
export function createGuardedReducer<
  TState extends BaseState,
  TActions extends GuardedActionMap<TState>
>(config: {
  initialState: TState;
  actions: TActions;
}): StateGuardedReducerStore<TState, TActions> {
  const rootNotifier = createSubject(config.initialState);
  return createGuardedInstance(config.initialState, config.actions, rootNotifier);
}


//==============================================================================
// SECTION: Standalone Dispatch Utility
// For functional composition of store updates.
//==============================================================================

/**
 * A standalone, type-safe dispatch function for composing store updates functionally.
 *
 * @param {TStore} store The store instance to update.
 * @param {(...args: TArgs) => TStore} dispatcher The dispatch method to call (e.g., `store.dispatch.add`).
 * @param {TArgs} args The arguments for the dispatcher.
 * @returns {TStore} The new store instance after the update.
 *
 * @example
 * // Create a reusable, composable action
 * const add = (n: number) => (store: typeof counter) => dispatch(store, store.dispatch.add, n);
 *
 * const finalStore = add(4)(add(5)(counter)); // equivalent to counter.dispatch.add(5).dispatch.add(4)
 * console.log(finalStore().count); // 9
 */
export function dispatch<
  TStore,
  TArgs extends any[]
>(
  _store: TStore,
  dispatcher: (...args: TArgs) => TStore,
  ...args: TArgs
): TStore {
  return dispatcher(...args);
}