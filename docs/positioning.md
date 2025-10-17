# Architectural Comparison: `@doeixd/events` in the Reactive Ecosystem

Choosing a state and event management library is one of the most significant architectural decisions you can make. It dictates not just how you write code, but how you *think* about the flow of data and the logic of your application. The right choice can lead to a clean, scalable, and delightful developer experience, while the wrong one can lead to complexity and frustration.

`@doeixd/events` is a "synthetic" library, intentionally borrowing and blending concepts from the best-in-class tools in the ecosystem. To truly understand its power and place, we must compare it not just on features, but on philosophy, mental models, and the specific problems it is designed to solve.

This guide provides a detailed architectural comparison between `@doeixd/events` and four major paradigms, helping you understand the trade-offs and choose the right tool for your specific challenge.

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
| **Scope & API Surface** | **Vast & General-Purpose.** A massive library with hundreds of operators, Schedulers for time control, and multiple Subject types. It can do anything, which can be intimidating. | **Curated & UI-Focused.** A smaller, opinionated set of tools specifically tailored for UI development and application state. Less power, but a much gentler learning curve. |
| **Ergonomics for UI** | **Verbose.** The common UI task of creating a listenable/emittable event pair requires manually creating and exposing a `Subject`. | **Concise & Intuitive.** The `[Handler, Emitter]` tuple from `createEvent` is a highly ergonomic pattern that directly models the common need for an event source and sink. |
| **Cancellation Model** | **Internal & Subscription-based.** Uses its own `Subscription` and `teardown` logic. Powerful but requires learning the RxJS-specific patterns. | **Platform-Native & Automatic.** Uses the modern `AbortSignal` for cancellation, which integrates seamlessly with `fetch` and is managed automatically on new emissions. |
| **Primary Focus**| **Data Flow Orchestration.** RxJS excels at complex data pipelines. It's a tool for transforming and composing streams of *any* data. | **Event & State Unification.** `@doeixd/events` is a complete application toolkit that includes high-level state patterns (`Actor`, `Reducer`) and UI interactions alongside its stream capabilities. |

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
import { dom, debounce, map, filter } from '@doeixd/events/operators';

const onSearchQuery = map(e => e.target.value)(
                      debounce(300)(dom.input(input)));

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

**The Litmus Test:**
-   **Choose RxJS** if your application's core logic can be described as "data pipelines." If you find yourself needing to frequently combine, merge, fork, and manage streams of data with complex timing (e.g., real-time analytics, complex data synchronization), RxJS is the unparalleled choice.
-   **Choose `@doeixd/events`** if your application's core logic is about **responding to user and system events to manage state**. It gives you the essential stream-shaping tools you need for UI without the full conceptual overhead of RxJS.

<br />

### 2. vs. SolidJS Signals: The Automatic Reactivity Engine

SolidJS's reactivity system is a masterpiece of performance and simplicity, achieved through a deep integration with its compiler. It has heavily influenced the declarative state patterns in `@doeixd/events`.

**Architectural Deep Dive:**

| Aspect | SolidJS Signals | `@doeixd/events` |
| :--- | :--- | :--- |
| **Subscription Model** | **Automatic & Implicit ("Auto-tracking").** A subscription is created *magically* whenever a signal is read inside a reactive scope (`createEffect`, JSX). No manual cleanup is needed. | **Manual & Explicit.** You must explicitly call `.subscribe()` or pass a callback to a `Handler` to create a subscription. Cleanup is your responsibility (or handled by integrations like React hooks). |
| **Dependency Tracking** | **Runtime Graph.** Solid builds a precise dependency graph at runtime. When a signal changes, only the *exact* code that depends on it re-runs. | **Push-based.** When an event is emitted or a subject is updated, it pushes that value out to all of its explicit subscribers, regardless of whether they "need" it. |
| **Scope** | **Framework-Integrated.** Deeply tied to the Solid compiler. Its power comes from this integration; it is not designed to be portable. | **Framework-Agnostic.** Designed from the ground up to be a standalone library that can be used in React, Vue, Svelte, or vanilla TS. |

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

**The Litmus Test:**
-   **Choose SolidJS Signals** if you are **building an application with SolidJS**. Period. You get the full, unadulterated power of its compiler-optimized, fine-grained reactivity.
-   **Choose `@doeixd/events`** when you admire the **declarative patterns of SolidJS but are working in another framework** (like React). It allows you to write Solid-style, event-driven state logic anywhere, with the trade-off of managing subscriptions yourself.

<br />

### 3. vs. XState: The Formal State Machine Guardian

XState is the definitive implementation of Statecharts for JavaScript, providing a way to formally model and execute complex application logic with mathematical precision. `@doeixd/events`'s `createGuardedReducer` is a pragmatic, lightweight alternative.

**Architectural Deep Dive:**

| Aspect | XState | `@doeixd/events` (`createGuardedReducer`) |
| :--- | :--- | :--- |
| **Formalism & Power** | **High.** A complete and rigorous implementation of the academic Statechart model. Supports hierarchical states, parallel states, history, guards, actors, and more. | **Low ("State Machine Lite").** Provides the core benefit—compile-time transition safety via discriminated unions—without the full formal structure. It's a state machine, not a statechart. |
| **Configuration**| **Declarative Object.** State machines are defined as large configuration objects, which can be visualized and analyzed by external tools. | **Functional.** Transitions are defined as simple, co-located functions in the `actions` object. Less formal but can feel more lightweight and closer to the code. |
| **Ecosystem** | **Rich.** Has an extensive ecosystem including a visualizer (Stately Studio), testing tools, and model-based testing capabilities. | **Integrated.** It's just one tool within the broader `@doeixd/events` toolkit, designed to work seamlessly with `Handlers`, `Actors`, etc. |
| **Side Effects** | **Managed & Declarative.** Side effects (`actions`, `services`) are explicitly declared in the machine definition and executed by an "interpreter". This separates logic from effects. | **Imperative (or via `Actor`).** Side effects are typically handled outside the reducer, either via the `effects` callback or by having an `Actor` manage the reducer. |

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

**The Litmus Test:**
-   **Choose XState** when your logic is **complex enough that you would draw a diagram of it on a whiteboard**. If it involves nested states (e.g., a "playing" state with child states for "buffering" and "seeking"), parallel states (e.g., managing font style and font weight independently), or requires formal verification, XState is the correct and safer choice.
-   **Choose `createGuardedReducer`** for **component-level state that has a simple, flat lifecycle**. If you just want to ensure you can't `fetch` from a `loading` state, the guarded reducer provides immense safety with minimal boilerplate.

<br />

### 4. vs. Redux / The Elm Architecture (TEA): The Central Ledger

Redux, inspired by The Elm Architecture, popularised the pattern of a single, centralized, immutable state store for entire applications.

**Architectural Deep Dive:**

| Aspect | Redux / TEA | `@doeixd/events` (`createReducer` / `Actor`) |
| :--- | :--- | :--- |
| **Store Model** | **Global Singleton.** By convention, a Redux application has a single, global store that represents the entire application state. | **Local & Instantiable.** Reducers and Actors are standalone instances. You can create many of them for component state, feature state, or global state. It's more flexible and less coupled. |
| **API** | **Message Passing.** You `dispatch` an action object (e.g., `{ type: 'INCREMENT', payload: 5 }`). This requires action creators and string constants. | **Direct & Fluent.** You call a method directly: `store.dispatch.increment(5)` or `cartActor.addItem(...)`. This is fully type-safe and avoids boilerplate. |
| **Side Effects** | **Middleware.** Asynchronous logic and side effects are handled by a separate layer of middleware, like Redux Thunk or Redux Saga. The reducer itself must remain pure. | **Integrated (`Actor`).** The `createActor` primitive is explicitly designed to be the home for stateful side effects, co-locating the state with the async logic that affects it. |
| **Mutability** | **Strictly Immutable.** All state updates must be immutable. | **Flexible.** `createReducer` enforces immutability. `createActor` allows for an internal, mutable style of updates, which can be more ergonomic for complex, multi-step logic. |

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

**The Litmus Test:**
-   **Choose Redux** when you are building a **large, multi-developer application that benefits from a single, auditable source of truth**. Its powerful DevTools, which allow for time-travel debugging, are a massive asset for traceability. The strict separation of concerns (state, actions, side effects) can enforce discipline on a large team.
-   **Choose `@doeixd/events`'s state primitives (`Reducer` or `Actor`)** for **more flexible, de-centralized state management**. It's perfect for when you want the structure of a reducer or the encapsulation of an actor for a specific feature or complex component, without committing your entire application to a global singleton. It offers a more modern, type-safe API for both dispatch and side effects.