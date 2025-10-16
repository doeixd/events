# @doeixd/events

[![npm version](https://badge.fury.io/js/%40doeixd%2Fevents.svg)](https://badge.fury.io/js/%40doeixd%2Fevents)
[![GitHub](https://img.shields.io/github/stars/doeixd/events)](https://github.com/doeixd/events)

A powerful, type-safe reactive event system for TypeScript/JavaScript applications. Inspired by solid-events and remix events, this library provides SolidJS-style primitives, DOM utilities, and seamless Remix integration for building reactive user interfaces and event-driven architectures.

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

<br />
## 📚 Core API

### Event System

```typescript
import { createEvent, halt } from 'events';

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

Type-safe DOM event handling with reactive bindings.

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

## 🔄 Remix Integration

Seamless integration with Remix's event system.

```typescript
import { toEventDescriptor, subjectToEventDescriptor } from '@doeixd/events';

export default function MyComponent() {
  const [onEvent, emitEvent] = createEvent<string>();

  // Convert to Remix EventDescriptor
  const descriptor = toEventDescriptor(onEvent, 'custom-event');

  return (
    <button
      {...events(button, [descriptor])}
      onClick={() => emitEvent('clicked')}
    >
      Click me
    </button>
  );
}
```

## 🎯 SolidJS-Style APIs

Familiar patterns for SolidJS developers.

```typescript
import {
  createSubject,
  createAsyncSubject,
  createSubjectStore,
  createTopic,
  createPartition
} from '@doeixd/events';

// Reactive subject with event handlers
const [onIncrement, emitIncrement] = createEvent();
const [onReset, emitReset] = createEvent();

const count = createSubject(0,
  onIncrement(delta => currentCount => currentCount + delta),
  onReset(() => 0)
);

// Async subject
const userData = createAsyncSubject(
  () => fetchUser(),     // Initial async load
  onUpdate(user => updatedUser => ({ ...updatedUser, ...user }))
);

// Mutable store (like SolidJS stores)
const boardStore = createSubjectStore(initialBoard,
  onAddNote(note => board => {
    board.notes.push(note);
  })
);

// Event composition
const onAnyChange = createTopic(
  onIncrement(delta => `incremented by ${delta}`),
  onReset(() => 'reset')
);

// Conditional splitting
const [onValid, onInvalid] = createPartition(
  onIncrement,
  (delta) => delta > 0
);
```

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

## ⚠️ Gotchas and Best Practices

### Async Event Handling
- Promises in handlers are automatically flattened
- Use `await` in async handlers for sequential processing
- Avoid infinite loops in reactive updates

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

## 🌐 Framework Interactions

### React
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

### Vue
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

### Svelte
```svelte
<script>
  import { createEvent, createSubject } from '@doeixd/events';

  const [onIncrement, emitIncrement] = createEvent<number>();
  const count = createSubject(0);

  onIncrement((delta) => count($count + delta));
</script>

<button on:click={() => emitIncrement(1)}>Count: {$count}</button>
```

### Vanilla JavaScript
Works seamlessly without any framework - full type safety with JSDoc annotations.

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
  event.stopPropagation(); // Stop event bubbling

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

#### `createEvent<T>(defaultValue?: T, options?: { signal?: AbortSignal }): [Handler<T>, Emitter<T>]`

Creates a typed event system with a handler and emitter.

**Parameters:**
- `defaultValue?: T` - Optional default value to emit when no data is provided
- `options.signal?: AbortSignal` - Optional abort signal for automatic cleanup

**Returns:** Tuple of `[handler, emitter]`

**Example:**
```typescript
const [onMessage, emitMessage] = createEvent<string>();

onMessage((msg) => console.log('Received:', msg));
emitMessage('Hello World!'); // Logs: Received: Hello World!
```

#### `createSubject<T>(initial?: T): Subject<T>`

Creates a reactive subject that holds a value and notifies subscribers.

**Parameters:**
- `initial?: T` - Initial value for the subject

**Returns:** Subject instance

**Example:**
```typescript
const count = createSubject(0);
count.subscribe((value) => console.log('Count:', value));

count(5); // Logs: Count: 5
console.log(count()); // 5
```

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

#### `DUMMY: string`

Special value used internally for type checking handlers. You typically don't need to use this directly.

### DOM Functions

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

#### `subjectToEventDescriptor<T>(subject: Subject<T>, type: string, signal?: AbortSignal): EventDescriptor`

Converts a Subject to a Remix EventDescriptor.

**Parameters:**
- `subject: Subject<T>` - Subject to convert
- `type: string` - Event type string
- `signal?: AbortSignal` - Optional abort signal

**Returns:** Remix EventDescriptor

#### `fromDomHandler<E extends Element, K extends keyof HTMLElementEventMap>(el: E, eventName: K, opts?: { signal?: AbortSignal; capture?: boolean; passive?: boolean }): Handler<HTMLElementEventMap[K]>`

Creates a DOM handler for Remix integration.

**Parameters:**
- `el: E` - DOM element
- `eventName: K` - Event name
- `opts?: { signal?: AbortSignal; capture?: boolean; passive?: boolean }` - Options

**Returns:** Handler for DOM events

#### `bindSubjectToDom<E extends Element, K extends keyof E>(subject: Subject<any>, el: E, propOrEvent: K | keyof HTMLElementEventMap, opts?: { signal?: AbortSignal; fromEvent?: boolean }): EventDescriptor`

Bidirectionally binds a Subject to a DOM element property or event.

**Parameters:**
- `subject: Subject<any>` - Subject to bind
- `el: E` - DOM element
- `propOrEvent: K | keyof HTMLElementEventMap` - Property or event name
- `opts.signal?: AbortSignal` - Optional abort signal
- `opts.fromEvent?: boolean` - If true, bind from event to subject

**Returns:** EventDescriptor for Remix

#### `bridgeInteractionFactory<T>(handler: Handler<T>): InteractionDescriptor['factory']`

Converts a Handler into a Remix InteractionDescriptor factory.

**Parameters:**
- `handler: Handler<T>` - Handler to convert

**Returns:** Factory function for custom interactions

#### `emitterToEventDescriptor<T>(emitter: Emitter<T>, type: string, signal?: AbortSignal): EventDescriptor`

Converts an Emitter to a Remix EventDescriptor.

**Parameters:**
- `emitter: Emitter<T>` - Emitter to convert
- `type: string` - Event type string
- `signal?: AbortSignal` - Optional abort signal

**Returns:** EventDescriptor

### SolidJS-Style Helper Functions

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

#### Aliases

- `subjectFromEvent` as `subjectFromDomEvent`
- `subjectProperty` as `subjectDomProperty`
- `createSubject` as `createSubjectSolid`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Setup

```bash
git clone https://github.com/doeixd/events.git
cd events
npm install
npm run build
npm test
```

<br />

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

<br />

## 🙏 Acknowledgments

Inspired by solid-events, remix events, SolidJS, RxJS, and modern reactive programming patterns. Built with TypeScript for maximum type safety and developer experience.

<br />


