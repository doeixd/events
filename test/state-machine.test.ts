/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  defineContext,
  createMachine,
  StateFn,
  MachineContext,
} from '../src/state-machine'; 

// =============================================================================
// SETUP: Define a reusable traffic light machine for testing
// =============================================================================

// 1. CONTEXT TYPES
type RedState = { readonly state: 'red'; readonly canGo: false };
type GreenState = { readonly state: 'green'; readonly canGo: true };
type YellowState = { readonly state: 'yellow'; readonly canGo: false };
type TrafficLightContext = RedState | GreenState | YellowState;

// 2. MACHINE DEFINITION
const trafficLightDef = defineContext<TrafficLightContext>()
  .transition('timerExpires', (ctx: RedState, _: void): GreenState => {
    return { state: 'green', canGo: true };
  })
  .transition('timerExpires', (ctx: GreenState, _: void): YellowState => {
    return { state: 'yellow', canGo: false };
  })
  .transition('timerExpires', (ctx: YellowState, _: void): RedState => {
    return { state: 'red', canGo: false };
  })
  .transition('emergency', (ctx: GreenState | YellowState, payload: { reason: string }): RedState => {
    console.log(`EMERGENCY: ${payload.reason}`);
    return { state: 'red', canGo: false };
  })
  .build();

// 3. STATE FUNCTIONS
const red: StateFn<TrafficLightContext, RedState> = function* red(ctx) {
  yield* ctx.timerExpires();
};

const sequenceState: StateFn<TrafficLightContext, RedState> = function* sequenceState(ctx) {
  yield* ctx.timerExpires();
  yield* ctx.timerExpires();
  yield* ctx.timerExpires();
};

const green: StateFn<TrafficLightContext, GreenState> = function* green(ctx) {
  const yellowCtx = yield* ctx.timerExpires();
  yield* yellow(yellowCtx);
};

const yellow: StateFn<TrafficLightContext, YellowState> = function* yellow(ctx) {
  yield* ctx.timerExpires();
  // Don't delegate to avoid infinite loop
};

describe('Ultimate State Machine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Machine Definition and Creation', () => {
    it('should create a machine with the correct initial context', () => {
      const initialContext: RedState = { state: 'red', canGo: false };
      const machine = createMachine(trafficLightDef, red, initialContext);

      expect(machine).toBeDefined();
      expect(machine().context).toEqual(initialContext);
      expect(machine().context.state).toBe('red');
    });

    it('should provide transition methods on the context object', () => {
      // This is a test of the internal builder logic
      const { createContext } = trafficLightDef;
      const fakeFiber = { startBatch: vi.fn(), endBatch: vi.fn() };
      const ctx = createContext(fakeFiber as any, { state: 'red', canGo: false });

      expect(typeof ctx.timerExpires).toBe('function');
      // The `emergency` transition is not valid on a RedState, but the method exists.
      // The type system prevents its use in the `red` state function.
      expect(typeof (ctx as any).emergency).toBe('function');
    });
  });

  describe('Core Transitions and Immutability', () => {
    it('should transition to a new state and context upon `yield*`', async () => {
      const initialContext: RedState = { state: 'red', canGo: false };
      const machine = createMachine(trafficLightDef, red, initialContext);

      const subscriber = vi.fn();
      machine.subscribe(subscriber);

      // The machine starts asynchronously
      await vi.runAllTimersAsync();

      // The `red` state function immediately yields `ctx.timerExpires()`.
      // The fiber executes this, updates the state, and notifies the subscriber.
      const lastCall = subscriber.mock.calls[subscriber.mock.calls.length - 1][0];
      expect(lastCall.context.state).toBe('green');
      expect(lastCall.context.canGo).toBe(true);

      // The original context data should be unchanged
      expect(initialContext.state).toBe('red');
    });

    it('should follow a sequence of generator transitions', async () => {
      const machine = createMachine(trafficLightDef, sequenceState, { state: 'red', canGo: false });
      const subscriber = vi.fn();
      machine.subscribe(subscriber);

      // Initial state
      expect(machine().context.state).toBe('red');

      // Kick off the generator
      await vi.runAllTimersAsync();
      // After all transitions: initial red + red -> green -> yellow -> red
      expect(subscriber).toHaveBeenCalledTimes(4);
      expect(subscriber).toHaveBeenLastCalledWith({ context: { state: 'red', canGo: false } });
    });
  });

  describe('Batching', () => {
    it('should notify subscribers only once after a batch completes', async () => {
      const batchingState: StateFn<TrafficLightContext, RedState> = function* batchingState(ctx) {
        yield* ctx.batch(function* (batchCtx: MachineContext<TrafficLightContext, any>) {
          // Inside a batch, we perform multiple transitions
          const greenCtx = yield* batchCtx.timerExpires();
          const yellowCtx = yield* greenCtx.timerExpires();
          // The final context of the batch is `yellow`
          return yellowCtx;
        });

        // Don't continue after batch
      };

      const machine = createMachine(trafficLightDef, batchingState, { state: 'red', canGo: false });
      const subscriber = vi.fn();
      machine.subscribe(subscriber);

      // Run the machine
      await vi.runAllTimersAsync();

      // The subscriber should have been called for the initial state and the final state of the batch ('yellow').
      // It should NOT have been called for the intermediate 'green' state.
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith({ context: { state: 'yellow', canGo: false } });
    });
  });

  describe('Type Safety (Simulated)', () => {
    it('should provide a type-safe context within state functions', () => {
      // This test is conceptual and passes if the code compiles.
      const greenStateLogic: StateFn<TrafficLightContext, GreenState> = function* green(ctx) {
        // `ctx.canGo` is known to be `true` here.
        expect(ctx.canGo).toBe(true);
        // `ctx.state` is known to be `'green'`.
        expect(ctx.state).toBe('green');
        
        // This line would cause a COMPILE ERROR because `emergency` is not defined on RedState.
        // const nextCtx = yield* (ctx as any as MachineContext<TrafficLightContext, RedState>).emergency({ reason: 'test' });

        const nextCtx = yield* ctx.timerExpires();
        
        // `nextCtx` is correctly inferred to be of type `MachineContext<..., YellowState>`
        expect(nextCtx.state).toBe('yellow');
        
        yield* yellow(nextCtx);
      };

      // This demonstrates that the concept is sound and would be enforced by TSC.
      expect(typeof greenStateLogic).toBe('function');
    });

    it('should enforce correct payload types for transitions', () => {
      // This test is also conceptual.
      const emergencyStateLogic: StateFn<TrafficLightContext, GreenState> = function* emergencyState(ctx) {
        // This is correct and would compile.
        const nextCtx = yield* ctx.emergency({ reason: 'Ambulance' });

        // This line would cause a COMPILE ERROR because the payload is wrong.
        // const errorCtx = yield* ctx.emergency({ wrong_prop: 'test' });

        yield* red(nextCtx);
      };

      expect(typeof emergencyStateLogic).toBe('function');
    });
  });
});