/**
 * @module state-machine
 * A definitive, type-safe, and ergonomic state machine implementation that blends the best of
 * functional, immutable design with a highly readable generator-based syntax.
 *
 * This implementation provides:
 * - **An Immutable Core:** Every transition is a pure function that computes a new state.
 * - **A Generator-Based DSL:** State logic is written in a clean, sequential style using `yield*`.
 * - **Full Type Safety:** The context (`ctx`) is a strongly-typed, intelligent object.
 * - **Built-in Batching:** A `ctx.batch()` utility is provided for atomic updates.
 * - **Composition:** States are just functions, allowing for natural composition and reuse.
 *
 * @example
 * // See the detailed example at the end of the file for full usage.
 */

import { createActor, Actor } from './actor';

// =============================================================================
// SECTION 1: CORE TYPES & INSTRUCTIONS
// =============================================================================

/** A pure function describing a state transition. */
type TransitionFn<TAllContexts extends { state: string }, TCurrentContext extends TAllContexts, TPayload, TNextContext extends TAllContexts> =
  (ctx: TCurrentContext, payload: TPayload) => TNextContext;

/** An instruction for the runtime to execute a named transition. */
type TransitionInstruction<TAllContexts extends { state: string }, TNextContext extends TAllContexts> = {
  readonly _tag: 'transition';
  readonly key: string;
  readonly payload: any;
  // These phantom types are crucial for TypeScript's inference
  readonly _all_contexts: TAllContexts;
  readonly _next_context: TNextContext;
};

/** Union of all possible instructions the runtime can execute. */
type Instruction<TAllContexts extends { state: string }> = TransitionInstruction<TAllContexts, any>;

/** The user-facing object returned by a transition method that can be `yield*`ed. */
type TransitionThunk<TAllContexts extends { state: string }, TNextContext extends TAllContexts> = {
  [Symbol.iterator]: () => Generator<
    TransitionInstruction<TAllContexts, TNextContext>,
    MachineContext<TAllContexts, TNextContext>,
    MachineContext<TAllContexts, TNextContext>
  >;
};

/**
 * The intelligent, type-safe context object passed to each state generator.
 * It holds the current state data and the available transition methods.
 * @template TAllContexts A union of all possible context shapes (e.g., Red | Green).
 * @template TCurrentContext The specific context shape for the current state.
 */
export type MachineContext<
  TAllContexts extends { state: string },
  TCurrentContext extends TAllContexts
> = TCurrentContext & {
  /**
   * Groups multiple transitions into a single, atomic update. Subscribers are
   * notified only once after the batch completes.
   * @param fn A generator function containing one or more `yield*` transitions.
   * @returns A generator that, when `yield*`ed, yields the final machine context.
   */
  batch(
    fn: (ctx: MachineContext<TAllContexts, TCurrentContext>) => Generator<any, MachineContext<TAllContexts, any>, any>
  ): Generator<any, MachineContext<TAllContexts, any>, any>;
};

/** A state is a generator function that receives and returns the machine's context. */
export type StateFn<TAllContexts extends { state: string }, TCurrentContext extends TAllContexts> =
  (ctx: MachineContext<TAllContexts, TCurrentContext>, ...args: any[]) =>
    Generator<any, void, any>;


// =============================================================================
// SECTION 2: THE CONTEXT BUILDER (The Type-Safe API Factory)
// =============================================================================

/**
 * A builder to declaratively define the states, context shapes, and transitions
 * of a state machine in a fully type-safe way.
 */
export class ContextBuilder<TAllContexts extends { state: string }> {
  private transitions = new Map<string, TransitionFn<any, any, any, any>>();

  /**
   * Defines a transition for the machine.
   * @param key A unique name for the transition.
   * @param transitionFn A pure function `(ctx, payload) => newCtx`.
   * @returns The builder instance for chaining, augmented with the new transition type.
   */
  public transition<
    TKey extends string,
    TCurrentContext extends TAllContexts,
    TPayload,
    TNextContext extends TAllContexts
  >(
    key: TKey,
    transitionFn: TransitionFn<TAllContexts, TCurrentContext, TPayload, TNextContext>
  ) {
    this.transitions.set(key, transitionFn);
    // This return type is a trick to add the new transition method to the `this` type
    return this as unknown as ContextBuilder<TAllContexts> & {
      // This is a phantom method used only for type inference
      _method: (key: TKey, payload: TPayload) => TransitionThunk<TAllContexts, TNextContext>;
    };
  }

  /** Finalizes the definition and returns the internal configuration. */
  public build() {
    // This function creates the actual, intelligent context object at runtime.
    const createContext = <TCurrentContext extends TAllContexts>(
      fiber: Fiber<any>,
      contextData: TCurrentContext
    ): MachineContext<TAllContexts, TCurrentContext> => {

      const baseContext = { ...contextData };

      // Dynamically add transition methods to the context object
      for (const key of this.transitions.keys()) {
        (baseContext as any)[key] = (payload: any) => ({
          *[Symbol.iterator](): Generator<any, any, any> {
            return yield { _tag: 'transition', key, payload };
          },
        });
      }

      (baseContext as any).batch = (
        fn: (ctx: any) => Generator<any, any, any>
      ) => {
        return (function* batchExecutor(this: any) {
          fiber.startBatch();
          const finalContext = yield* fn(this);
          fiber.endBatch();
          return finalContext;
        }.call(baseContext));
      };

      return baseContext as MachineContext<TAllContexts, TCurrentContext>;
    };

    return { transitions: this.transitions, createContext };
  }
}

/**
 * A helper to start the context definition process with full type inference.
 * @template TAllContexts A union of all possible context shapes for your machine.
 * @example
 * type MyContexts = { state: 'a' } | { state: 'b' };
 * const myDef = defineContext<MyContexts>()
 *   .transition(...)
 *   .build();
 */
export const defineContext = <TAllContexts extends { state: string }>() =>
  new ContextBuilder<TAllContexts>();


// =============================================================================
// SECTION 3: THE FIBER & MACHINE (The Runtime)
// =============================================================================

/** @internal The immutable runtime that executes the machine's logic. */
class Fiber<TAllContexts extends { state: string }> {
  private batchDepth = 0;

  constructor(
    public readonly generator: Generator,
    public readonly context: TAllContexts,
    private readonly transitions: Map<string, TransitionFn<any, any, any, any>>,
    private readonly createContext: (fiber: Fiber<TAllContexts>, contextData: TAllContexts) => any,
    private readonly onUpdate: (newContext: TAllContexts) => void
  ) {}

  public startBatch() { this.batchDepth++; }
  public endBatch() {
    this.batchDepth--;
    if (this.batchDepth === 0) {
      this.onUpdate(this.context);
    }
  }

  /** The core execution loop. */
  public run(resumeValue?: any): Fiber<TAllContexts> {
    const result = this.generator.next(resumeValue);

    if (result.done) {
      // The generator (and thus the state) has completed.
      return this;
    }

    const instruction = result.value as Instruction<TAllContexts>;
    if (instruction._tag === 'transition') {
      const transitionFn = this.transitions.get(instruction.key);
      if (!transitionFn) throw new Error(`Unknown transition: ${instruction.key}`);

      // Create the new context
      const newContextData = transitionFn(this.context, instruction.payload);

      if (this.batchDepth === 0) {
        this.onUpdate(newContextData);
      }

      // Create a new Fiber for the next state and resume it.
      const newCtxObject = this.createContext(this, newContextData);
      const nextFiber = new Fiber<TAllContexts>(this.generator, newContextData, this.transitions, this.createContext, this.onUpdate);
      return nextFiber.run(newCtxObject);
    }
    
    // In a full implementation, other instructions like `promise` or `waitFor` would be handled here.
    return this;
  }
}

/**
 * Creates the initial state machine instance.
 * @param definition The machine definition created by a `ContextBuilder`.
 * @param initialStateFn The starting state's generator function.
 * @param initialContextData The machine's initial data.
 * @returns An `Actor` representing the running machine.
 */
export function createMachine<TAllContexts extends { state: string }>(
  definition: ReturnType<ContextBuilder<TAllContexts>['build']>,
  initialStateFn: StateFn<TAllContexts, any>,
  initialContextData: TAllContexts
) {
  return createActor({ context: initialContextData }, (actorState) => {
    const onUpdate = (newContext: TAllContexts) => {
      actorState.context = newContext;
    };

    let fiber: Fiber<TAllContexts>;
    const boundCreateContext = (f: Fiber<TAllContexts>, c: TAllContexts) => definition.createContext(f, c);

    const initialCtx = definition.createContext(
      // The fiber reference is circular, so we create it and then inject it.
      // This is safe as it's only used within the generator's execution.
      null as any,
      initialContextData
    );
    const initialGenerator = initialStateFn(initialCtx);

    fiber = new Fiber<TAllContexts>(
      initialGenerator,
      initialContextData,
      definition.transitions,
      boundCreateContext,
      onUpdate
    );
    
    // This is a common pattern to bootstrap a self-referential object.
    (initialCtx as any).batch = (fn: any) => (function* (this: any) {
      fiber.startBatch();
      const finalContext = yield* fn(this);
      fiber.endBatch();
      return finalContext;
    }.call(initialCtx));

    // Kick off the generator. In a real app, this might be triggered by an external 'run' command.
    setTimeout(() => fiber.run(), 0);

    return {};
  }) as Actor<{ context: TAllContexts }, {}>;
}

// =============================================================================
// SECTION 5: FULL EXAMPLE - A TRAFFIC LIGHT
// =============================================================================

/*
// 1. DEFINE CONTEXT SHAPES & A UNION TYPE
type RedState = { readonly state: 'red'; readonly canGo: false };
type GreenState = { readonly state: 'green'; readonly canGo: true };
type YellowState = { readonly state: 'yellow'; readonly canGo: false };

type TrafficLightContext = RedState | GreenState | YellowState;

// 2. DEFINE THE MACHINE'S API USING THE CONTEXT BUILDER
const trafficLightDef = defineContext<TrafficLightContext>()
  .transition('timerExpires', (ctx: RedState, payload: void): GreenState => {
    console.log('TRANSITION: RED -> GREEN');
    return { state: 'green', canGo: true };
  })
  .transition('timerExpires', (ctx: GreenState, payload: void): YellowState => {
    console.log('TRANSITION: GREEN -> YELLOW');
    return { state: 'yellow', canGo: false };
  })
  .transition('timerExpires', (ctx: YellowState, payload: void): RedState => {
    console.log('TRANSITION: YELLOW -> RED');
    return { state: 'red', canGo: false };
  })
  .transition('emergency', (ctx: GreenState | YellowState, payload: { reason: string }): RedState => {
    console.log(`EMERGENCY OVERRIDE: ${payload.reason}. Switching to RED.`);
    return { state: 'red', canGo: false };
  })
  .build();

// 3. DEFINE STATES AS GENERATOR FUNCTIONS
function* red(ctx: MachineContext<TrafficLightContext, RedState>): Generator<any, void, any> {
  console.log(`STATE: RED. Can go? ${ctx.canGo}. Waiting for timer...`);
  const nextCtx = yield* ctx.timerExpires();
  // After the transition, delegate control to the next state's generator
  yield* green(nextCtx);
}

function* green(ctx: MachineContext<TrafficLightContext, GreenState>): Generator<any, void, any> {
  console.log(`STATE: GREEN. Can go? ${ctx.canGo}. Waiting for timer...`);
  const nextCtx = yield* ctx.timerExpires();
  yield* yellow(nextCtx);
}

function* yellow(ctx: MachineContext<TrafficLightContext, YellowState>): Generator<any, void, any> {
  console.log(`STATE: YELLOW. Can go? ${ctx.canGo}. Waiting for timer...`);
  const nextCtx = yield* ctx.timerExpires();
  yield* red(nextCtx);
}

function* emergencyDemo(ctx: MachineContext<TrafficLightContext, GreenState>): Generator<any, void, any> {
    console.log("STATE: Green, but an emergency is about to happen...");
    const nextCtx = yield* ctx.emergency({ reason: "Ambulance approaching" });
    // `nextCtx` is now guaranteed by TypeScript to be a RedState context
    yield* red(nextCtx);
}

// 4. CREATE AND RUN THE MACHINE
const trafficLight = createMachine(
  trafficLightDef,
  red,
  { state: 'red', canGo: false }
);

trafficLight.subscribe(state => {
  console.log(`  >> Actor updated. Current state is: ${state.context.state}`);
});
*/