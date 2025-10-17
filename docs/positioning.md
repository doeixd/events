# Architectural Comparison: `@doeixd/events` in the Reactive Ecosystem

Choosing a state and event management library is one of the most significant architectural decisions you can make. It shapes not just your code, but your entire approach to data flow and application logic.

`@doeixd/events` is a "synthetic" library that blends concepts from the best tools in the ecosystem. To understand its value, we must compare it philosophically—not just on features, but on mental models and problem-solving approaches.

This guide provides a detailed architectural comparison with four major paradigms, helping you understand the trade-offs and choose the right tool for your specific challenge.

**The Contenders:**
1.  **RxJS:** The powerhouse of Reactive Stream programming.
2.  **SolidJS Signals:** The pinnacle of fine-grained, auto-tracking reactivity.
3.  **XState:** The formal standard for Statecharts and complex state machines.
4.  **Redux / The Elm Architecture (TEA):** The classic pattern for centralized, immutable state.

<br />

### At a Glance: A Philosophical Cheat Sheet

| Library/Paradigm | Core Philosophy | Mental Model | Best For... |
| :--- | :--- | :--- | :--- |
| **`@doeixd/events`** | **Unified & Pragmatic** | A professional kitchen with specialized, integrated stations for every task. | Applications that need a cohesive blend of stream manipulation, declarative UI interactions, and flexible state management patterns, all in one toolkit. |
| **RxJS** | **Everything is a Stream**| A hydroelectric power grid, managing and transforming vast flows of data through a network of operators. | Data-intensive, complex asynchronous pipelines where powerful stream manipulation is the primary, central concern of the application. |
| **SolidJS Signals**| **Automatic & Transparent** | A magical, self-updating spreadsheet. Change a cell, and every cell that depends on it recalculates instantly and automatically, without explicit formulas. | Building highly performant, fine-grained UIs *within the SolidJS ecosystem*. |
| **XState** | **Correctness through Formality** | A formal engineering blueprint for a machine. Every possible state, transition, and event is explicitly defined and validated before construction. | Mission-critical, complex logic where behavioral correctness must be provably guaranteed (e.g., shopping carts, wizards, protocols). |
| **Redux / TEA** | **A Single Source of Truth** | A company's central, immutable accounting ledger. Every change is a recorded transaction, creating a predictable, auditable history for the entire organization. | Large-scale applications requiring a centralized, predictable, and easily debuggable global state. |

<br />

### 1. vs. RxJS: The Powerhouse Stream Processor

RxJS is the most powerful and comprehensive library for reactive programming in JavaScript. `@doeixd/events`'s functional core is a direct descendant of its ideas, but it makes different trade-offs in favor of focus and ergonomics for UI development.

**Architectural Deep Dive:**

| Aspect | RxJS | `@doeixd/events` |
| :--- | :--- | :--- |
| **Scope & API Surface** | **Vast & General-Purpose.** Hundreds of operators, Schedulers, and Subject types. Can do anything, but intimidating. | **Curated & UI-Focused.** Smaller, opinionated toolkit tailored for UI development. Less power, gentler learning curve. |
| **Ergonomics for UI** | **Verbose.** Creating event pairs requires manual Subject setup. | **Concise & Intuitive.** `[Handler, Emitter]` tuple directly models event source/sink needs. |
| **Cancellation Model** | **Internal & Subscription-based.** Custom Subscription/teardown logic. Powerful but RxJS-specific. | **Platform-Native & Automatic.** Uses `AbortSignal` for seamless `fetch` integration and automatic management. |
| **Primary Focus**| **Data Flow Orchestration.** Excels at complex data pipelines of any type. | **Event & State Unification.** Complete toolkit with state patterns (`Actor`, `Reducer`) and UI interactions. |

**Comparative Code Example: A Search Input**

```typescript
// RxJS Approach
import { fromEvent, Subject } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

const input = document.querySelector('input');
const search$ = fromEvent(input, 'input').pipe(
  map(event => (event.target as HTMLInputElement).value),
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query => api.search(query)) // switchMap handles cancellation
);
search$.subscribe(results => updateUI(results));
```

```typescript
// @doeixd/events Approach
import { dom, debounce, createOperator } from '@doeixd/events/operators';

// Define custom operators
const filter = <T>(predicate: (data: T) => boolean) =>
  createOperator<T>((data, emit, halt) => {
    if (predicate(data)) emit(data);
    else halt();
  });

const map = <T, R>(transformFn: (data: T) => R) =>
  createOperator<T>((data, emit) => {
    emit(transformFn(data));
  });

const onSearchQuery = filter((query: string) => query.length > 2)(
                      map((e: Event) => (e.target as HTMLInputElement).value)(
                      debounce(300)(dom.input(input))));

// The async handler benefits from automatic cancellation via the `meta.signal`
onSearchQuery(async (query, meta) => {
  try {
    const results = await api.search(query, { signal: meta.signal });
    updateUI(results);
  } catch (e) {
    if (e.name !== 'AbortError') throw e;
  }
});
```

**When to Choose:**
-   **RxJS** for applications where core logic is "data pipelines" with complex stream manipulation, merging, and timing (e.g., real-time analytics, data synchronization).
-   **`@doeixd/events`** for applications focused on responding to user/system events to manage state, with essential UI stream tools minus RxJS's conceptual overhead.

<br />

### 2. vs. SolidJS Signals: The Automatic Reactivity Engine

SolidJS's reactivity system is a masterpiece of performance and simplicity, achieved through a deep integration with its compiler. It has heavily influenced the declarative state patterns in `@doeixd/events`.

**Architectural Deep Dive:**

| Aspect | SolidJS Signals | `@doeixd/events` |
| :--- | :--- | :--- |
| **Subscription Model** | **Automatic & Implicit.** Subscriptions created magically when signals are read in reactive scopes. No manual cleanup needed. | **Manual & Explicit.** Must call `.subscribe()` or pass callback to `Handler`. Cleanup is your responsibility (or handled by framework integrations). |
| **Dependency Tracking** | **Runtime Graph.** Precise dependency graph built at runtime. Only dependent code re-runs when signals change. | **Push-based.** Pushes values to all explicit subscribers when events emit or subjects update. |
| **Scope** | **Framework-Integrated.** Deeply tied to Solid compiler. Power comes from this integration; not portable. | **Framework-Agnostic.** Standalone library usable in React, Vue, Svelte, or vanilla TypeScript. |

**Comparative Code Example: A Derived Full Name**

```typescript
// SolidJS Approach
import { createSignal, createEffect } from 'solid-js';

const [firstName, setFirstName] = createSignal('John');
const [lastName, setLastName] = createSignal('Smith');

// The `fullName` is a derived signal that auto-updates
const fullName = () => `${firstName()} ${lastName()}`;

// This effect subscribes to `fullName` automatically and implicitly
createEffect(() => {
  console.log('Name changed:', fullName());
});

setFirstName('Jane'); // The effect re-runs automatically.
```

```typescript
// @doeixd/events Approach
import { createSubject, select } from '@doeixd/events';

const firstName = createSubject('John');
const lastName = createSubject('Smith');

// `select` explicitly lists its dependencies to create a derived subject
const fullName = select([firstName, lastName], () => `${firstName()} ${lastName()}`);

// The subscription is explicit
const unsubscribe = fullName.subscribe(name => {
  console.log('Name changed:', name);
});

firstName('Jane'); // The subscription fires.
```

**When to Choose:**
-   **SolidJS Signals** when building applications with SolidJS. Get full compiler-optimized, fine-grained reactivity.
-   **`@doeixd/events`** when you want SolidJS-style declarative patterns in other frameworks (React, Vue, etc.), accepting manual subscription management.

<br />

### 3. vs. XState: The Formal State Machine Guardian

XState is the definitive implementation of Statecharts for JavaScript, providing a way to formally model and execute complex application logic with mathematical precision. `@doeixd/events`'s `createGuardedReducer` is a pragmatic, lightweight alternative.

**Architectural Deep Dive:**

| Aspect | XState | `@doeixd/events` (`createGuardedReducer`) |
| :--- | :--- | :--- |
| **Formalism & Power** | **High.** Complete Statechart implementation with hierarchical states, parallel states, history, guards, and actors. | **Low ("State Machine Lite").** Core compile-time safety via discriminated unions, without full formal structure. State machine, not statechart. |
| **Configuration**| **Declarative Object.** Large configuration objects that can be visualized and analyzed by external tools. | **Functional.** Simple, co-located functions in `actions` object. Less formal but lightweight and code-close. |
| **Ecosystem** | **Rich.** Visualizer (Stately Studio), testing tools, and model-based testing capabilities. | **Integrated.** One tool within broader `@doeixd/events` toolkit, works seamlessly with `Handlers`, `Actors`, etc. |
| **Side Effects** | **Managed & Declarative.** Side effects declared in machine definition, executed by interpreter. Separates logic from effects. | **Imperative (or via `Actor`).** Side effects handled outside reducer via `effects` callback or `Actor` management. |

**Comparative Code Example: A Promise Machine**

```typescript
// XState Approach
import { createMachine, interpret } from 'xstate';

const promiseMachine = createMachine({
  id: 'promise',
  initial: 'pending',
  states: {
    pending: { on: { RESOLVE: 'resolved', REJECT: 'rejected' } },
    resolved: { type: 'final' },
    rejected: { type: 'final' }
  }
});

const promiseService = interpret(promiseMachine)
  .onTransition(state => console.log(state.value))
  .start();

promiseService.send({ type: 'RESOLVE' }); // Logs 'resolved'
```

```typescript
// @doeixd/events Approach
import { createGuardedReducer } from '@doeixd/events';

type PromiseState = 
  | { status: 'pending' }
  | { status: 'resolved' }
  | { status: 'rejected' };

const promiseMachine = createGuardedReducer({
  initialState: { status: 'pending' } as PromiseState,
  actions: {
    resolve: (state: { status: 'pending' }) => ({ status: 'resolved' }),
    reject: (state: { status: 'pending' }) => ({ status: 'rejected' })
  }
});

let machine = promiseMachine;
machine.subscribe(state => console.log(state.status));

if (machine.status === 'pending') {
  machine = machine.dispatch.resolve(); // Logs 'resolved'. Type-safe.
}
```

**When to Choose:**
-   **XState** for complex logic requiring diagrams with nested states, parallel states, or formal verification.
-   **`createGuardedReducer`** for component-level state with simple, flat lifecycles needing transition safety (e.g., preventing `fetch` from `loading` state).

<br />

### 4. vs. Redux / The Elm Architecture (TEA): The Central Ledger

Redux, inspired by The Elm Architecture, popularised the pattern of a single, centralized, immutable state store for entire applications.

**Architectural Deep Dive:**

| Aspect | Redux / TEA | `@doeixd/events` (`createReducer` / `Actor`) |
| :--- | :--- | :--- |
| **Store Model** | **Global Singleton.** Single global store representing entire application state. | **Local & Instantiable.** Standalone instances for component, feature, or global state. More flexible, less coupled. |
| **API** | **Message Passing.** Dispatch action objects with types and payloads. Requires action creators and constants. | **Direct & Fluent.** Call methods directly: `store.dispatch.increment(5)` or `cartActor.addItem(...)`. Fully type-safe, no boilerplate. |
| **Side Effects** | **Middleware.** Async logic handled by separate middleware layer (Thunk, Saga). Reducer must remain pure. | **Integrated (`Actor`).** `createActor` designed as home for stateful side effects, co-locating state with async logic. |
| **Mutability** | **Strictly Immutable.** All state updates must be immutable. | **Flexible.** `createReducer` enforces immutability. `createActor` allows mutable internal updates for complex logic. |

**Comparative Code Example: Incrementing a Counter**

```typescript
// Redux Toolkit Approach
import { createSlice, configureStore } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state, action) => { state.value += action.payload; },
  },
});
const store = configureStore({ reducer: { counter: counterSlice.reducer } });

store.dispatch(counterSlice.actions.increment(5));
```

```typescript
// @doeixd/events Approach (with a Reducer)
import { createReducer } from '@doeixd/events';

const counterReducer = createReducer({
  initialState: { value: 0 },
  actions: {
    increment: (state, amount: number) => ({ value: state.value + amount }),
  }
});

let counter = counterReducer.dispatch.increment(5);
```

**When to Choose:**
-   **Redux** for large, multi-developer applications needing single auditable source of truth, time-travel debugging, and strict separation of concerns.
-   **`@doeixd/events` state primitives** for flexible, decentralized state management with modern type-safe APIs for specific features or components.