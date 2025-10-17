# The Architect's Guide to `@doeixd/events`: When to use a Primitive

In modern software development, a great divide separates two of our most critical concerns. On one side, we have **event handling**—the often chaotic, imperative world of `addEventListener`, where callbacks can quickly devolve into a tangled mess of stateful closures and manual cleanup. On the other, we have **state management**—the elegant, declarative world of libraries like Redux or SolidJS, where state is a predictable, traceable result of actions and signals.

`@doeixd/events` was born from an ambitious question: What if we could bridge this divide? What if we could treat UI events with the same declarative clarity and robust structure we apply to our application state?

The result is a mature, feature-rich toolkit that offers a unified theory for event-driven applications. It combines the reactive philosophy of SolidJS, the declarative composition of Remix Events, the transformative power of RxJS operators, and a fanatical focus on safety and resource management.

This guide is for the architect. It moves beyond simple API documentation to explore the core philosophy behind the library's main primitives, providing the mental models and heuristics you need to build robust, maintainable, and elegant event-driven applications.

### The Mental Model: A Professional Software Kitchen

To truly understand the tools in this library, let's imagine we're building a feature, not as code, but as a dish in a professional kitchen.

> In our kitchen, raw ingredients arrive (`mousedown`, `keyup`, API responses). These are our low-level events. Our job is to turn them into a final, plated dish—a fully interactive, stateful UI.

Each primitive in `@doeixd/events` is a different part of our kitchen's workflow, a specialized station with its own tools and responsibilities.

### The Four Stations of the Kitchen

| Station | Primitive | Core Job | In the Kitchen... |
| :--- | :--- | :--- | :--- |
| **Prep Station** | `createOperator` | **Transform a Stream** | The chef with the knives and strainers, preparing a single ingredient for the next step. |
| **Assembly Line** | `createInteraction` | **Synthesize a Behavior**| The skilled sous-chef who combines multiple prepared ingredients to create a new, complex component of the dish. |
| **Recipe Book** | `createReducer` | **Manage Structured State**| The formal, immutable recipe that guarantees a consistent, auditable result every time. |
| **Grill Station** | `createActor` | **Encapsulate a "Thing"**| The master chef of a specific station, managing their own tools, inventory, and complex processes. |

<br />

## Part 1: The Functional Core — Streams and Transformations

At the heart of `@doeixd/events` lies a functional, stream-based paradigm for managing data flow. This is where raw events are tamed and prepared.

### The `Handler`: A River of Events

A `Handler<T>` is more than just a callback registry; it's a chainable, transformable stream of events. Think of it as a river of data. You can subscribe to the river to observe the data, or you can place tools in the river to change its flow.

The `Handler`'s return type intelligently changes based on your subscription:
-   If your callback returns `void`, you get back an `unsubscribe` function (you've reached the end of the river).
-   If your callback returns a *value*, you get back a *new `Handler`* of that value's type (you've created a new tributary).

This enables elegant, linear data-flow programming:

```typescript
const [onRawInput, emitRawInput] = createEvent<string>();

// Chain 1: Filter out empty inputs
const onValidInput = onRawInput(value => (value.length > 0 ? value : halt()));

// Chain 2: Transform the valid string into an object
const onUserObject = onValidInput(name => ({ id: Date.now(), name, status: 'new' }));

// Subscribe to the final, transformed stream
onUserObject(user => console.log('New user:', user)); // `user` is fully typed
```

### The Prep Station: `createOperator`

> **An operator is a tool that acts upon a single ingredient to prepare it for the next step.**

Operators are the knives, strainers, and sous-vide machines of our kitchen. They are higher-order functions that take a `Handler` and return a new, modified `Handler`.

**When to use `createOperator`:**
-   **Timing Control:** To control *when* an event is processed (`debounce`, `throttle`).
-   **Data Transformation:** To change the shape of event data (`map`).
-   **Filtering & Guarding:** To conditionally stop an event from proceeding (`filter`).

**Example 1: Perfecting the search input.**
```typescript
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

const onRawInput = dom.input(searchInput);

// A pipeline of operators preparing the raw input stream
const onSearchQuery = filter((query: string) => query.length > 2)( // 3. Only search for meaningful queries
                       map((event: Event) => (event.target as HTMLInputElement).value)(    // 2. Extract just the string value
                       debounce(300)(onRawInput)));         // 1. Wait for the user to pause typing

onSearchQuery(query => {
  // `query` is a perfectly prepared, debounced string, ready for the API.
  api.search(query);
});
```

**Example 2: Creating a custom `map` operator.**
This shows how you can build your own reusable stream transformers.
```typescript
// Define our custom operator
const map = <T, R>(transformFn: (data: T) => R) => 
  createOperator<T>((data, emit) => {
    emit(transformFn(data));
  });

// Use it to transform a click event into its coordinates
const onClickCoordinates = map(event => ({ x: event.clientX, y: event.clientY }))(dom.click(window));

onClickCoordinates(coords => {
  console.log('User clicked at:', coords); // { x: 123, y: 456 }
});
```
Operators give you fine-grained control over the *flow* of a single event stream, ensuring that by the time the data reaches its destination, it's in the exact shape and cadence you need.

<br />

## Part 2: The Declarative Layer — Behaviors and Composition

While the functional core is for data flow, the declarative layer is for applying logic to the UI and defining user behaviors.

### The Assembly Line: `createInteraction`

> **An interaction is a skilled sous-chef who combines multiple prepared ingredients to create a new, complex component of a dish.**

An interaction's job is to **synthesize** a new, high-level, semantic event from multiple low-level event sources. It takes the raw parts (`mousedown`, `keydown`, `touchstart`) and assembles them into a finished product (a `press` event).

**When to use `createInteraction`:**
-   **Defining Semantic User Actions:** To create business-logic events like `press`, `drag`, `swipe`, or `longPress`.
-   **Normalizing Inputs:** To make a single action work across mouse, keyboard, and touch.
-   **Building a Design System:** To create a palette of reusable, consistent user behaviors for all your components.

**Example 1: Creating the built-in `press` behavior.**
```typescript
import { createInteraction, events, dom } from '@doeixd/events';

// The "recipe" for synthesizing a `press` event from raw inputs
const press = createInteraction('press', ({ target, dispatch }) => {
  const onMouseDown = dom.mousedown(target);
  const onKeyDown = dom.keydown(target);
  
  const downSub = onMouseDown(e => dispatch({ detail: { originalEvent: e } }));
  const keySub = onKeyDown(e => {
    if (e.key === 'Enter') dispatch({ detail: { originalEvent: e } });
  });

  return [downSub, keySub];
});

// The "dish" uses the new `press` component declaratively.
events(button, [
  press(e => console.log('Button was pressed!'))
]);
```
**Example 2: Building a `drag` interaction.**
This interaction tracks mouse movement between `mousedown` and `mouseup` and dispatches the delta.
```typescript
const drag = createInteraction<Element, { dx: number; dy: number }>(
  'drag',
  ({ target, dispatch }) => {
    const onMouseDown = dom.mousedown(target);
    const onMouseMove = dom.mousemove(window);
    const onMouseUp = dom.mouseup(window);

    const downSub = onMouseDown(downEvent => {
      downEvent.preventDefault();
      let lastX = downEvent.clientX;
      let lastY = downEvent.clientY;
      
      const moveSub = onMouseMove(moveEvent => {
        const dx = moveEvent.clientX - lastX;
        const dy = moveEvent.clientY - lastY;
        lastX = moveEvent.clientX;
        lastY = moveEvent.clientY;
        dispatch({ detail: { dx, dy } });
      });

      // The mouseup listener cleans up the mousemove listener
      const upSub = onMouseUp(() => {
        moveSub(); // Unsubscribe from mousemove
        upSub();   // Unsubscribe from this mouseup
      });
    });

    return downSub; // The mousedown is the only persistent listener
  }
);
```

Interactions allow you to elevate your thinking from "a mousedown occurred" to "the user is dragging the element," encapsulating the complex implementation details.

<br />

## Part 3: The State Management Core — Predictability and Encapsulation

Once events have been prepared and synthesized, they need to affect state. `@doeixd/events` provides two powerful, distinct patterns for state management.

### The Recipe Book: `createReducer`

> **A reducer is the formal, immutable recipe that guarantees a consistent result every time.**

A reducer is for managing complex, structured state with an immutable, predictable pattern. It is the central accounting ledger for a feature. Every state change is a formal, recorded transaction (`dispatch`). You can't just randomly change a number; you must issue a specific transaction (`increment`).

**When to use `createReducer`:**
-   **Complex, Interrelated State:** When one piece of state changing can affect others in predictable ways.
-   **Formal State Machines:** When you have clearly defined states and transitions (e.g., `idle` → `loading` → `success`).
-   **Auditability and Testability:** When you need to easily test your state logic in isolation.
-   **Team Collaboration:** When you need a strong, shared structure for state management.

**Example 1: Managing a data fetch state machine.**
```typescript
const fetchMachine = createGuardedReducer({
  initialState: { status: 'idle' } as FetchState,
  actions: {
    fetch: (state: { status: 'idle' } | { status: 'error' }) => ({ status: 'loading' }),
    resolve: (state: { status: 'loading' }, data: string) => ({ status: 'success', data }),
    reject: (state: { status: 'loading' }, error: string) => ({ status: 'error', error }),
  }
});

let store = fetchMachine;
if (store.status === 'idle') {
  store = store.dispatch.fetch(); // This is type-safe!
  // store.dispatch.resolve('data'); // This would be a COMPILE ERROR!
}
```

**Example 2: A simple, non-guarded reducer for a counter.**
```typescript
const counterReducer = createReducer({
  initialState: { count: 0 },
  actions: {
    increment: (state, amount: number) => ({ count: state.count + amount }),
    decrement: (state, amount: number) => ({ count: state.count - amount }),
    reset: (state) => ({ count: 0 }),
  },
  effects: (newState, oldState) => {
    console.log(`Count changed from ${oldState.count} to ${newState.count}`);
  }
});

let counter = counterReducer;
counter = counter.dispatch.increment(5); // Logs: Count changed from 0 to 5
counter = counter.dispatch.reset();    // Logs: Count changed from 5 to 0
```
The reducer pattern, especially with `createGuardedReducer`, brings mathematical certainty to your state logic, making impossible states truly impossible.

### The Grill Station: `createActor`

> **An actor is the master chef of a specific station, managing their own ingredients, tools, and processes.**

An actor is a self-contained, stateful object. It bundles its own internal, mutable state with the methods that can change it. It's the Grill Chef: you don't manage the grill's temperature; you just ask for a medium-rare steak, and the chef handles the complex, stateful process.

**When to use `createActor`:**
-   **Modeling Stateful Components:** When a UI component has complex internal state that doesn't need to be global (a video player, a date picker, a shopping cart).
-   **Managing Services:** For representing background services like a WebSocket connection manager.
-   **When State and Side-Effects are Tightly Coupled:** If updating state almost always requires an API call or a timer, an actor is a natural fit.

**Example 1: Modeling a reusable shopping cart.**
```typescript
const cartActor = createActor(
  { items: [], total: 0 },
  (context) => { // `context` is the actor's private, mutable state
    const [addItemHandler, addItem] = createEvent<{ id: string; price: number }>();

    addItemHandler(item => {
      if (typeof item === 'symbol' || item === 'dummy') return;
      context.items.push(item);
      context.total += item.price;
    });

    // Expose the actor's public "control panel"
    return { addItem };
  }
);

cartActor.subscribe(state => console.log('Cart updated:', state));
cartActor.addItem({ id: 'prod1', price: 100 });
```

**Example 2: A WebSocket connection manager.**
This actor manages the connection state and encapsulates the side-effects of sending/receiving messages.
```typescript
const socketActor = createActor(
  { status: 'disconnected', socket: null as WebSocket | null },
  (context) => {
    const [connectHandler, connect] = createEvent<string>();
    const [sendHandler, send] = createEvent<any>();
    const [disconnectHandler, disconnect] = createEvent();

    connectHandler(url => {
      if (typeof url === 'symbol' || url === 'dummy') return;
      if (context.socket) return;
      context.socket = new WebSocket(url);
      context.status = 'connecting';
      context.socket.onopen = () => context.status = 'connected';
      context.socket.onclose = () => {
        context.status = 'disconnected';
        context.socket = null;
      };
    });

    sendHandler(data => {
      if (typeof data === 'symbol' || data === 'dummy') return;
      if (context.status === 'connected') {
        context.socket.send(JSON.stringify(data));
      }
    });

    disconnectHandler(() => {
      context.socket?.close();
    });

    return { connect, send, disconnect };
  }
);
```
The actor pattern excels at encapsulating complexity, providing a clean public API while hiding the messy internal details.

<br />

## Actors vs. Interactions: Choosing the Right Tool

While both **Actors** and **Interactions** help you build complex, event-driven behavior, they solve different problems and work at different levels of abstraction. Understanding when to use each is crucial for clean architecture.

### The Core Difference

| Aspect | Interactions (`createInteraction`) | Actors (`createActor`) |
| :--- | :--- | :--- |
| **Purpose** | **Synthesize new events** from multiple low-level sources | **Encapsulate stateful behavior** with methods and internal logic |
| **Scope** | **Event transformation** - takes events in, emits different events out | **State management** - maintains internal state, exposes methods |
| **Lifecycle** | **Stateless & reusable** - same interaction can be used everywhere | **Stateful & instance-based** - each actor has its own state |
| **API Style** | **Declarative attachment** - `events(element, [interaction])` | **Direct method calls** - `actor.method()` |
| **Complexity** | **Multi-event coordination** - combining mouse, keyboard, touch | **Stateful side effects** - async operations, timers, complex logic |

### When to Use Interactions

**Interactions** are your go-to for defining **semantic user actions** that work across different input methods:

```typescript
// A "press" interaction normalizes clicks, taps, and key presses
const press = createInteraction('press', ({ target, dispatch }) => {
  const onMouseDown = dom.mousedown(target);
  const onKeyDown = dom.keydown(target);

  const downSub = onMouseDown(e => dispatch({ detail: { originalEvent: e } }));
  const keySub = onKeyDown(e => {
    if (e.key === 'Enter') dispatch({ detail: { originalEvent: e } });
  });

  return [downSub, keySub];
});

// Use it declaratively anywhere
events(button, [press(e => console.log('Pressed!'))]);
```

**Choose Interactions when:**
- You need to normalize different input types (mouse + keyboard + touch)
- You're defining reusable UI behaviors (drag, swipe, longPress)
- The behavior is primarily about event transformation, not state management
- You want declarative, composable event handling

### When to Use Actors

**Actors** excel at **encapsulating complex, stateful logic** with a clean public interface:

```typescript
// A shopping cart actor manages state and provides methods
const cartActor = createActor(
  { items: [], total: 0 },
  (context) => {
    const [addItemHandler, addItem] = createEvent<Item>();

    addItemHandler(item => {
      if (typeof item === 'symbol' || item === 'dummy') return;
      context.items.push(item);
      context.total += item.price;
    });

    return { addItem };
  }
);

// Direct method calls with encapsulated state
cartActor.addItem({ id: 'prod1', price: 100 });
console.log(cartActor()); // { items: [...], total: 100 }
```

**Choose Actors when:**
- You need to manage complex internal state
- The behavior involves async operations, timers, or side effects
- You want to encapsulate business logic with a clean API
- State changes need to be tracked and subscribed to
- You're building services or complex components

### How They Work Together

**Interactions** and **Actors** are complementary and often work together:

```typescript
// An interaction captures the UI event
events(addButton, [
  press(() => {
    // The actor handles the business logic
    cartActor.addItem(currentItem);
  })
]);
```

**The Flow:** UI Events → **Interactions** (normalize) → **Actors** (process state) → State Updates

**Interactions** handle the "what happened" (user pressed a button), while **Actors** handle the "what to do about it" (update cart, save to server, etc.).

### The Decision Framework

- **Use Interactions** for **UI event normalization** and **semantic behaviors**
- **Use Actors** for **stateful business logic** and **complex operations**
- **Combine them** for complete event-driven features

This separation creates clean, testable, and maintainable code where each primitive does exactly what it was designed for.

<br />

## The Full Kitchen Workflow: Architectural Patterns

Mastery comes from orchestrating these primitives into a clean, unidirectional flow.

1.  **The Standard Flow: UI to State**
    A user performs an action, which is captured by an **Interaction** or prepared by an **Operator**. This clean event then calls a method on an **Actor** or dispatches an action to a **Reducer**, which updates the state and triggers a UI re-render.
    > `press` **Interaction** → `cartActor.addItem()` → State Update → UI Re-renders

2.  **Internal Logic: Operators inside Actors**
    An **Actor** can use **Operators** internally to manage its own complex event logic.
    > A `webSocketActor` might use a `throttle` **Operator** on its `onSend` event to prevent message flooding.

3.  **The Complete Picture: A Search Component**
    -   A `dom.input` stream is piped through a `debounce` **Operator** to prepare the raw user input.
    -   The final, clean stream dispatches a `fetch` action to a `searchReducer` (a state machine with `loading`, `success` states).
    -   A `press` **Interaction** on an "X" button dispatches a `clear` action to the same **Reducer**.

This architecture creates clear boundaries of responsibility:
-   **The UI Layer** thinks in terms of high-level **Interactions**.
-   **The Data-Flow Layer** uses **Operators** to control and shape event streams.
-   **The State Layer** uses **Reducers** and **Actors** to manage state predictably and safely.

Each tool does the job it was designed for, creating a system that is robust, testable, and a pleasure to build and maintain.