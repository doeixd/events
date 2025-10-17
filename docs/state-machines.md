# State Machines: Type-Safe, Generator-Based State Management

A definitive, type-safe, and ergonomic state machine implementation that blends the best of functional, immutable design with a highly readable generator-based syntax.

## Table of Contents

- [Introduction](#introduction)
- [Positioning in the Ecosystem](#positioning-in-the-ecosystem)
- [Core Concepts](#core-concepts)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Advanced Usage](#advanced-usage)
- [Examples Gallery](#examples-gallery)
- [TypeScript Integration](#typescript-integration)
- [Event Handling and Integration](#event-handling-and-integration)
- [Library Ecosystem Integration](#library-ecosystem-integration)
- [Advanced Event Patterns](#advanced-event-patterns)
- [Real-world Integration Examples](#real-world-integration-examples)
- [Best Practices](#best-practices)
- [FAQ](#faq)
- [Architecture](#architecture)

## Introduction

State machines provide a robust way to manage complex state transitions in applications. This library offers a unique approach that combines:

- **Full TypeScript Integration**: Compile-time safety for states, transitions, and payloads
- **Generator-Based DSL**: Write state logic in a clean, sequential style
- **Immutable Core**: Every transition is a pure function
- **Built-in Batching**: Atomic updates with automatic subscriber notification
- **Composition-Friendly**: Natural reuse and combination of state machines

## Positioning in the Ecosystem

### Compared to XState
```typescript
// XState - Verbose configuration
const machine = createMachine({
  states: {
    idle: { on: { START: 'running' } },
    running: { on: { STOP: 'idle' } }
  }
});

// This library - Type-safe, generator-based
const machine = createMachine(
  defineContext<States>()
    .transition('start', (ctx: IdleState) => ({ state: 'running' }))
    .transition('stop', (ctx: RunningState) => ({ state: 'idle' }))
    .build(),
  function* logic(ctx: MachineContext<States, any>) {
    while (true) {
      yield* ctx.start();
      yield* ctx.stop();
    }
  },
  { state: 'idle' }
);
```

**Key Differences:**
- **Type Safety**: This library provides compile-time guarantees for state transitions
- **Performance**: Zero runtime interpretation overhead
- **Ergonomics**: Generator syntax feels natural for sequential logic
- **Bundle Size**: Minimal runtime footprint

### Compared to Redux + Middleware
```typescript
// Redux - Boilerplate heavy
const reducer = (state, action) => {
  switch (action.type) {
    case 'START': return { ...state, status: 'running' };
    case 'STOP': return { ...state, status: 'idle' };
    default: return state;
  }
};

// This library - Purpose-built for state machines
const machine = createMachine(/* ... */, function* logic(ctx) {
  while (true) {
    yield* ctx.start();
    yield* ctx.stop();
  }
}, initialState);
```

### Compared to useReducer
```typescript
// useReducer - Manual state management
function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE': return { ...state, on: !state.on };
  }
}

// This library - Declarative transitions
const machine = createMachine(
  defineContext<States>()
    .transition('toggle', (ctx) => ({ ...ctx, on: !ctx.on }))
    .build(),
  function* logic(ctx) { yield* ctx.toggle(); },
  { on: false }
);
```

## Core Concepts

### States and Contexts
States are represented as TypeScript types with a required `state` property:

```typescript
type IdleState = { readonly state: 'idle'; readonly count: number };
type RunningState = { readonly state: 'running'; readonly count: number };
type States = IdleState | RunningState;
```

### Transitions
Pure functions that transform one state to another:

```typescript
(ctx: IdleState) => ({ state: 'running', count: ctx.count })
```

### State Functions
Generator functions that define the machine's behavior:

```typescript
function* counterLogic(ctx: MachineContext<States, IdleState>) {
  while (true) {
    yield* ctx.start();
    // Machine is now in RunningState
    yield* ctx.stop();
    // Machine is back in IdleState
  }
}
```

### The Execution Model
- State functions run as generators
- `yield*` pauses execution and triggers transitions
- Transitions are pure functions that return new state
- Subscribers are notified of state changes

## Quick Start

### Installation
```bash
npm install @doeixd/events
```

### Basic Example: Counter
```typescript
import { defineContext, createMachine, MachineContext } from '@doeixd/events';

// 1. Define your state types
type IdleState = { readonly state: 'idle'; readonly count: 0 };
type CountingState = { readonly state: 'counting'; readonly count: number };
type CounterStates = IdleState | CountingState;

// 2. Define transitions
const counterDef = defineContext<CounterStates>()
  .transition('start', (ctx: IdleState) => ({ state: 'counting', count: 1 }))
  .transition('increment', (ctx: CountingState) => ({
    ...ctx,
    count: ctx.count + 1
  }))
  .transition('stop', (ctx: CountingState) => ({ state: 'idle', count: 0 }))
  .build();

// 3. Define state logic
function* counterLogic(ctx: MachineContext<CounterStates, IdleState>) {
  while (true) {
    const runningCtx = yield* ctx.start();
    // Now in CountingState
    yield* runningCtx.increment();
    yield* runningCtx.increment();
    yield* runningCtx.stop();
  }
}

// 4. Create and run the machine
const counter = createMachine(counterDef, counterLogic, { state: 'idle', count: 0 });

// 5. Subscribe to changes
counter.subscribe(state => {
  console.log('Counter:', state.context.count, 'State:', state.context.state);
});
```

## API Reference

### defineContext<T>()
Creates a context builder for defining state machine transitions.

```typescript
const builder = defineContext<MyStates>();
```

### ContextBuilder.transition()
Adds a transition to the machine.

```typescript
builder.transition(
  'transitionName',           // string key
  transitionFn                // (ctx, payload?) => newState
);
```

### ContextBuilder.build()
Finalizes the machine definition.

```typescript
const definition = builder.build();
// Returns: { transitions: Map, createContext: Function }
```

### createMachine()
Creates a running state machine instance.

```typescript
const machine = createMachine(
  definition,      // From builder.build()
  initialStateFn,  // Generator function
  initialContext   // Initial state data
);
```

### MachineContext<T, C>
The context object passed to state functions.

```typescript
type MachineContext<
  TAllContexts extends { state: string },
  TCurrentContext extends TAllContexts
> = TCurrentContext & {
  batch(fn: Generator): Generator;
  // + dynamically added transition methods
};
```

### StateFn<T, C>
Type for state generator functions.

```typescript
type StateFn<
  TAllContexts extends { state: string },
  TCurrentContext extends TAllContexts
> = (ctx: MachineContext<TAllContexts, TCurrentContext>, ...args: any[]) =>
  Generator<any, void, any>;
```

## Advanced Usage

### Batching Multiple Transitions
```typescript
function* batchingLogic(ctx: MachineContext<States, any>) {
  const finalCtx = yield* ctx.batch(function* (batchCtx) {
    const step1 = yield* batchCtx.transition1();
    const step2 = yield* step1.transition2();
    return step2;
  });
  // Subscribers notified only once here
  yield* finalCtx.nextTransition();
}
```

### Conditional Transitions
```typescript
const machineDef = defineContext<States>()
  .transition('conditional', (ctx) => {
    if (ctx.value > 10) {
      return { ...ctx, state: 'high' };
    } else {
      return { ...ctx, state: 'low' };
    }
  })
  .build();
```

### Payload Handling
```typescript
type States = { state: 'idle' } | { state: 'active'; data: string };

const machineDef = defineContext<States>()
  .transition('activate', (ctx, payload: { data: string }) => ({
    state: 'active',
    data: payload.data
  }))
  .build();

function* logic(ctx: MachineContext<States, any>) {
  const activeCtx = yield* ctx.activate({ data: 'hello' });
  console.log(activeCtx.data); // 'hello'
}
```

## Examples Gallery

### Traffic Light
```typescript
type RedState = { readonly state: 'red'; readonly canGo: false };
type GreenState = { readonly state: 'green'; readonly canGo: true };
type YellowState = { readonly state: 'yellow'; readonly canGo: false };
type TrafficLightStates = RedState | GreenState | YellowState;

const trafficLightDef = defineContext<TrafficLightStates>()
  .transition('timerExpires', (ctx: RedState) => ({ state: 'green', canGo: true }))
  .transition('timerExpires', (ctx: GreenState) => ({ state: 'yellow', canGo: false }))
  .transition('timerExpires', (ctx: YellowState) => ({ state: 'red', canGo: false }))
  .build();

function* trafficLogic(ctx: MachineContext<TrafficLightStates, RedState>) {
  while (true) {
    console.log('Red light');
    const greenCtx = yield* ctx.timerExpires();
    console.log('Green light');
    const yellowCtx = yield* greenCtx.timerExpires();
    console.log('Yellow light');
    const redCtx = yield* yellowCtx.timerExpires();
  }
}

const trafficLight = createMachine(
  trafficLightDef,
  trafficLogic,
  { state: 'red', canGo: false }
);
```

### Form Validation
```typescript
type FormStates = { state: 'editing' } | { state: 'validating' } | { state: 'submitted' };

const formDef = defineContext<FormStates>()
  .transition('submit', (ctx) => ({ state: 'validating' }))
  .transition('validationSuccess', (ctx) => ({ state: 'submitted' }))
  .transition('validationError', (ctx) => ({ state: 'editing' }))
  .build();

function* formLogic(ctx: MachineContext<FormStates, any>) {
  while (true) {
    // Wait for submit
    const validatingCtx = yield* ctx.submit();

    // Simulate validation
    try {
      await validateForm();
      yield* validatingCtx.validationSuccess();
      break; // Form complete
    } catch (error) {
      yield* validatingCtx.validationError();
    }
  }
}
```

### Authentication Flow
```typescript
type AuthStates =
  | { state: 'unauthenticated' }
  | { state: 'authenticating'; username: string }
  | { state: 'authenticated'; user: User };

const authDef = defineContext<AuthStates>()
  .transition('login', (ctx, payload: { username: string; password: string }) => ({
    state: 'authenticating',
    username: payload.username
  }))
  .transition('loginSuccess', (ctx, payload: { user: User }) => ({
    state: 'authenticated',
    user: payload.user
  }))
  .transition('loginError', (ctx) => ({ state: 'unauthenticated' }))
  .build();

function* authLogic(ctx: MachineContext<AuthStates, any>) {
  while (true) {
    const authingCtx = yield* ctx.login({ username: 'user', password: 'pass' });

    try {
      const user = await authenticate(authingCtx.username, 'pass');
      yield* authingCtx.loginSuccess({ user });
      break;
    } catch (error) {
      yield* authingCtx.loginError();
    }
  }
}
```

## TypeScript Integration

### Compile-Time Safety
```typescript
// ✅ This compiles - correct transition
yield* ctx.timerExpires();

// ❌ This errors - invalid transition for current state
yield* ctx.emergency(); // Property 'emergency' does not exist on RedState context

// ✅ Payload typing
yield* ctx.login({ username: 'user', password: 'pass' });
// ❌ Wrong payload type
yield* ctx.login({ user: 'user' }); // Type error
```

### Generic Inference
```typescript
function createTypedMachine<T extends { state: string }>(
  def: ContextBuilder<T>,
  logic: StateFn<T, any>,
  initial: T
) {
  return createMachine(def.build(), logic, initial);
}

// Types inferred automatically
const machine = createTypedMachine(/* ... */);
```

### IntelliSense Support
Full autocomplete for:
- Available transitions on current context
- Payload parameter types
- Return context types
- State properties

## Event Handling and Integration

### Event Flow Architecture
```
User Interaction → Actor Event → State Machine Transition → Pure Function → New State → Subscribers
```

### External Events
```typescript
// Events come from user interactions or external sources
button.addEventListener('click', () => {
  // Trigger transition
  machine.trigger('click');
});

// In state machine
function* buttonLogic(ctx: MachineContext<States, any>) {
  while (true) {
    yield* ctx.click();
    // Handle click
  }
}
```

### Internal Events and Delegation
```typescript
function* parentLogic(ctx: MachineContext<States, any>) {
  const childCtx = yield* ctx.startChild();
  // Control delegates to child machine
  yield* childLogic(childCtx);
}
```

### Event Payloads and Typing
```typescript
type ClickPayload = { x: number; y: number; button: 'left' | 'right' };

const machineDef = defineContext<States>()
  .transition('click', (ctx, payload: ClickPayload) => ({
    ...ctx,
    lastClick: payload
  }))
  .build();

function* logic(ctx: MachineContext<States, any>) {
  const newCtx = yield* ctx.click({ x: 100, y: 200, button: 'left' });
  console.log(newCtx.lastClick); // Fully typed
}
```

### Error Handling
```typescript
function* robustLogic(ctx: MachineContext<States, any>) {
  try {
    yield* ctx.riskyTransition();
  } catch (error) {
    // Handle transition errors
    yield* ctx.errorRecovery();
  }
}
```

## Library Ecosystem Integration

### Integration with Actor System
State machines are built on the actor pattern:

```typescript
import { createActor } from '@doeixd/events';

// State machines automatically use createActor internally
const machine = createMachine(/* ... */);

// Access underlying actor
const actor = machine;
actor.subscribe(state => console.log(state));
```

### Integration with Interactions
```typescript
import { createPressInteraction } from '@doeixd/events/interactions';

const pressHandler = createPressInteraction(element, {
  onPress: () => machine.trigger('press'),
  onRelease: () => machine.trigger('release')
});

// State machine handles press/release logic
function* pressLogic(ctx: MachineContext<States, any>) {
  while (true) {
    yield* ctx.press();
    console.log('Pressed');
    yield* ctx.release();
    console.log('Released');
  }
}
```

### Integration with Events Helpers
```typescript
import { debounce } from '@doeixd/events/events-helpers';

const debouncedTransition = debounce(() => {
  machine.trigger('search', { query: input.value });
}, 300);

// State machine receives debounced events
function* searchLogic(ctx: MachineContext<States, any>) {
  const resultCtx = yield* ctx.search({ query: 'hello' });
  // Process search results
}
```

### Cross-Primitive Composition
```typescript
// Combine state machine + interactions + events helpers
const complexComponent = createActor({ /* initial state */ }, (actorState) => {
  // State machine for component logic
  const machine = createMachine(/* ... */);

  // Interactions for UI events
  const interactions = createInteractions(element, {
    onFocus: () => machine.trigger('focus'),
    onBlur: () => machine.trigger('blur')
  });

  // Events helpers for optimization
  const debouncedUpdates = debounce(() => {
    actorState.context = { ...actorState.context, ...machine.getState() };
  }, 16);

  return { machine, interactions, debouncedUpdates };
});
```

## Advanced Event Patterns

### Event Debouncing
```typescript
import { debounce } from '@doeixd/events/events-helpers';

function* debouncedLogic(ctx: MachineContext<States, any>) {
  const debouncedTransition = debounce(() => ctx.quickUpdate(), 100);

  while (true) {
    yield* ctx.trigger();
    debouncedTransition();
  }
}
```

### Event Queuing
```typescript
function* queuingLogic(ctx: MachineContext<States, any>) {
  const queue: any[] = [];

  // Process events in order
  while (true) {
    if (queue.length > 0) {
      const event = queue.shift();
      yield* ctx.process(event);
    } else {
      // Wait for next event
      const nextCtx = yield* ctx.waitForEvent();
      queue.push(...nextCtx.pendingEvents);
    }
  }
}
```

### Conditional Event Processing
```typescript
const machineDef = defineContext<States>()
  .transition('conditional', (ctx, payload) => {
    if (ctx.enabled && payload.condition) {
      return { ...ctx, processed: true };
    }
    return ctx; // No change
  })
  .build();
```

### Event Multicasting
```typescript
function* multicastLogic(ctx: MachineContext<States, any>) {
  const newCtx = yield* ctx.broadcast();

  // Multiple subscribers can react to the same event
  // State machine continues with updated context
  yield* newCtx.handleResponses();
}
```

### Async Event Handling
```typescript
function* asyncLogic(ctx: MachineContext<States, any>) {
  const promiseCtx = yield* ctx.startAsync();

  // Async operation
  const result = await fetch('/api/data');

  // Continue with result
  yield* promiseCtx.complete({ data: result });
}
```

## Real-world Integration Examples

### Interactive Form Component
```typescript
import { createMachine, defineContext, MachineContext } from '@doeixd/events';
import { createPressInteraction } from '@doeixd/events/interactions';

type FormStates =
  | { state: 'idle' }
  | { state: 'editing'; value: string }
  | { state: 'submitting' }
  | { state: 'success' }
  | { state: 'error'; message: string };

const formDef = defineContext<FormStates>()
  .transition('startEdit', (ctx) => ({ state: 'editing', value: '' }))
  .transition('update', (ctx, payload: { value: string }) => ({
    ...ctx,
    value: payload.value
  }))
  .transition('submit', (ctx) => ({ state: 'submitting' }))
  .transition('success', (ctx) => ({ state: 'success' }))
  .transition('error', (ctx, payload: { message: string }) => ({
    state: 'error',
    message: payload.message
  }))
  .build();

function* formLogic(ctx: MachineContext<FormStates, any>) {
  while (true) {
    const editingCtx = yield* ctx.startEdit();

    // Wait for submit
    const submittingCtx = yield* editingCtx.submit();

    try {
      await submitForm(submittingCtx.value);
      yield* submittingCtx.success();
      break;
    } catch (error) {
      yield* submittingCtx.error({ message: error.message });
    }
  }
}

function createFormComponent(element: HTMLElement) {
  const machine = createMachine(formDef, formLogic, { state: 'idle' });

  // Integrate with interactions
  const submitButton = createPressInteraction(
    element.querySelector('button')!,
    {
      onPress: () => machine.trigger('submit')
    }
  );

  const input = element.querySelector('input')!;
  input.addEventListener('input', (e) => {
    machine.trigger('update', { value: (e.target as HTMLInputElement).value });
  });

  // Subscribe to state changes
  machine.subscribe(state => {
    element.className = `form form--${state.context.state}`;
    if (state.context.state === 'error') {
      element.querySelector('.error')!.textContent = state.context.message;
    }
  });

  return { machine, cleanup: () => submitButton.destroy() };
}
```

### Real-time Collaboration
```typescript
import { createMachine, defineContext } from '@doeixd/events';
import { createActor } from '@doeixd/events';

type CollaborationStates =
  | { state: 'connecting' }
  | { state: 'connected'; peers: string[] }
  | { state: 'syncing'; changes: any[] }
  | { state: 'disconnected' };

const collabDef = defineContext<CollaborationStates>()
  .transition('connected', (ctx, payload: { peers: string[] }) => ({
    state: 'connected',
    peers: payload.peers
  }))
  .transition('startSync', (ctx) => ({ state: 'syncing', changes: [] }))
  .transition('syncComplete', (ctx) => ({ state: 'connected', peers: ctx.peers }))
  .transition('disconnected', (ctx) => ({ state: 'disconnected' }))
  .build();

function* collaborationLogic(ctx: MachineContext<CollaborationStates, any>) {
  const connectedCtx = yield* ctx.connected({ peers: [] });

  while (true) {
    const syncingCtx = yield* connectedCtx.startSync();

    try {
      await syncChanges(syncingCtx.changes);
      yield* syncingCtx.syncComplete();
    } catch (error) {
      yield* syncingCtx.disconnected();
      break;
    }
  }
}

function createCollaborationManager(ws: WebSocket) {
  const machine = createMachine(collabDef, collaborationLogic, { state: 'connecting' });

  // WebSocket integration
  ws.onopen = () => machine.trigger('connected', { peers: [] });
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    machine.trigger(data.type, data.payload);
  };
  ws.onclose = () => machine.trigger('disconnected');

  return machine;
}
```

## Best Practices

### State Design
- Keep states focused and minimal
- Use union types for related state variations
- Include all necessary data in state objects
- Avoid optional properties when possible

### Transition Organization
- Group related transitions together
- Use descriptive names
- Keep transition functions pure and simple
- Handle errors appropriately

### Performance
- Use batching for multiple related transitions
- Avoid deep state object hierarchies
- Consider lazy initialization for complex states
- Profile and optimize hot paths

### Testing
```typescript
describe('State Machine', () => {
  it('should transition correctly', async () => {
    const machine = createMachine(/* ... */);
    const states: any[] = [];

    machine.subscribe(state => states.push(state.context));

    // Trigger transitions
    await vi.runAllTimers();

    expect(states).toEqual([
      { state: 'initial' },
      { state: 'next' }
    ]);
  });
});
```

### Error Handling
```typescript
function* resilientLogic(ctx: MachineContext<States, any>) {
  try {
    yield* ctx.riskyOperation();
  } catch (error) {
    console.error('Transition failed:', error);
    yield* ctx.errorRecovery();
  }
}
```

## FAQ

### Why generators instead of configuration objects?
Generators provide:
- Sequential, readable code flow
- Natural error handling with try/catch
- Easy debugging and stepping through
- Type-safe context passing

### How does this compare to XState's actions?
XState actions are side effects that run during transitions. This library uses pure transition functions and handles side effects in state functions, providing better testability and predictability.

### Can I use this with React/Vue/Solid?
Yes! The library integrates seamlessly with all major frameworks through the actor system and subscription patterns.

### What's the performance overhead?
Near zero. Transitions are pure functions, and the generator overhead is minimal. Batching prevents unnecessary re-renders.

### How do I handle complex state hierarchies?
Use composition: create sub-machines for complex sub-states and delegate control between them.

### Can I persist state machine state?
Yes, through the actor system. State machines are actors and can be serialized/restored like any other actor.

### How do I test state machines?
- Test transition functions in isolation (pure functions)
- Test state functions with mocked contexts
- Use the actor subscription system for integration tests

### What's the bundle size impact?
Minimal. The core library is small and tree-shakeable.

## Architecture

### The Fiber Execution Model
State machines run on a lightweight "fiber" that manages generator execution:

```typescript
class Fiber<T> {
  run(): Fiber<T> {
    const result = this.generator.next(resumeValue);

    if (result.done) return this;

    if (isTransition(result.value)) {
      const newContext = executeTransition(result.value);
      this.context = newContext;
      return this.run(newContext);
    }

    // Handle other instructions...
  }
}
```

### Generator Delegation
State functions can delegate to other generators:

```typescript
function* parent(ctx) {
  const childCtx = yield* ctx.startChild();
  yield* childLogic(childCtx); // Control transfers to child
}
```

### Type System Design
The type system ensures:
- Only valid transitions are callable on current context
- Payload types are enforced
- Return contexts are correctly typed
- State functions receive properly typed contexts

### Performance Characteristics
- **Memory**: Minimal footprint, no large state charts
- **CPU**: Pure function transitions, no interpretation
- **Bundle**: Tree-shakeable, small core
- **Runtime**: Zero overhead for defined transitions

This architecture provides the best of both worlds: the expressiveness of state machines with the performance and safety of typed functional programming.