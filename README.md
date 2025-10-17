[![npm version](https://badge.fury.io/js/%40doeixd%2Fevents.svg)](https://badge.fury.io/js/%40doeixd%2Fevents)
[![GitHub](https://img.shields.io/github/stars/doeixd/events)](https://github.com/doeixd/events)

# @doeixd/events

A powerful, type-safe reactive event system for TypeScript/JavaScript applications. Inspired by solid-events and remix events, this library provides event primitives, framework integration, DOM utilities, and Remix Events integration for building reactive user interfaces and event-driven architectures.

## Table of Contents

- [📚 Documentation](#-documentation)
- [✨ Features](#-features)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [📚 Core API](#-core-api)
- [🌐 DOM Utilities](#-dom-utilities)
- [🔄 Remix Events Integration](#-remix-events-integration)
- [Declarative APIs Inspired by Solid-Events](#declarative-apis-inspired-by-solid-events)
- [🎯 Framework Integrations](#-framework-integrations)
- [🔒 Type Safety](#-type-safety)
- [🌐 DOM Utilities (Expanded)](#-dom-utilities-expanded)
- [🌐 Advanced DOM Event Handling](#-advanced-dom-event-handling)
- [📖 Advanced Examples](#-advanced-examples)
- [🏗️ Complete API Reference](#️-complete-api-reference)
- [🔗 EventEmitter Integration](#-eventemitter-integration)
- [🔧 Handler Operators](#-handler-operators)
- [🎭 Actor System](#-actor-system)

<br />

## 📚 Documentation

Explore comprehensive guides to master `@doeixd/events`:

- **[Primitives Guide](docs/primitives.md)** - When to use operators, interactions, reducers, and actors
- **[Async Handling](docs/async.md)** - Cancellation, control flow, disposal, and batching
- **[DOM Utilities](docs/dom.md)** - Reactive event handling, observers, and focus management
- **[Framework Integration](docs/framework-integration.md)** - React, Vue, Svelte, and SolidJS integrations
- **[Positioning Guide](docs/positioning.md)** - Compare with RxJS, SolidJS, XState, and Redux

<br />

## ✨ Features

- 🚀 **Reactive Subjects**: Observable values with automatic dependency tracking
- 🔄 **Event Chaining**: Powerful handler composition with conditional logic
- 🌐 **DOM Integration**: Type-safe DOM event handling and reactive bindings
- ⚡ **Remix Compatible**: Full integration with Remix's event system
- 🎯 **SolidJS-Style APIs**: Familiar patterns for SolidJS developers
- 📦 **Tree-Shakable**: Modular design with optimal bundling
- 🔒 **Type-Safe**: Full TypeScript support with excellent inference
- 🛠️ **Framework Agnostic**: Works with React, Vue, Svelte, or vanilla JS

<br />

## 📦 Installation

```bash
npm install @doeixd/events
# or
yarn add @doeixd/events
# or
pnpm add @doeixd/events
```


<br />

## 🚀 Quick Start

```typescript
import { createEvent, createSubject, halt } from '@doeixd/events';

// Basic event system
const [onEvent, emitEvent] = createEvent<string>();

onEvent(payload => console.log(`Event emitted:`, payload));

emitEvent('Hello World!');
// logs "Event emitted: Hello World!"

// Event transformation and chaining
const [onIncrement, emitIncrement] = createEvent<number>();

const onMessage = onIncrement((delta) => `Increment by ${delta}`);
onMessage(message => console.log(`Message emitted:`, message));

emitIncrement(2);
// logs "Message emitted: Increment by 2"

// Conditional halting
const onValidIncrement = onIncrement(delta => delta > 0 ? delta : halt());
const onFinalMessage = onValidIncrement((delta) => `Valid increment: ${delta}`);
onFinalMessage(message => console.log(message));

emitIncrement(-1); // No output (halted)
emitIncrement(5);  // logs "Valid increment: 5"

// Reactive subjects
const count = createSubject(0);
count.subscribe((value) => console.log('Count is now:', value));

count(1); // logs "Count is now: 1"
console.log(count()); // 1
```


<br />

## 📚 Core API

### Event System

```typescript
import { createEvent, halt } from '@doeixd/events';

// Create typed events
const [onMessage, emitMessage] = createEvent<string>();
const [onCount, emitCount] = createEvent<number>();

// Conditional halting
onCount((n) => {
  if (n < 0) halt(); // Stop processing
  console.log('Processing:', n);
});

emitCount(5);  // Logs: Processing: 5
emitCount(-1); // No log (halted)
```

### Reactive Subjects

```typescript
import { createSubject } from 'events';

const user = createSubject({
  name: 'John',
  age: 30
});

// Get current value
console.log(user().name); // 'John'

// Update and notify subscribers
user({ ...user(), age: 31 });

// Subscribe to changes
user.subscribe((newUser) => {
  console.log('User updated:', newUser);
});
```

## 🌐 DOM Utilities

Type-safe DOM event handling with reactive bindings. See the [DOM Utilities Guide](docs/dom.md) for comprehensive documentation on event handling, observers, and focus management.

```typescript
import { fromDomEvent, dom, subjectProperty, on } from '@doeixd/events';

// Direct DOM event handling
const clickHandler = dom.click(buttonElement);
clickHandler(() => console.log('Clicked!'));

// Reactive DOM properties
const inputValue = subjectProperty(inputElement, 'value');
inputValue.subscribe((value) => {
  console.log('Input changed:', value);
});

// Multi-element handling
on([button1, button2, button3], 'click', () => {
  console.log('Button clicked!');
});
```

<br />

## 🔄 Remix Events Integration

`@doeixd/events` is designed as a powerful companion to the low-level `@remix-run/events` system. The two libraries work together to provide a complete, composable, and reactive event handling solution.

You can think of their roles as complementary:
-   **`@remix-run/events`** is the **engine**. It provides the core mechanism for attaching event listeners (`events()`) and encapsulating stateful logic into reusable, higher-level **Interactions** (like `press` or `outerPress`). It manages the *lifecycle* of event handling.
-   **`@doeixd/events`** is the **logic toolkit**. It provides a powerful, declarative API for creating reactive *pipelines* that process the data flowing through those events. It excels at event transformation, conditional logic (`halt()`), and deriving state.

By combining them, you can build sophisticated, encapsulated, and highly readable event logic.

**Additional Features**: `@doeixd/events` also provides **Handler Operators** for RxJS-style event transformations (debounce, throttle, double-click detection) and **createEvent signals** with automatic async operation abortion for safe concurrent event handling. See the [Async Handling Guide](docs/async.md) for deep dives on cancellation and control flow.

### Bridging the Gap: `toEventDescriptor`

The integration is made possible through a set of **bridge functions**. The most important one is `toEventDescriptor`, which converts any `@doeixd/events` `Handler` chain into a Remix-compatible `EventDescriptor`.

This allows you to build complex logic with `@doeixd/events` and then seamlessly "plug it in" to any element using Remix's `events()` function or `on` prop.

### Example: A Declarative Validation Pipeline

While Remix provides `dom.submit`, `@doeixd/events` allows you to build a declarative pipeline on top of it. The final business logic will only run if all preceding steps in the chain succeed.

```typescript
import { events } from '@remix-run/events';
import { dom, halt, toEventDescriptor } from '@doeixd/events';

// Assume we have a form element in the DOM
const formElement = document.querySelector('form')!;
const emailInput = formElement.querySelector('input[name="email"]')!;

// 1. Create a reactive event chain from the DOM event.
const onSubmit = dom.submit(formElement);

// 2. Chain 1: Prevent default browser submission.
const onSafeSubmit = onSubmit(event => {
  event.preventDefault();
  return event; // Pass the event down the chain
});

// 3. Chain 2: Validate the email. If invalid, halt the chain.
const onValidatedSubmit = onSafeSubmit(() => {
  if (emailInput.value.includes('@')) {
    return { email: emailInput.value }; // Pass validated data
  }
  console.log('Validation failed!');
  return halt(); // Stop processing
});

// 4. Create the final Remix EventDescriptor from our powerful chain.
const submitDescriptor = toEventDescriptor(onValidatedSubmit, 'submit');

// 5. Attach the descriptor using Remix's events() function.
const cleanup = events(formElement, [submitDescriptor]);

// Later, when the component unmounts...
// cleanup();
```

### Advanced Use Case: Building Custom Remix Interactions

Remix's custom Interactions are perfect for encapsulating stateful logic. `@doeixd/events` provides an ideal way to write the internal logic for these interactions in a clean, declarative style.

Let's build a `doubleClick` interaction that fires only when a user clicks twice within 300ms.

```typescript
import { createInteraction, events } from '@remix-run/events';
import { createEvent, dom, halt, toEventDescriptor } from '@doeixd/events';

// The Interaction factory
export const doubleClick = createInteraction('doubleClick', ({ target, dispatch }) => {
  let timer: number;
  const [onClick, emitClick] = createEvent<MouseEvent>();

  // 1. Core Logic using @doeixd/events:
  //    - Start with the raw click events.
  //    - If a timer is running, it's a double click. Clear the timer and pass the event through.
  //    - If no timer, start one and halt the chain.
  const onDoubleClick = onClick(event => {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
      return event; // This is a double click!
    } else {
      timer = setTimeout(() => (timer = 0), 300);
      return halt(); // This is the first click.
    }
  });

  // 2. Dispatch the custom Remix event when a double click occurs.
  onDoubleClick(() => dispatch());

  // 3. Bridge the raw DOM click to our internal event emitter.
  const clickDescriptor = toEventDescriptor(
    dom.click(target)(e => emitClick(e)),
    'click'
  );

  // 4. Attach the listener using Remix's events() and return the cleanup.
  return events(target, [clickDescriptor]);
});

// --- How to use it ---
// Now you have a clean, reusable `doubleClick` interaction.
const button = document.querySelector('button')!;
events(button, [
  doubleClick(() => {
    console.log('Double click detected!');
  }),
]);
```

This example shows the power of the combination:
-   **Remix's `createInteraction`** encapsulates the logic and provides the `dispatch` mechanism.
-   **`@doeixd/events`** provides the declarative tools (`createEvent`, `halt`, chaining) to implement the complex timing logic cleanly.

### Declarative Attachment

The `events()` function creates a managed container for attaching listeners to any `EventTarget`. You describe your listeners as an array of `EventDescriptor` objects.

```typescript
import { events, dom, press } from '@doeixd/events';

const button = document.getElementById('my-button');

// 1. Create an event container for the element
const buttonEvents = events(button);

// 2. Declaratively attach a set of listeners
buttonEvents.on([
  // Attach a standard DOM event listener
  dom.click(event => {
    console.log('Button was clicked!');
  }),

  // Attach a high-level, built-in interaction
  press(event => {
    // This fires for mouse clicks, touch taps, and Enter/Space key presses
    console.log(`Button was "pressed" via a ${event.detail.originalEvent.type} event.`);
  })
]);

// 3. To remove all listeners managed by the container:
// buttonEvents.cleanup();
```

### High-Level Interactions

Interactions are reusable, stateful event handlers that compose multiple low-level events into a single, semantic user behavior.

-   **`press`**: Normalizes clicks, taps, and key presses into a single event.

### Event Composition with `preventDefault()`

When you attach multiple handlers for the same event type, they form a middleware chain. Any handler in the chain can call `event.preventDefault()` to stop subsequent handlers from executing. This is perfect for building composable components.

```typescript
function SmartLink({ href, onClick }) {
  const linkEvents = events(linkElement);

  linkEvents.on([
    // 1. The consumer's onClick runs first.
    dom.click(event => {
      if (shouldCancelNavigation()) {
        // This will stop our navigation logic below.
        event.preventDefault();
      }
      onClick(event);
    }),

    // 2. Our component's default behavior runs second.
    dom.click(event => {
      // This code will not run if the consumer called preventDefault().
      console.log('Navigating to', href);
      navigateTo(href);
    })
  ]);
}
```

### Creating Custom Interactions

You can encapsulate any complex, stateful event logic into your own reusable interaction with `createInteraction`.

Here’s a simple `longPress` interaction that fires an event after the mouse has been held down for 500ms.

```typescript
import { createInteraction, dom } from '@doeixd/events';

// 1. Define the interaction
const longPress = createInteraction<Element, { duration: number }>(
  'longpress', // The name of the custom event it will dispatch
  ({ target, dispatch }) => {
    let timer;

    // Use our core `dom` helpers and subscription stack for robust logic
    const onMouseDown = dom.mousedown(target);
    const onMouseUp = dom.mouseup(window); // Listen on window to catch mouseup anywhere

    const downSub = onMouseDown(e => {
      const startTime = Date.now();
      timer = setTimeout(() => {
        dispatch({ detail: { duration: Date.now() - startTime } });
      }, 500);
    });

    const upSub = onMouseUp(() => clearTimeout(timer));

    // The factory must return its cleanup functions
    return [downSub, upSub];
  }
);

// 2. Use the new interaction
events(myElement, [
  longPress(e => {
    console.log(`Element was long-pressed for ${e.detail.duration}ms!`);
  })
]);
```

### Summary of Remix Bridge Functions

| Function                   | Purpose                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `toEventDescriptor`        | Converts a `Handler` chain into a Remix `EventDescriptor`. (Most common)               |
| `subjectToEventDescriptor` | Creates a descriptor that updates a `Subject` when a custom event is dispatched.     |
| `emitterToEventDescriptor` | Creates a descriptor that calls an `Emitter` when a custom event is dispatched.      |
| `bindSubjectToDom`         | Provides two-way binding between a `Subject` and a DOM property for use within Remix. |
| `bridgeInteractionFactory` | Converts a `Handler` into a factory for creating advanced custom Remix Interactions. |


<br />

## Declarative APIs Inspired by Solid-Events

The core architecture and API of `@doeixd/events` are heavily inspired by the excellent [`solid-events`](https://github.com/solidjs-community/solid-events) library. The goal is to take the powerful, declarative patterns for event composition and state derivation and make them available in a **framework-agnostic** package that can be used in any JavaScript environment.

If you are familiar with `solid-events`, you will find the API to be almost identical, enabling you to build complex, predictable logic by defining how state reacts to events.

📚 **[Primitives Guide](docs/primitives.md)** - Architectural patterns and when to use each primitive (operators, interactions, reducers, actors).

### Derive State from Events (`createSubject`)
Create a reactive subject whose value is managed exclusively by event handlers. This makes state changes traceable and predictable.

```typescript
const [onIncrement, emitIncrement] = createEvent<number>();
const [onReset, emitReset] = createEvent();

const count = createSubject(0,
  onIncrement(delta => currentCount => currentCount + delta),
  onReset(() => 0)
);
```

### Manage Async Data (`createAsyncSubject`)
Create a subject that loads its initial state from an async source and can be updated or re-fetched via events.

```typescript
const [onRefresh, emitRefresh] = createEvent();
const user = createAsyncSubject(
  () => fetch('/api/user').then(res => res.json()), // Initial load
  onRefresh(() => fetch('/api/user').then(res => res.json())) // Re-fetch
);
```

### Mutate State Directly (`createSubjectStore`)
Create a mutable store (like Immer or Solid stores) where event handlers can safely and directly mutate the state object.

```typescript
const [onAddItem, emitAddItem] = createEvent<string>();
const cart = createSubjectStore({ items: [] },
  onAddItem(item => state => {
    state.items.push(item); // Directly mutate state
  })
);
```

### Merge Events (`createTopic`)
Combine multiple, distinct event streams into a single, unified handler.

```typescript
const [onLogin, emitLogin] = createEvent<string>();
const [onLogout, emitLogout] = createEvent();

const onAuthChange = createTopic(
  onLogin(user => `User logged in: ${user}`),
  onLogout(() => 'User logged out')
);
```

### Split Events (`createPartition`)
Split a single event stream into two separate streams based on a predicate function.

```typescript
const [onNumber, emitNumber] = createEvent<number>();

const [onPositive, onNegativeOrZero] = createPartition(
  onNumber,
  (num) => num > 0
);
```

### Key Differences from `solid-events`
While the core API is parallel, `@doeixd/events` differs in a few crucial ways to achieve its framework-agnostic goals:

1.  **Framework Agnostic vs. SolidJS-Specific**:
    *   `solid-events` is designed specifically for **SolidJS** and integrates deeply with its reactive graph.
    *   `@doeixd/events` is built with **no framework dependencies**, allowing it to be used anywhere.

2.  **Memory Management**:
    *   In `solid-events`, handlers are **automatically cleaned up** by Solid's component lifecycle.
    *   `@doeixd/events` requires **manual cleanup**. You must call the `unsubscribe` function returned by a handler or use an `AbortSignal` to prevent memory leaks, especially within component lifecycles (e.g., in React's `useEffect` cleanup).

3.  **Expanded Focus on DOM and Integrations**:
    *   `@doeixd/events` includes a rich set of **DOM Utilities** and a dedicated **Remix Integration Bridge** to provide a first-class experience in a variety of frontend environments.

📚 **[Positioning Guide](docs/positioning.md)** - Compare `@doeixd/events` with RxJS, SolidJS Signals, XState, and Redux to understand trade-offs and choose the right tool.

<br />

## 🎯 Framework Integrations

`@doeixd/events` provides first-class integrations with popular JavaScript frameworks. You can either use the core library directly or leverage framework-specific integration packages for enhanced developer experience.

### Integration Packages

For seamless integration with automatic lifecycle management and idiomatic APIs:

- **[@doeixd/react](packages/react)** - React Hooks with automatic subscription cleanup
- **[@doeixd/vue](packages/vue)** - Vue 3 Composables for the Composition API
- **[@doeixd/svelte](packages/svelte)** - Svelte Stores and Runes (Svelte 4 & 5)
- **[@doeixd/solid](packages/solid)** - SolidJS utilities with bidirectional reactivity

📚 **[Framework Integration Guide](docs/framework-integration.md)** - Detailed documentation with examples for each framework.

### React with Integration Package

```bash
npm install @doeixd/react
```

```tsx
import { useEvent, useSubject } from '@doeixd/react';
import { createEvent, createSubject } from '@doeixd/events';

function Counter() {
  const [onIncrement, emitIncrement] = createEvent<number>();
  const count = createSubject(0);

  useEvent(onIncrement, (delta) => count(count() + delta));
  const currentCount = useSubject(count);

  return <button onClick={() => emitIncrement(1)}>Count: {currentCount}</button>;
}
```

### Using Core Library Directly

The core `@doeixd/events` library works seamlessly with any framework or vanilla JavaScript:

#### React
```typescript
function MyComponent() {
  const [count, setCount] = useState(0);
  const [onIncrement, emitIncrement] = createEvent<number>();

  useEffect(() => {
    const unsub = onIncrement((delta) => setCount(c => c + delta));
    return unsub;
  }, []);

  return <button onClick={() => emitIncrement(1)}>Count: {count}</button>;
}
```

#### Vue
```typescript
<template>
  <button @click="emitIncrement(1)">Count: {{ count }}</button>
</template>

<script setup>
import { createEvent, createSubject } from '@doeixd/events';

const [onIncrement, emitIncrement] = createEvent<number>();
const count = createSubject(0);

onIncrement((delta) => count(count() + delta));
</script>
```

#### Svelte
```svelte
<script>
  import { createEvent, createSubject } from '@doeixd/events';

  const [onIncrement, emitIncrement] = createEvent<number>();
  const count = createSubject(0);

  onIncrement((delta) => count($count + delta));
</script>

<button on:click={() => emitIncrement(1)}>Count: {$count}</button>
```

**Note:** `@doeixd/events` subjects are fully compatible with Svelte's store contract, enabling the `$` auto-subscription syntax out of the box.

#### Vanilla JavaScript
Works seamlessly without any framework - full type safety with JSDoc annotations.

### Performance Optimizations

Enable batched updates to prevent redundant computations in complex reactive graphs:

```typescript
import { createSubject, batch } from '@doeixd/events';

// Per-subject batching (batches individual updates)
const user = createSubject(null, { batch: true });

// Manual batching (batch multiple operations)
batch(() => {
  firstName('John');
  lastName('Doe'); // All notifications happen once at end
});
```

<br />

## 🔒 Type Safety

This library provides excellent TypeScript support with full type inference and safety guarantees:

- **Automatic Type Inference**: Event payloads, handler return types, and chaining are fully inferred
- **Compile-Time Safety**: Catch type mismatches at compile time, not runtime
- **Generic Support**: Strongly typed generics for events, subjects, and DOM interactions
- **IntelliSense**: Full IDE support with autocompletion and documentation

```typescript
// Fully typed event system
const [onUserAction, emitUserAction] = createEvent<{ type: 'click' | 'hover'; target: Element }>();

// Type-safe chaining
const onValidatedAction = onUserAction((action) => {
  if (action.type === 'click') return action.target; // Inferred return type: Element
  return halt(); // Type-safe halting
});

// Subject with inferred state type
const user = createSubject({ name: 'John', age: 30 });
user.subscribe((u) => console.log(u.name)); // u is fully typed
```

<br />



## 🌐 DOM Utilities (Expanded)

Beyond the basic examples, here are advanced DOM patterns:

### Reactive Form Binding
```typescript
import { subjectProperty, dom } from '@doeixd/events';

function createReactiveForm() {
  const form = document.createElement('form');

  // Reactive inputs
  const nameInput = document.createElement('input');
  const emailInput = document.createElement('input');

  const name = subjectProperty(nameInput, 'value');
  const email = subjectProperty(emailInput, 'value');

  // Reactive validation
  const isValid = createSubject(false);
  combineLatest(name, email).subscribe(([n, e]) => {
    isValid(n.length > 0 && e.includes('@'));
  });

  // Submit handler
  const submitHandler = dom.submit(form);
  submitHandler((e) => {
    e.preventDefault();
    if (isValid()) {
      console.log('Submit:', { name: name(), email: email() });
    }
  });

  return { form, name, email, isValid };
}
```

### Multi-Element Event Handling
```typescript
import { on } from '@doeixd/events';

const buttons = document.querySelectorAll('.my-button');
on(buttons, 'click', (event) => {
  console.log('Button clicked:', event.target);
});
```

### Event Delegation
```typescript
import { fromDomEvent } from '@doeixd/events';

const container = document.getElementById('container');
const clickHandler = fromDomEvent(container, 'click');

clickHandler((event) => {
  if (event.target.matches('.item')) {
    console.log('Item clicked:', event.target.dataset.id);
  }
});
```

<br />

## 🌐 Advanced DOM Event Handling

This library provides full support for native DOM events with advanced features like event phases, delegation, and standard `addEventListener` options.

### Event Phases: Bubbling vs Capturing

DOM events propagate through three phases: **capturing**, **target**, and **bubbling**. By default, events bubble up from the target element to the root.

```typescript
import { fromDomEvent } from '@doeixd/events';

// Bubbling phase (default)
const bubblingHandler = fromDomEvent(childElement, 'click');
bubblingHandler((event) => {
  console.log('Bubbling phase');
});

// Capturing phase
const capturingHandler = fromDomEvent(parentElement, 'click', { capture: true });
capturingHandler((event) => {
  console.log('Capturing phase');
});
```

### Native DOM Event Support

Works with all standard DOM events and their native properties:

```typescript
import { dom } from '@doeixd/events';

const mouseHandler = dom.mousemove(document.body);
mouseHandler((event) => {
  console.log('Mouse at:', event.clientX, event.clientY);
  console.log('Target:', event.target);
  console.log('Current target:', event.currentTarget);
});

// Access all native event properties
const keyHandler = dom.keydown(window);
keyHandler((event) => {
  console.log('Key pressed:', event.key);
  console.log('Code:', event.code);
  console.log('Ctrl pressed:', event.ctrlKey);
});
```

### Event Prevention and Propagation Control

```typescript
import { dom } from '@doeixd/events';

const formHandler = dom.submit(formElement);
formHandler((event) => {
  event.preventDefault(); // Prevent form submission
  event.stopPropagation(); // Stop DOM event bubbling

  // Handle form submission
  console.log('Form submitted');
});

// Stop immediate propagation (prevents other handlers on same element)
const buttonHandler = dom.click(button, { capture: true });
buttonHandler((event) => {
  event.stopImmediatePropagation();
  console.log('This handler runs first and prevents others');
});
```

### Reactive Event Chain Propagation

For reactive event chains, use `halt()` to stop propagation:

```typescript
import { createEvent, halt } from '@doeixd/events';

const [onNumber, emitNumber] = createEvent<number>();

// Chain with conditional halting
const onProcessed = onNumber((n) => {
  if (n < 0) halt(); // Stop this chain
  return n * 2;
});

onProcessed((result) => console.log('Result:', result));

emitNumber(5);  // Logs: Result: 10
emitNumber(-1); // No output (halted)
```

**Important**: `halt()` only affects the current handler chain. Other handlers attached to the same event continue normally.

### Composed Events and Bubbling

When working with composed events (multiple handlers merged together), bubbling behavior depends on the composition method:

```typescript
import { createEvent, createTopic, halt } from '@doeixd/events';

const [onEvent, emitEvent] = createEvent<number>();

// Multiple independent handlers (each isolated)
const handler1 = onEvent((n) => {
  if (n < 0) halt(); // Only stops handler1
  console.log('Handler 1:', n);
});

const handler2 = onEvent((n) => {
  console.log('Handler 2:', n); // Always runs
});

// Composed handlers (halt affects the composed result)
const composed = createTopic(
  onEvent((n) => n < 0 ? halt() : n),
  onEvent((n) => `Result: ${n}`)
);

composed((result) => console.log(result));

emitEvent(5);   // Handler 1: 5, Handler 2: 5, Result: 5
emitEvent(-1);  // Handler 1: (halted), Handler 2: -1, (composed halted)
```

### Advanced Event Listener Options

```typescript
import { fromDomEvent } from '@doeixd/events';

// Passive listeners (improves scroll performance)
const scrollHandler = fromDomEvent(window, 'scroll', { passive: true });
scrollHandler(() => {
  // This won't block scrolling
  console.log('Scrolled');
});

// Once-only listeners
const clickOnceHandler = fromDomEvent(button, 'click', { once: true });
clickOnceHandler(() => {
  console.log('This will only fire once');
});

// Combined options
const advancedHandler = fromDomEvent(element, 'touchstart', {
  capture: true,
  passive: false,
  signal: abortController.signal
});
```

### Custom Events

```typescript
import { fromDomEvent } from '@doeixd/events';

// Listen for custom events
const customHandler = fromDomEvent(window, 'my-custom-event' as any);
customHandler((event: CustomEvent) => {
  console.log('Custom event data:', event.detail);
});

// Dispatch custom events
const customEvent = new CustomEvent('my-custom-event', {
  detail: { message: 'Hello!' }
});
window.dispatchEvent(customEvent);
```

### Event Delegation Patterns

```typescript
import { fromDomEvent } from '@doeixd/events';

// Delegate to parent element
const listHandler = fromDomEvent(document.getElementById('list'), 'click');
listHandler((event) => {
  const target = event.target as HTMLElement;

  // Handle different child elements
  if (target.matches('.delete-btn')) {
    const itemId = target.dataset.id;
    deleteItem(itemId);
  } else if (target.matches('.edit-btn')) {
    const itemId = target.dataset.id;
    editItem(itemId);
  }
});

// Multiple event types on same element
const multiHandler = fromDomEvent(container, 'click');
multiHandler((event) => {
  if (event.target.matches('button')) {
    handleButtonClick(event);
  } else if (event.target.matches('a')) {
    handleLinkClick(event);
  }
});
```

### Performance Considerations

```typescript
import { fromDomEvent, dom } from '@doeixd/events';

// Use passive listeners for scroll/touch events
const touchHandler = dom.touchmove(document.body, { passive: true });

// Debounce high-frequency events
let scrollTimeout: number;
const scrollHandler = dom.scroll(window, { passive: true });
scrollHandler(() => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    console.log('Scroll settled');
  }, 100);
});

// Use AbortController for cleanup
const controller = new AbortController();
const handler = fromDomEvent(button, 'click', { signal: controller.signal });

// Later: controller.abort(); // Removes the listener
```

### Browser Compatibility

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ All standard DOM events supported
- ✅ Event listener options (`capture`, `passive`, `once`)
- ✅ AbortSignal for cleanup
- ✅ Custom events
- ✅ All event properties and methods

<br />

## 📖 Advanced Examples

### Custom Event Emitter

```typescript
import { createEvent, Handler } from 'events';

// Custom event emitter class
class EventEmitter<T extends Record<string, any>> {
  private events = new Map<keyof T, Handler<T[keyof T]>>();

  on<K extends keyof T>(event: K, handler: Handler<T[K]>) {
    const [h, emit] = createEvent<T[K]>();
    h(handler);
    this.events.set(event, h);
    return emit;
  }

  emit<K extends keyof T>(event: K, data: T[K]) {
    const handler = this.events.get(event);
    if (handler) {
      // Trigger the handler with data
      // Implementation details...
    }
  }
}
```

### Reactive Form Validation

```typescript
import { createSubject, subjectProperty } from '@doeixd/events';

function useFormValidation() {
  const email = subjectProperty(emailInput, 'value');
  const password = subjectProperty(passwordInput, 'value');

  const errors = createSubject({ email: '', password: '' });

  // Reactive validation
  email.subscribe((value) => {
    const isValid = /^[^@]+@[^@]+\.[^@]+$/.test(value);
    errors({ ...errors(), email: isValid ? '' : 'Invalid email' });
  });

  password.subscribe((value) => {
    const isValid = value.length >= 8;
    errors({ ...errors(), password: isValid ? '' : 'Password too short' });
  });

  return { email, password, errors };
}
```

### Async Data Loading

```typescript
import { createAsyncSubject, createEvent } from '@doeixd/events';

function usePosts() {
  const [onRefresh, emitRefresh] = createEvent();
  const [onDelete, emitDelete] = createEvent<number>();

  const posts = createAsyncSubject(
    () => api.getPosts(), // Initial load
    onRefresh(() => api.getPosts()), // Manual refresh
    onDelete((id) => (currentPosts) =>
      currentPosts.filter(p => p.id !== id) // Optimistic update
    )
  );

  return { posts, refresh: emitRefresh, deletePost: emitDelete };
}
```

<br />

## 🏗️ Complete API Reference

### Core Types

```typescript
// Function to emit events with data of type T
type Emitter<T> = (data?: T) => void;

// Higher-order function for handling events
type Handler<T> = <R>(
  cb: (data: T) => R | Promise<R> | void | Promise<void>
) => R extends void | Promise<void> ? Unsubscribe : Handler<Awaited<R>>;

// Unsubscribe function returned by handlers
type Unsubscribe = () => void;

// Reactive subject interface
interface Subject<S> {
  (value?: S): S;
  subscribe(cb: (value: S) => void): Unsubscribe;
  dispose?: () => void;
}
```

### Core Functions

<br>


#### `createEvent<T>(defaultValue?: T, options?: { signal?: AbortSignal }): [Handler<T>, Emitter<T>]`

Creates a typed event system with a handler and emitter. Each emission creates a new AbortController, automatically aborting any previous async operations for safety.

**Parameters:**
- `defaultValue?: T` - Optional default value to emit when no data is provided
- `options.signal?: AbortSignal` - Optional abort signal for automatic cleanup

**Returns:** Tuple of `[handler, emitter]`

**Callback Signature:**
```typescript
handler((data: T, meta?: { signal: AbortSignal }) => void)
```

The `meta` parameter is optional and contains an `AbortSignal` that is aborted when a new event is emitted, allowing for safe cancellation of async operations.

**Examples:**
```typescript
const [onMessage, emitMessage] = createEvent<string>();

// Basic usage (meta parameter optional)
onMessage((msg) => console.log('Received:', msg));
emitMessage('Hello World!'); // Logs: Received: Hello World!

// Async safety with AbortSignal
onMessage(async (msg, meta) => {
  if (meta?.signal.aborted) return; // Check if already aborted

  try {
    await someAsyncOperation(msg, meta.signal); // Pass signal for cancellation
  } catch (err) {
    if (err.name === 'AbortError') return; // Handle cancellation
    throw err;
  }
});

// When emitMessage is called again, previous async operations are automatically aborted
emitMessage('New message'); // Aborts previous async operation
```

<br>


#### `createSubject<T>(initial?: T, options?: { batch?: boolean }): Subject<T>`

Creates a reactive subject that holds a value and notifies subscribers.

**Parameters:**
- `initial?: T` - Initial value for the subject
- `options.batch?: boolean` - Whether to batch notifications (default: false)

**Returns:** Subject instance

**Example:**
```typescript
const count = createSubject(0);
count.subscribe((value) => console.log('Count:', value));

count(5); // Logs: Count: 5
console.log(count()); // 5

// Batched subject
const batched = createSubject(0, { batch: true });
```

<br>


#### `createSubject<T>(initial: T | (() => T), ...handlers: Handler<any>[]): Subject<T>` (SolidJS-style)

Creates a reactive subject derived from event handlers (SolidJS-style).

**Parameters:**
- `initial: T | (() => T)` - Initial value or function returning initial value
- `handlers: Handler<any>[]` - Event handlers that update the subject

**Returns:** Subject instance

**Example:**
```typescript
const [onIncrement, emitIncrement] = createEvent<number>();
const count = createSubject(0, onIncrement((delta) => (current) => current + delta));

emitIncrement(5);
console.log(count()); // 5
```

<br>


#### `batch<T>(fn: () => T): T`

Executes a function with batched updates. All subject notifications are deferred until the end of the microtask, preventing redundant computations.

**Parameters:**
- `fn: () => T` - Function to execute with batching

**Returns:** Result of the function

**Example:**
```typescript
batch(() => {
  subject1('value1');
  subject2('value2'); // Notifications happen once at end
});
```

<br>


#### `halt(): never`

Halts the current event chain execution without throwing an error.

**Returns:** Never (throws internal symbol)

**Example:**
```typescript
const [onNumber, emitNumber] = createEvent<number>();

onNumber((n) => {
  if (n < 0) halt(); // Stop processing
  console.log('Processing:', n);
});

emitNumber(5);  // Logs: Processing: 5
emitNumber(-1); // No log (halted)
```

<br>


#### `DUMMY: string`

Special value used internally for type checking handlers. You typically don't need to use this directly.

### Handler Operators

Handler operators are pipeable functions that transform event handlers, enabling composable, reusable event logic similar to RxJS operators.

<br>

#### `createOperator<T>(process: (data: T, emit: (result: T) => void, halt: () => never) => void): (source: Handler<T>) => Handler<T>`

Helper for creating custom handler operators. Simplifies the boilerplate of operator creation by handling DUMMY values and providing a clean API.

**Parameters:**
- `process: (data: T, emit: (result: T) => void, halt: () => never) => void` - Function that processes each event

**Process Function Parameters:**
- `data: T` - The event data
- `emit: (result: T) => void` - Call to pass data through the chain
- `halt: () => never` - Call to stop event propagation

**Returns:** Pipeable operator function

**Example:**
```typescript
import { createOperator } from '@doeixd/events/operators';

export const take = <T>(count: number) =>
  createOperator<T>((data, emit, halt) => {
    if (--count >= 0) {
      emit(data);
    } else {
      halt();
    }
  });
```

<br>

#### `doubleClick<T extends Event>(timeout?: number): (source: Handler<T>) => Handler<T>`

Creates a double-click handler operator that only triggers on double clicks within a timeout.

**Parameters:**
- `timeout?: number` - Maximum time in milliseconds between clicks (default: 300)

**Returns:** Pipeable operator function

**Example:**
```typescript
import { dom } from '@doeixd/events';
import { doubleClick } from '@doeixd/events/operators';

const onButtonClick = dom.click(button);
const onButtonDoubleClick = doubleClick(500)(onButtonClick);

onButtonDoubleClick(() => console.log('Double click detected!'));
```

<br>

#### `debounce<T>(delay: number): (source: Handler<T>) => Handler<T>`

Creates a debounced handler operator that delays execution until after a timeout.

**Parameters:**
- `delay: number` - Delay in milliseconds

**Returns:** Pipeable operator function

**Example:**
```typescript
import { dom } from '@doeixd/events';
import { debounce } from '@doeixd/events/operators';

const onInput = dom.input(textInput);
const onDebouncedInput = debounce(300)(onInput);

onDebouncedInput((event) => {
  console.log('User stopped typing:', event.target.value);
});
```

<br>

#### `throttle<T>(interval: number): (source: Handler<T>) => Handler<T>`

Creates a throttled handler operator that limits execution to once per interval.

**Parameters:**
- `interval: number` - Minimum time in milliseconds between executions

**Returns:** Pipeable operator function

**Example:**
```typescript
import { dom } from '@doeixd/events';
import { throttle } from '@doeixd/events/operators';

const onScroll = dom.scroll(window);
const onThrottledScroll = throttle(100)(onScroll);

onThrottledScroll(() => {
  console.log('Scroll event (throttled)');
});
```

<br>

#### Creating Custom Handler Operators

Handler operators are functions that take a `Handler<T>` and return a new `Handler<T>`, enabling composable event transformations. Use the `createOperator` helper to simplify operator creation:

```typescript
import { createOperator } from '@doeixd/events/operators';

export function filter<T>(predicate: (data: T) => boolean) {
  return createOperator<T>((data, emit, halt) => {
    if (predicate(data)) {
      emit(data); // Pass data through
    } else {
      halt(); // Stop the event chain
    }
  });
}

// Usage
import { createEvent } from '@doeixd/events';
import { filter } from './operators';

const [onNumber, emitNumber] = createEvent<number>();
const onEvenNumbers = filter((n) => n % 2 === 0)(onNumber);

onEvenNumbers((num) => console.log('Even number:', num));

emitNumber(1); // No output
emitNumber(2); // Logs: Even number: 2
emitNumber(3); // No output
emitNumber(4); // Logs: Even number: 4
```

**Advanced Example - Custom Debounce with Reset:**

```typescript
import { createOperator } from '@doeixd/events/operators';

export function debounceWithReset<T>(delay: number, resetValue?: T) {
  let timeoutId: number | null = null;

  return createOperator<T>((data, emit, halt) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Special reset value clears the debounce
    if (resetValue !== undefined && data === resetValue) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      return; // Don't emit reset values
    }

    timeoutId = window.setTimeout(() => {
      timeoutId = null;
      emit(data);
    }, delay);

    halt(); // Always halt immediate execution
  });
}
```

**Operator Guidelines:**
- Use `emit(result)` to pass transformed data through the chain
- Use `halt()` to stop event propagation (like `preventDefault()`)
- `createOperator` automatically handles `DUMMY` values for type checking
- Use closures to maintain state between events
- Return cleanup functions from operator factories if needed

#### Handler Operators vs Remix Events Interactions

Handler operators and [Remix Events](https://github.com/remix-run/events) "Interactions" serve different but complementary purposes:

**Handler Operators** (this library):
- Transform single event streams with functional composition
- Pipeable operators like RxJS: `debounce(300)(throttle(100)(source))`
- Stateless transformations of individual events
- Best for: filtering, timing control, data transformation

**Remix Events Interactions**:
- Stateful compositions of multiple DOM events into behaviors
- Manage complex state across event types (mouse, keyboard, touch)
- Encapsulate interaction patterns like "press", "hoverAim", "outerPress"
- Best for: gesture recognition, multi-event coordination, component interactions

**Example Comparison:**

*Handler Operator* (single event transformation):
```typescript
// Debounce a single input event
const debouncedInput = debounce(300)(dom.input(searchInput));
```

*Remix Interaction* (multi-event composition):
```typescript
// Compose mouse/touch/keyboard into "press" behavior
const pressHandler = press(() => console.log('Pressed'));
```

Use handler operators for transforming individual event streams, and Remix Interactions for composing multiple events into higher-level user behaviors.

### DOM Functions

<br>


#### `fromDomEvent<E extends Element, K extends keyof HTMLElementEventMap>(el: E, eventName: K, options?: { signal?: AbortSignal; capture?: boolean; passive?: boolean; once?: boolean }): Handler<HTMLElementEventMap[K]>`

Creates a type-safe DOM event handler with full `addEventListener` options support.

**Parameters:**
- `el: E` - DOM element to attach the event to
- `eventName: K` - Event name (e.g., 'click', 'input')
- `options.signal?: AbortSignal` - Optional abort signal for cleanup
- `options.capture?: boolean` - Use capture phase instead of bubbling (default: false)
- `options.passive?: boolean` - Passive listener (improves performance for scroll/touch)
- `options.once?: boolean` - Remove listener after first event

**Returns:** Handler for the DOM event

**Examples:**
```typescript
const button = document.querySelector('button')!;

// Basic usage
const clickHandler = fromDomEvent(button, 'click');
clickHandler(() => console.log('Clicked!'));

// With options
const scrollHandler = fromDomEvent(window, 'scroll', {
  passive: true,  // Improves scroll performance
  capture: false  // Use bubbling phase (default)
});

// Once-only listener
const submitHandler = fromDomEvent(form, 'submit', { once: true });
submitHandler((e) => {
  e.preventDefault();
  console.log('Form submitted (listener removed)');
});
```

<br>


#### `dom`

Object containing shortcuts for common DOM events. All shortcuts support the same options as `fromDomEvent`.

**Available shortcuts:**
- `dom.click<E extends Element>(el: E, options?)`
- `dom.dblclick<E extends Element>(el: E, options?)`
- `dom.input<E extends HTMLInputElement | HTMLTextAreaElement>(el: E, options?)`
- `dom.change<E extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(el: E, options?)`
- `dom.submit<E extends HTMLFormElement>(el: E, options?)`
- `dom.keydown<E extends Element>(el: E, options?)`
- `dom.keyup<E extends Element>(el: E, options?)`
- `dom.focus<E extends Element>(el: E, options?)`
- `dom.blur<E extends Element>(el: E, options?)`
- `dom.mousemove<E extends Element>(el: E, options?)`
- `dom.mousedown<E extends Element>(el: E, options?)`
- `dom.mouseup<E extends Element>(el: E, options?)`
- `dom.wheel<E extends Element>(el: E, options?)`
- `dom.touchstart<E extends Element>(el: E, options?)`
- `dom.touchend<E extends Element>(el: E, options?)`
- `dom.touchmove<E extends Element>(el: E, options?)`

**Examples:**
```typescript
const button = document.querySelector('button')!;

// Basic usage
const clickHandler = dom.click(button);
clickHandler(() => console.log('Button clicked!'));

// With event phase control
const capturingClick = dom.click(parentElement, { capture: true });
capturingClick(() => console.log('Captured click'));

// Passive touch for better performance
const touchHandler = dom.touchmove(element, { passive: true });
touchHandler((e) => console.log('Touch moved'));
```

<br>


#### `subjectProperty<T extends Element, K extends keyof T>(el: T, prop: K, eventName?: keyof HTMLElementEventMap): Subject<T[K]>`

Creates a reactive Subject bound to a DOM element property.

**Parameters:**
- `el: T` - DOM element
- `prop: K` - Property name to bind to
- `eventName?: keyof HTMLElementEventMap` - Event that triggers updates (default: 'input')

**Returns:** Subject bound to the property

**Example:**
```typescript
const input = document.querySelector('input')!;
const value = subjectProperty(input, 'value');

value.subscribe((val) => console.log('Input value:', val));
```

<br>


#### `subjectFromEvent<E extends Element, K extends keyof HTMLElementEventMap>(el: E, eventName: K): Subject<HTMLElementEventMap[K]>`

Converts a DOM event stream into a reactive Subject.

**Parameters:**
- `el: E` - DOM element
- `eventName: K` - Event name

**Returns:** Subject that emits DOM events

**Example:**
```typescript
const button = document.querySelector('button')!;
const clicks = subjectFromEvent(button, 'click');

clicks.subscribe((event) => console.log('Button clicked at:', event.clientX, event.clientY));
```

<br>


#### `on<E extends Element>(elements: E[] | NodeListOf<E>, event: keyof HTMLElementEventMap, handler: (ev: HTMLElementEventMap[typeof event]) => void, options?: { signal?: AbortSignal; capture?: boolean; passive?: boolean; once?: boolean }): Unsubscribe`

Attaches an event handler to multiple elements with full event options support.

**Parameters:**
- `elements: E[] | NodeListOf<E>` - Elements to attach to
- `event: keyof HTMLElementEventMap` - Event name
- `handler: (ev: HTMLElementEventMap[typeof event]) => void` - Event handler
- `options.signal?: AbortSignal` - Optional abort signal for cleanup
- `options.capture?: boolean` - Use capture phase
- `options.passive?: boolean` - Passive listener
- `options.once?: boolean` - Remove listeners after first event

**Returns:** Unsubscribe function (removes all listeners)

**Examples:**
```typescript
const buttons = document.querySelectorAll('.my-button');

// Basic multi-element handling
const unsub = on(buttons, 'click', (event) => {
  console.log('Button clicked:', event.target);
});

// With options
const touchButtons = document.querySelectorAll('.touch-btn');
const touchUnsub = on(touchButtons, 'touchstart', (event) => {
  console.log('Touch started');
}, { passive: true });

// Cleanup
unsub(); // Removes click listeners
touchUnsub(); // Removes touch listeners
```

### Remix Bridge Functions

<br>


#### `toEventDescriptor<T>(handler: Handler<T>, type: string, signal?: AbortSignal): EventDescriptor`

Converts a Handler to a Remix EventDescriptor.

**Parameters:**
- `handler: Handler<T>` - Handler to convert
- `type: string` - Event type string
- `signal?: AbortSignal` - Optional abort signal

**Returns:** Remix EventDescriptor

**Example:**
```typescript
const [onEvent, emitEvent] = createEvent<string>();
const descriptor = toEventDescriptor(onEvent, 'custom-event');

// Use in Remix events()
events(button, [descriptor]);
```

<br>


#### `subjectToEventDescriptor<T>(subject: Subject<T>, type: string, signal?: AbortSignal): EventDescriptor`

Converts a Subject to a Remix EventDescriptor.

**Parameters:**
- `subject: Subject<T>` - Subject to convert
- `type: string` - Event type string
- `signal?: AbortSignal` - Optional abort signal

**Returns:** Remix EventDescriptor

<br>


#### `fromDomHandler<E extends Element, K extends keyof HTMLElementEventMap>(el: E, eventName: K, opts?: { signal?: AbortSignal; capture?: boolean; passive?: boolean }): Handler<HTMLElementEventMap[K]>`

Creates a DOM handler for Remix integration.

**Parameters:**
- `el: E` - DOM element
- `eventName: K` - Event name
- `opts?: { signal?: AbortSignal; capture?: boolean; passive?: boolean }` - Options

**Returns:** Handler for DOM events

<br>


#### `bindSubjectToDom<E extends Element, K extends keyof E>(subject: Subject<any>, el: E, propOrEvent: K | keyof HTMLElementEventMap, opts?: { signal?: AbortSignal; fromEvent?: boolean }): EventDescriptor`

Bidirectionally binds a Subject to a DOM element property or event.

**Parameters:**
- `subject: Subject<any>` - Subject to bind
- `el: E` - DOM element
- `propOrEvent: K | keyof HTMLElementEventMap` - Property or event name
- `opts.signal?: AbortSignal` - Optional abort signal
- `opts.fromEvent?: boolean` - If true, bind from event to subject

**Returns:** EventDescriptor for Remix

<br>


#### `bridgeInteractionFactory<T>(handler: Handler<T>): InteractionDescriptor['factory']`

Converts a Handler into a Remix InteractionDescriptor factory.

**Parameters:**
- `handler: Handler<T>` - Handler to convert

**Returns:** Factory function for custom interactions

<br>


#### `emitterToEventDescriptor<T>(emitter: Emitter<T>, type: string, signal?: AbortSignal): EventDescriptor`

Converts an Emitter to a Remix EventDescriptor.

**Parameters:**
- `emitter: Emitter<T>` - Emitter to convert
- `type: string` - Event type string
- `signal?: AbortSignal` - Optional abort signal

**Returns:** EventDescriptor

<br>


#### `events<Target extends EventTarget>(target: Target): EventContainer`

Creates a managed container for attaching event listeners declaratively to any `EventTarget`. Supports middleware-style event handling where handlers can call `event.preventDefault()` to stop subsequent handlers.

**Parameters:**
- `target: Target` - The `EventTarget` (e.g., an element, window, or document) to attach listeners to

**Returns:** EventContainer with `.on()` and `.cleanup()` methods

**Example:**
```typescript
import { events, dom, press } from '@doeixd/events';

const button = document.getElementById('my-button')!;

// Create an event container
const buttonEvents = events(button);

// Attach listeners declaratively
buttonEvents.on([
  // Standard DOM event
  dom.click(event => {
    console.log('Button was clicked!');
  }),

  // Built-in interaction
  press(event => {
    console.log(`Button was pressed via a ${event.detail.originalEvent.type} event.`);
  })
]);

// Clean up all listeners
buttonEvents.cleanup();
```

<br>


#### `createInteraction<Target extends EventTarget, Detail = any, Options = any>(eventName: string, factory: InteractionFactory<Target, Detail, Options>): (handler: EventHandler<CustomEvent<Detail>, Target>, options?: Options) => InteractionDescriptor<Target>`

Creates a reusable, stateful interaction that composes multiple low-level DOM events into a single, semantic custom event.

**Parameters:**
- `eventName: string` - The name of the custom event this interaction will dispatch
- `factory: InteractionFactory<Target, Detail, Options>` - Function that implements the interaction logic

**Returns:** Function that creates InteractionDescriptors when called with a handler and options

**Example:**
```typescript
import { createInteraction, dom } from '@doeixd/events';

const longPress = createInteraction<Element, { duration: number }>(
  'longpress',
  ({ target, dispatch }) => {
    let timer: number;

    const onMouseDown = dom.mousedown(target);
    const onMouseUp = dom.mouseup(window);

    const downSub = onMouseDown(e => {
      const startTime = Date.now();
      timer = setTimeout(() => {
        dispatch({ detail: { duration: Date.now() - startTime } });
      }, 500);
    });

    const upSub = onMouseUp(() => clearTimeout(timer));

    return [downSub, upSub];
  }
);

// Use the interaction
events(myElement, [
  longPress(e => {
    console.log(`Element was long-pressed for ${e.detail.duration}ms!`);
  })
]);
```

<br>


#### `press`

Built-in interaction that normalizes user input across mouse, keyboard, and touch into a single "press" event.

**Type:** `InteractionDescriptor<Element>`

**Dispatches:** Custom event with type `'press'` and detail `{ originalEvent: Event }`

**Triggers on:**
- Left mouse button click
- `Enter` or `Space` key press
- Touch tap

**Example:**
```typescript
import { events, press } from '@doeixd/events';

events(button, [
  press(event => {
    console.log(`Pressed with a ${event.detail.originalEvent.type} event.`);
  })
]);
```

<br>


#### `fromHandler<T>(handler: Handler<T>, type: string, callback: (data: T) => void, options?: AddEventListenerOptions): EventDescriptor`

Converts a `@doeixd/events` Handler into a Remix-compatible EventDescriptor for declarative event attachment.

**Parameters:**
- `handler: Handler<T>` - The handler to convert (typically from `dom.*` or other handler chains)
- `type: string` - The DOM event name this descriptor should listen to
- `callback: (data: T) => void` - Function called with data from the handler chain
- `options?: AddEventListenerOptions` - Standard `addEventListener` options

**Returns:** EventDescriptor ready for use with `events()`

**Example:**
```typescript
import { events, fromHandler, dom, debounce } from '@doeixd/events';

// Create a debounced input handler
const onDebouncedInput = debounce(300)(dom.input(inputElement));

// Convert to EventDescriptor
const descriptor = fromHandler(onDebouncedInput, 'input', (event) => {
  console.log('Debounced value:', event.target.value);
});

// Use in declarative events
events(inputElement, [descriptor]);
```

### SolidJS-Style Helper Functions

<br>


#### `createAsyncSubject<T>(asyncSource: () => Promise<T>, ...handlers: Handler<any>[]): Subject<T>`

Creates an async reactive subject that loads from a promise and applies updates.

**Parameters:**
- `asyncSource: () => Promise<T>` - Function returning initial promise
- `handlers: Handler<any>[]` - Handlers that apply updates

**Returns:** Async subject

**Example:**
```typescript
const data = createAsyncSubject(
  () => fetch('/api/data').then(r => r.json()),
  onRefresh(() => fetch('/api/data').then(r => r.json()))
);
```

<br>


#### `createSubjectStore<T>(initial: T | (() => T), ...handlers: Handler<any>[]): Subject<T>`

Creates a mutable state store (like SolidJS stores).

**Parameters:**
- `initial: T | (() => T)` - Initial state or function
- `handlers: Handler<any>[]` - Handlers that mutate state

**Returns:** Subject store

**Example:**
```typescript
const store = createSubjectStore({ count: 0 },
  onIncrement((delta) => (state) => {
    state.count += delta;
  })
);
```

<br>


#### `createTopic<T extends any[]>(...handlers: Handler<T[number]>[]): Handler<T[number]>`

Merges multiple event handlers into one.

**Parameters:**
- `handlers: Handler<T[number]>[]` - Handlers to merge

**Returns:** Combined handler

**Example:**
```typescript
const [onA, emitA] = createEvent<string>();
const [onB, emitB] = createEvent<number>();

const topic = createTopic(
  onA((msg) => `A: ${msg}`),
  onB((num) => `B: ${num}`)
);

topic((result) => console.log(result));
emitA('hello'); // Logs: A: hello
emitB(42);      // Logs: B: 42
```

<br>


#### `createPartition<T>(source: Handler<T>, predicate: (value: T) => boolean): [Handler<T>, Handler<T>]`

Splits a handler based on a predicate into two handlers.

**Parameters:**
- `source: Handler<T>` - Source handler to split
- `predicate: (value: T) => boolean` - Function to test values

**Returns:** Tuple of `[trueHandler, falseHandler]`

**Example:**
```typescript
const [onNumber, emitNumber] = createEvent<number>();
const [onPositive, onNegative] = createPartition(onNumber, (n) => n >= 0);

onPositive((n) => console.log('Positive:', n));
onNegative((n) => console.log('Negative:', n));

emitNumber(5);  // Logs: Positive: 5
emitNumber(-3); // Logs: Negative: -3
```

<br>


#### `combineLatest<T>(...handlers: Handler<T>[]): Handler<T[]>`

Combines the latest values from multiple handlers.

**Parameters:**
- `handlers: Handler<T>[]` - Handlers to combine

**Returns:** Handler that emits arrays of latest values

**Example:**
```typescript
const [onA, emitA] = createEvent<string>();
const [onB, emitB] = createEvent<number>();

const combined = combineLatest(onA, onB);
combined(([msg, num]) => console.log(msg, num));

emitA('hello');
emitB(42);
// Logs: hello 42
```

### Legacy APIs (Deprecated)

These aliases are provided for backward compatibility but may be removed in future versions:

- `createSignal` → `createSubject`
- `createAsyncSignal` → `createAsyncSubject`
- `createStore` → `createSubjectStore`
- `mergeHandlers` → `createTopic`
- `splitHandler` → `createPartition`

### Additional Exports

<br>


#### Aliases

- `subjectFromEvent` as `subjectFromDomEvent`
- `subjectProperty` as `subjectDomProperty`
- `createSubject` as `createSubjectSolid`

<br />

<br />


## 🔗 EventEmitter Integration

`@doeixd/events` includes utilities for bridging with the classic EventEmitter pattern. Use `fromEmitterEvent()`, `toEmitterEvent()`, and `adaptEmitter()` to seamlessly integrate legacy EventEmitter-based systems with reactive patterns.

```typescript
import { fromEmitterEvent, toEmitterEvent, adaptEmitter } from '@doeixd/events';
import { EventEmitter } from 'events';

const emitter = new EventEmitter();

// Consume events from EventEmitter
const onData = fromEmitterEvent(emitter, 'data');
onData((payload) => console.log('Received:', payload));

// Drive EventEmitter with reactive logic
const [onAction, emitAction] = createEvent<string>();
toEmitterEvent(emitter, 'action', onAction);

// Adapt entire emitter to reactive interface
const reactive = adaptEmitter<{ data: string }>(emitter);
reactive.data((payload) => console.log(payload));
```

## 🔧 Handler Operators

Building on the EventEmitter integration, `@doeixd/events` now includes pipeable handler operators for creating reusable, stateful interactions:

```typescript
import { dom } from '@doeixd/events';
import { doubleClick } from '@doeixd/events/operators';

const onButtonClick = dom.click(button);
const onButtonDoubleClick = doubleClick(500)(onButtonClick); // Pipe through operator

onButtonDoubleClick(() => console.log('Double click detected!'));
```

Handler operators are functions that take a `Handler` and return a new `Handler`, enabling composable, reusable event logic similar to RxJS operators.

## 🎭 Actor System

The actor system provides a higher-level abstraction for managing state and behavior in a reactive, encapsulated way. Actors combine state management with event-driven behavior, similar to the actor model in concurrent programming.

### `createActor<TContext, TEmitters>(initialContext: TContext, setup: (context: TContext) => TEmitters, effects?: ActorEffect<TContext>): Actor<TContext, TEmitters>`

Creates a new actor instance with reactive state and event-driven methods.

**Parameters:**
- `initialContext: TContext` - Initial state object for the actor
- `setup: (context: TContext) => TEmitters` - Function that defines the actor's behavior and returns emitter methods
- `effects?: ActorEffect<TContext>` - Optional side effect handler called after state changes

**Returns:** Actor instance with reactive state access and emitter methods

**Example:**
```typescript
import { createActor, createEvent } from '@doeixd/events';

const counterActor = createActor(
  { count: 0 },
  (context) => {
    const [, increment] = createEvent((data) => {
      if (typeof data === 'symbol' || data === 'dummy') return;
      context.count++;
    });
    const [, decrement] = createEvent((data) => {
      if (typeof data === 'symbol' || data === 'dummy') return;
      context.count--;
    });
    return { increment, decrement };
  }
);

// Access current state
console.log(counterActor()); // { count: 0 }

// Trigger behavior
counterActor.increment();
console.log(counterActor()); // { count: 1 }

// Subscribe to state changes
counterActor.subscribe((state) => console.log('State changed:', state));
```

### `select<T>(sources: Subscribable<any>[], projection: () => T): Subject<T>`

Creates a derived reactive value from one or more actor or subject sources.

**Parameters:**
- `sources: Subscribable<any>[]` - Array of actors or subjects to derive from
- `projection: () => T` - Function that computes the derived value from current source states

**Returns:** Read-only reactive subject representing the derived state

**Example:**
```typescript
import { createActor, select, createEvent } from '@doeixd/events';

const authActor = createActor(
  { isLoggedIn: false },
  (context) => {
    const [, login] = createEvent((data) => {
      if (typeof data === 'symbol' || data === 'dummy') return;
      context.isLoggedIn = true;
    });
    return { login };
  }
);

const cartActor = createActor(
  { items: [] as string[] },
  (context) => {
    const [, addItem] = createEvent((item) => {
      if (typeof item === 'symbol' || item === 'dummy') return;
      context.items.push(item);
    });
    return { addItem };
  }
);

// Derive computed state
const canCheckout = select(
  [authActor, cartActor],
  () => authActor().isLoggedIn && cartActor().items.length > 0
);

console.log(canCheckout()); // false

authActor.login();
cartActor.addItem('item1');
console.log(canCheckout()); // true

// Subscribe to derived state changes
canCheckout.subscribe((canCheckout) => {
  console.log('Can checkout:', canCheckout);
});

// Cleanup when done
canCheckout.dispose();
```

### `Actor<TContext, TEmitters>`

Type representing an actor instance with reactive state and emitter methods.

**Type Parameters:**
- `TContext` - Shape of the actor's internal state object
- `TEmitters` - Shape of the emitter methods returned by the setup function

**Properties:**
- `(): TContext` - Function to access current state snapshot
- `subscribe: Subject<TContext>['subscribe']` - Subscribe to state changes
- `...TEmitters` - Emitter methods defined in setup function

### `ActorEffect<TContext>`

Type for side effect functions that run after actor state changes.

**Type Parameters:**
- `TContext` - Shape of the actor's state object

**Signature:** `(newContext: TContext, oldContext: TContext) => void`

**Example:**
```typescript
const loggingEffect = (newContext, oldContext) => {
  console.log('State changed:', { from: oldContext, to: newContext });
};

const actor = createActor(
  { count: 0 },
  (context) => {
    const [, increment] = createEvent((data) => {
      if (typeof data === 'symbol' || data === 'dummy') return;
      context.count++;
    });
    return { increment };
  },
  loggingEffect
);
```

## 🔄 Reducers

The reducer system provides immutable, type-safe state management with fluent chaining and optional side effects.

### `createReducer<TState, TReducers>(config: ReducerConfig<TState, TReducers>): ReducerStore<TState, TReducers>`

Creates a reducer store for general-purpose state management.

**Parameters:**
- `config` - Configuration with initial state, actions map, and optional effects

**Example:**
```typescript
import { createReducer } from '@doeixd/events';

const store = createReducer({
  initialState: { count: 0 },
  actions: {
    increment: (state, amount: number) => ({ count: state.count + amount }),
    decrement: (state, amount: number) => ({ count: state.count - amount })
  }
});

const updated = store.dispatch.increment(5).dispatch.decrement(2);
console.log(updated()); // { count: 3 }
```

### `createGuardedReducer<TState, TActions>(config: { initialState: TState; actions: TActions }): StateGuardedReducerStore<TState, TActions>`

Creates a state-guarded reducer for compile-time state machine safety.

**Parameters:**
- `config` - Configuration with initial state and actions map

**Example:**
```typescript
import { createGuardedReducer } from '@doeixd/events';

type State = { status: 'idle' } | { status: 'loading' } | { status: 'success'; data: string };

const store = createGuardedReducer<State, any>({
  initialState: { status: 'idle' },
  actions: {
    start: (state) => ({ status: 'loading' }),
    finish: (state, data: string) => ({ status: 'success', data })
  }
});

// Only valid actions are available based on current status
const loading = (store as any).dispatch.start();
const success = (loading as any).dispatch.finish('Done');
```

## 🛡️ Subscription Management & Disposable Resources

The library features a robust internal subscription system for reliable resource management:

### DisposableStack Integration
- **Modern Environments**: Automatically uses the native `DisposableStack` API for enhanced error handling and cleanup reliability
- **Error Suppression**: In modern runtimes, errors during unsubscription are properly suppressed using `SuppressedError`, ensuring all cleanup functions execute
- **Performance**: Leverages optimized native implementations where available

### Backwards-Compatible Fallback
- **Universal Support**: Provides a custom array-based subscription stack for environments without `DisposableStack`
- **Graceful Degradation**: Maintains full functionality with console logging for errors in fallback mode
- **Zero Configuration**: Runtime detection requires no user setup

### Unified Subscription Stack
- **Consistent API**: All combinators (`createTopic`, `combineLatest`, `select`, `on`) use the same internal stack abstraction
- **Type Safety**: Full TypeScript support with compile-time guarantees
- **Resource Safety**: Ensures proper cleanup even when individual unsubscribe functions throw errors

### Internal Utilities
- **`createSubscriptionStack()`**: Factory function that returns a subscription manager, using `DisposableStack` in modern environments or an array-based fallback otherwise
- **`createSubscriptionManager()`**: Higher-level manager implementing the Disposable protocol for automatic cleanup with the `using` keyword

## ⚠️ Gotchas and Best Practices

### Async Event Handling
- Promises in handlers are automatically flattened
- Use `await` in async handlers for sequential processing
- Avoid infinite loops in reactive updates
- **Automatic cancellation** with `AbortSignal` prevents race conditions

📚 **[Async Handling Guide](docs/async.md)** - Deep dive into cancellation, control flow, disposal, and batching.

### Halting Event Chains
- Use `halt()` to conditionally stop processing
- Halting throws an internal symbol, not an error
- Useful for validation and conditional logic

### Subject Updates
- Call `subject(newValue)` to update and notify subscribers
- Subscribers receive the current value immediately on subscription
- Dispose subjects to clean up resources

### DOM Interactions
- Use `subjectProperty` for reactive DOM bindings
- Clean up event listeners with AbortSignal
- DOM utilities work in any environment with DOM API

### Memory Management
- Unsubscribe from handlers when no longer needed
- Use `dispose()` on subjects to clear subscribers
- Pass AbortSignal to DOM handlers for automatic cleanup

<br />

## 🔧 Troubleshooting

### Common Issues

**Q: My async handler isn't working as expected**
A: Ensure you're awaiting promises properly. Async handlers flatten automatically, but timing matters in tests.

**Q: TypeScript complains about my handler types**
A: Check that your event payloads match the expected types. Use `DUMMY` for type testing if needed.

**Q: DOM events aren't firing**
A: Make sure elements are attached to the DOM before setting up handlers. Use AbortSignal for cleanup.

**Q: Memory leaks in long-running apps**
A: Always unsubscribe from handlers and dispose subjects when components unmount.

### DUMMY Value
The `DUMMY` export is a special value used internally for type checking handlers:

```typescript
import { DUMMY } from '@doeixd/events';

// DUMMY helps determine if a handler returns a value
// Used automatically - you typically don't need to use it directly
```

<br />

## 🙏 Acknowledgments

Inspired by solid-events, remix events, SolidJS, RxJS, and modern reactive programming patterns. Built with TypeScript for maximum type safety and developer experience.
