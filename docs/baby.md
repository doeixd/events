# Introducing `@doeixd/events`: Where Solid's Reactivity Meets Remix's Composability

In modern web development, a great divide separates two of our most critical concerns. On one side, we have **event handling**—the chaotic, imperative world of `addEventListener`, where callbacks can quickly devolve into a tangled mess of stateful closures and manual cleanup. On the other, we have **state management**—the elegant, declarative world of libraries like Redux or SolidJS, where state is a predictable, traceable result of actions or signals.

`@doeixd/events` was born from a simple but ambitious question: What if we could bridge this divide? What if we could treat UI events with the same declarative clarity and robust structure we apply to our application state?

The result is a mature, feature-rich toolkit that offers a unified theory for event-driven applications. It combines the reactive philosophy of SolidJS, the declarative composition of Remix Events, the transformative power of RxJS operators, and a fanatical focus on safety and resource management. This isn't just another event library; it's a new way to think about building interactive software.

## Part 1: From Chaos to Clarity — A New Philosophy

At its core, `@doeixd/events` champions a single, powerful idea: **your application's state is a function of events over time.**

Instead of scattering `setState` calls inside imperative event handlers, you define your state declaratively as a consequence of event streams. The fundamental primitives, `createEvent` and `createSubject`, make this pattern intuitive and traceable.

```typescript
import { createEvent, createSubject } from '@doeixd/events';

// 1. Define the "streams" of events that can occur in your system.
// A `Handler` is a subscribable event stream; an `Emitter` pushes values into it.
const [onIncrement, emitIncrement] = createEvent<number>();
const [onReset, emitReset] = createEvent<void>();

// 2. Define a piece of state (`Subject`) as a reduction of those event streams.
// This is like saying: `const count = reduce(events, 0)`
const count = createSubject(0,
  // When an 'onIncrement' event occurs, apply this transformation to the current state.
  onIncrement(delta => currentCount => currentCount + delta),

  // When an 'onReset' event occurs, replace the state with this value.
  onReset(() => 0)
);

// 3. Subscribe to the final state.
count.subscribe(value => console.log(`Count is now: ${value}`));

emitIncrement(5); // Logs: "Count is now: 5"
emitReset();      // Logs: "Count is now: 0"
```

This pattern co-locates your state logic, making it immediately obvious how a piece of data can change and what causes those changes.

## Part 2: The Functional Core — Event Streams and Operators

The power of `@doeixd/events` begins with its functional, stream-based primitives.

### The Magic of the `Handler`

A `Handler<T>` is more than just a callback registry; it's a chainable, transformable stream of events. When you subscribe to a `Handler`, its return type intelligently changes:
-   If your callback returns `void`, you get back an `unsubscribe` function.
-   If your callback returns a *value*, you get back a *new `Handler`* of that value's type.

This allows for elegant, linear data-flow programming, much like `Array.map` or `Promise.then`.

```typescript
const [onRawInput, emitRawInput] = createEvent<string>();

// Chain 1: Filter out empty inputs
const onValidInput = onRawInput(value => (value.length > 0 ? value : halt()));

// Chain 2: Transform the valid string into an object
const onUserObject = onValidInput(name => ({ id: Date.now(), name }));

// Subscribe to the final, transformed stream
onUserObject(user => {
  // `user` is fully typed as { id: number, name: string }
  console.log('New user:', user);
});

emitRawInput('Alice'); // Logs: New user: { id: ..., name: 'Alice' }
emitRawInput('');      // Does nothing, halted by the first chain.
```

### Enter Operators: RxJS Superpowers

To make these chains even more powerful, the library includes a suite of RxJS-style operators. These are pre-built, stateful transformations that solve common and complex UI problems with declarative grace.

```typescript
import { dom, debounce } from '@doeixd/events';

// Start with a raw DOM input event stream
const onInput = dom.input(document.querySelector('input'));

// Pipe it through the `debounce` operator
const onDebouncedInput = debounce(300)(onInput);

// The operator encapsulates all the complex timer logic.
// We only subscribe to the final, clean event stream.
onDebouncedInput(event => {
  console.log('User stopped typing. Value:', event.target.value);
});
```
With operators like `debounce`, `throttle`, and `doubleClick`, you can stop reinventing the wheel and focus on your application's logic.

## Part 3: The Declarative Layer — Interactions as Event Components

While the functional core is perfect for data flow, the library also provides a first-class declarative system for applying logic to the UI, heavily inspired by Remix Events.

### The `events()` Attacher and Middleware Composition

The `events()` function provides a managed, declarative way to attach listeners. Crucially, it creates a **middleware chain**: handlers for the same event are executed in order, and any handler can call `event.preventDefault()` to stop the chain.

This is a game-changer for building composable components.

```typescript
import { events, press, dom } from '@doeixd/events';

const buttonEvents = events(submitButton);

buttonEvents.on([
  // 1. Validation runs first. It can act as a "gatekeeper".
  dom.click(event => {
    if (formIsInvalid()) {
      // By preventing default, we stop the `press` handler below from ever running.
      event.preventDefault(); 
      showValidationError();
    }
  }),
  
  // 2. The `press` Interaction runs second, but only if not prevented.
  press(event => {
    // 'press' is a high-level interaction that normalizes mouse, touch, and keyboard events.
    submitForm();
  })
]);
```

### `createInteraction`: Encapsulating Complexity

This is the ultimate tool for encapsulation. `createInteraction` lets you compose multiple low-level event sources (`mousedown`, `keydown`, `touchstart`) into a single, high-level, semantic event (`press`). It lets you build your own "event components."

```typescript
import { createInteraction, dom } from '@doeixd/events';

// Create a reusable 'longPress' interaction
const longPress = createInteraction<Element, { duration: number }>(
  'longpress',
  ({ target, dispatch }) => {
    let timer;
    const onMouseDown = dom.mousedown(target);
    const onMouseUp = dom.mouseup(window);

    const downSub = onMouseDown(e => {
      const start = Date.now();
      timer = setTimeout(() => {
        dispatch({ detail: { duration: Date.now() - start } });
      }, 500);
    });

    const upSub = onMouseUp(() => clearTimeout(timer));
    return [downSub, upSub]; // Return cleanup functions
  }
);

// Use it declaratively!
events(button, [ longPress(e => console.log(`Long press: ${e.detail.duration}ms`)) ]);
```

## Part 4: A Safety Net for Asynchronicity and Memory

A great API isn't enough; it must also be safe. `@doeixd/events` is built with a deep focus on eliminating common bugs.

### Automatic Async Cancellation

Handling async operations in events is a notorious source of race conditions. `@doeixd/events` solves this automatically. Every `Handler` callback receives a `meta` object with an `AbortSignal`—a promise from the future that this operation may be cancelled. This signal is **automatically aborted** the next time the source event is emitted.

```typescript
const [onSearch, emitSearch] = createEvent<string>();

onSearch(async (query, meta) => {
  try {
    const response = await fetch(`/api/search?q=${query}`, {
      signal: meta.signal, // The magic is here!
    });
    // ... update UI
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Previous search was automatically cancelled.');
      return; // Safely exit the stale handler.
    }
  }
});

emitSearch('react'); // Starts a fetch.
emitSearch('solid'); // Starts a new fetch and AUTOMATICALLY aborts the 'react' fetch.
```

### Robust Resource Management

Memory leaks from forgotten subscriptions are a thing of the past. The library embraces the modern `Disposable` standard, using `DisposableStack` under the hood. This ensures that even if one cleanup function throws an error, all other subscriptions are still properly disposed of—a guarantee that `try...finally` cannot make.

## Part 5: A Rich Ecosystem for Any Environment

`@doeixd/events` is designed to be the engine for any application, on any framework.
-   **React Hooks (`@doeixd/react`):** Seamless integration with React's lifecycle for automatic subscription management and re-rendering.
-   **Advanced State Patterns:** When your state logic grows, you can graduate to `createActor` for encapsulated, stateful objects, or `createGuardedReducer` for building true, type-safe state machines that make impossible states impossible.
-   **Framework Agnostic:** Use it in Svelte, Vue, or vanilla TypeScript projects with ease.

## Conclusion: The Whole is Greater than the Sum of its Parts

`@doeixd/events` has evolved beyond a clever combination of ideas. It is a complete and cohesive system for building modern, event-driven software. It offers:

-   A **philosophical foundation** that brings clarity to state management.
-   A **powerful functional core** for transforming data streams with operators.
-   A **declarative application layer** for composing high-level UI interactions.
-   A **rock-solid safety net** that eliminates async race conditions and memory leaks.

It's a toolkit designed to bring predictability, power, and genuine joy to the most challenging parts of web development. It's time to stop fighting with your events and start composing with them.

**Check out `@doeixd/events` on [GitHub](https://github.com/doeixd/events) and [npm](https://www.npmjs.com/package/@doeixd/events).**