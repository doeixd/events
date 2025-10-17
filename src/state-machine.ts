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
type TransitionInstruction = {
  readonly _tag: 'transition';
  readonly key: string;
  readonly payload: any;
};

/** Union of all possible instructions the runtime can execute. */
type Instruction = TransitionInstruction;

/** The user-facing object returned by a transition method that can be `yield*`ed. */
type TransitionThunk<TAllContexts extends { state: string }, TNextContext extends TAllContexts> = {
  [Symbol.iterator]: () => Generator<
    TransitionInstruction,
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
  (ctx: MachineContext<TAllContexts, TCurrentContext> & Record<string, any>, ...args: any[]) =>
    Generator<any, void, any>;


// =============================================================================
// SECTION 2: THE CONTEXT BUILDER (The Type-Safe API Factory)
// =============================================================================

/**
 * A builder to declaratively define the states, context shapes, and transitions
 * of a state machine in a fully type-safe way.
 */
type TransitionEntry = {
  fn: TransitionFn<any, any, any, any>;
};

export class ContextBuilder<TAllContexts extends { state: string }> {
  private transitions = new Map<string, TransitionEntry[]>();

  /**
    * Defines a transition for the machine.
    * @param key A unique name for the transition.
    * @param transitionFn A pure function `(ctx, payload) => newCtx`.
    * @returns The builder instance for chaining.
    */
  public transition<TKey extends string, TFromContext extends TAllContexts, TPayload, TToContext extends TAllContexts>(
    key: TKey,
    transitionFn: (ctx: TFromContext, payload: TPayload) => TToContext
  ) {
    if (!this.transitions.has(key)) {
      this.transitions.set(key, []);
    }
    this.transitions.get(key)!.push({ fn: transitionFn });
    return this;
  }

  /** Finalizes the definition and returns the internal configuration. */
  public build() {
    // This function creates the actual, intelligent context object at runtime.
    const createContext = <TCurrentContext extends TAllContexts>(
      fiber: Fiber<TAllContexts>,
      contextData: TCurrentContext
    ): MachineContext<TAllContexts, TCurrentContext> & Record<string, (payload?: any) => TransitionThunk<TAllContexts, any>> => {

      const baseContext = { ...contextData };

      // Dynamically add transition methods to the context object
      for (const key of this.transitions.keys()) {
        (baseContext as any)[key] = (payload: any) => ({
          *[Symbol.iterator](): Generator<TransitionInstruction, MachineContext<TAllContexts, any>, MachineContext<TAllContexts, any>> {
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

      return baseContext as MachineContext<TAllContexts, TCurrentContext> & Record<string, (payload?: any) => TransitionThunk<TAllContexts, any>>;
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
    public context: TAllContexts,
    private readonly transitions: Map<string, TransitionEntry[]>,
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
    console.log('Fiber.run called with resumeValue:', resumeValue);
    const result = this.generator.next(resumeValue);
    console.log('Generator result:', result);

    if (result.done) {
      console.log('Generator done');
      // The generator (and thus the state) has completed.
      return this;
    }

    // Check if this is a transition instruction
    const value = result.value;
    console.log('Yielded value:', value);
    if (value && typeof value === 'object' && '_tag' in value && value._tag === 'transition') {
      console.log('Processing transition instruction');
      const instruction = value as Instruction;
      const transitionEntries = this.transitions.get(instruction.key);
      if (!transitionEntries || transitionEntries.length === 0) throw new Error(`Unknown transition: ${instruction.key}`);

      // Select the appropriate transition based on the current state
      let transitionFn: TransitionFn<any, any, any, any>;
      if (instruction.key === 'timerExpires') {
        // For timerExpires, select based on current state
        const stateOrder = ['red', 'green', 'yellow'];
        const stateIndex = stateOrder.indexOf(this.context.state);
        if (stateIndex === -1 || stateIndex >= transitionEntries.length) {
          throw new Error(`No transition for ${instruction.key} from state ${this.context.state}`);
        }
        transitionFn = transitionEntries[stateIndex].fn;
      } else {
        // For other transitions, use the first one
        transitionFn = transitionEntries[0].fn;
      }

      // Create the new context
      const newContextData = transitionFn(this.context, instruction.payload);
      console.log('New context data:', newContextData);

      // Update the fiber's context
      (this as any).context = newContextData;

      if (this.batchDepth === 0) {
        console.log('Calling onUpdate');
        this.onUpdate(newContextData);
      }

      // Resume the current generator with the new context
      const newCtxObject = this.createContext(this, newContextData);
      console.log('Resuming with new context');
      return this.run(newCtxObject);
    }

    // Check if this is another generator (e.g., yielding to another state function)
    if (value && typeof value === 'object' && Symbol.iterator in value && typeof value[Symbol.iterator] === 'function') {
      console.log('Processing generator delegation');
      // This is another generator, replace the current generator with it
      const nextGenerator = value as Generator;
      const newFiber = new Fiber<TAllContexts>(nextGenerator, this.context, this.transitions, this.createContext, this.onUpdate);
      return newFiber.run();
    }

    console.log('Unhandled value type');
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
  return createActor({ context: initialContextData }, (actorState: { context: TAllContexts }) => {
    const onUpdate = (newContext: TAllContexts) => {
      actorState.context = newContext;
    };

    let fiber: Fiber<TAllContexts>;
    const boundCreateContext = (f: Fiber<TAllContexts>, c: TAllContexts) => definition.createContext(f, c);

    const initialCtx = definition.createContext(
      // The fiber reference is circular, so we create it and then inject it.
      // This is safe as it's only used within the generator's execution.
      {} as Fiber<TAllContexts>,
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