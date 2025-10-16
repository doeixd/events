# @doeixd/events

[![npm version](https://badge.fury.io/js/%40doeixd%2Fevents.svg)](https://badge.fury.io/js/%40doeixd%2Fevents)
[![GitHub](https://img.shields.io/github/stars/doeixd/events)](https://github.com/doeixd/events)

A powerful, type-safe reactive event system for TypeScript/JavaScript applications. Inspired by solid-events and remix events, this library provides SolidJS-style primitives, DOM utilities, and seamless Remix integration for building reactive user interfaces and event-driven architectures.

## ✨ Features

- 🚀 **Reactive Subjects**: Observable values with automatic dependency tracking
- 🔄 **Event Chaining**: Powerful handler composition with conditional logic
- 🌐 **DOM Integration**: Type-safe DOM event handling and reactive bindings
- ⚡ **Remix Compatible**: Full integration with Remix's event system
- 🎯 **SolidJS-Style APIs**: Familiar patterns for SolidJS developers
- 📦 **Tree-Shakable**: Modular design with optimal bundling
- 🔒 **Type-Safe**: Full TypeScript support with excellent inference
- 🛠️ **Framework Agnostic**: Works with React, Vue, Svelte, or vanilla JS

## 📦 Installation

```bash
npm install @doeixd/events
# or
yarn add @doeixd/events
# or
pnpm add @doeixd/events
```

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

// Async event handling (promises are automatically flattened)
const [onCreateBoard, emitCreateBoard] = createEvent();

const onBoardCreated = onCreateBoard(async (boardData) => {
  // Simulate async operation
  const boardId = await Promise.resolve('board-123');
  return boardId;
});

onBoardCreated(boardId => console.log('Navigate to:', `/board/${boardId}`));

emitCreateBoard({ title: 'My Board' });
// Eventually logs "Navigate to: /board/board-123"

// Reactive subjects
const count = createSubject(0);
count.subscribe((value) => console.log('count', value));

count(1); // logs "count 1"
console.log(count()); // 1
```

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

## 🏗️ API Reference

### Core Functions

- `createEvent<T>(defaultValue?)`: Creates a typed event system returning `[handler, emit]`
- `createSubject<T>(initial?, ...handlers)`: Creates a reactive subject with automatic updates
- `halt()`: Throws to halt event chain execution (TypeScript infers `never`)
- `DUMMY`: Special value used internally for type checking handlers

### DOM Functions

- `fromDomEvent(element, eventName, options?)`: Creates typed DOM event handler with AbortSignal support
- `dom`: Object with shortcuts for common DOM events (`click`, `input`, `submit`, etc.)
- `subjectProperty(element, property, event?)`: Reactive DOM property binding with auto-updates
- `subjectFromEvent(element, eventName)`: Converts DOM event stream to reactive subject
- `on(elements, event, handler, options?)`: Multi-element event handling with cleanup

### Remix Bridge

- `toEventDescriptor(handler, type, signal?)`: Converts Handler to Remix EventDescriptor
- `subjectToEventDescriptor(subject, type, signal?)`: Converts Subject to EventDescriptor
- `fromDomHandler(element, eventName, options?)`: DOM handler creation for Remix
- `bindSubjectToDom(subject, element, propOrEvent, opts?)`: Bidirectional DOM-subject binding

### SolidJS-Style Helpers

- `createAsyncSubject(asyncSource, ...handlers)`: Async reactive subject with promise flattening
- `createSubjectStore(initial, ...handlers)`: Mutable state store (like SolidJS stores)
- `createTopic(...handlers)`: Merges multiple event handlers into one
- `createPartition(source, predicate)`: Splits handler based on condition
- `combineLatest(...handlers)`: Combines latest values from multiple handlers

### Legacy APIs (Deprecated)

These aliases are provided for backward compatibility but may be removed in future versions:

- `createSignal` → `createSubject`
- `createAsyncSignal` → `createAsyncSubject`
- `createStore` → `createSubjectStore`
- `mergeHandlers` → `createTopic`
- `splitHandler` → `createPartition`

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

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Inspired by solid-events, remix events, SolidJS, RxJS, and modern reactive programming patterns. Built with TypeScript for maximum type safety and developer experience.

---

Made with ❤️ for the reactive programming community
