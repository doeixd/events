# Framework Integration

`@doeixd/events` provides first-class integrations with popular JavaScript frameworks, making it easy to use reactive events within your preferred development environment.

## Available Integrations

- **[@doeixd/react](#react)** - React Hooks for seamless component integration
- **[@doeixd/vue](#vue)** - Vue Composables for the Composition API
- **[@doeixd/svelte](#svelte)** - Svelte Stores and Runes for Svelte 4 & 5
- **[@doeixd/solid](#solid)** - SolidJS utilities for bidirectional reactivity

---

## React

### Installation

```bash
npm install @doeixd/react @doeixd/events
```

### Core Hooks

#### `useEvent<T>(handler, callback, deps?)`

Subscribe to an event handler with automatic cleanup when the component unmounts.

```tsx
import { useEvent } from '@doeixd/react';
import { createEvent } from '@doeixd/events';

function MyComponent() {
  const [onClick, emitClick] = createEvent<MouseEvent>();

  useEvent(onClick, (event) => {
    console.log('Clicked at:', event.clientX, event.clientY);
  });

  return <button onClick={emitClick}>Click me</button>;
}
```

#### `useSubject<T>(subject)`

Subscribe to a subject and trigger re-renders when its value changes.

```tsx
import { useSubject } from '@doeixd/react';
import { createSubject } from '@doeixd/events';

const countSubject = createSubject(0);

function Counter() {
  const count = useSubject(countSubject);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => countSubject(count + 1)}>Increment</button>
    </div>
  );
}
```

#### `useSubjectSelector<T, R>(subject, selector)`

Subscribe to a specific part of a subject's state for optimized re-renders.

```tsx
import { useSubjectSelector } from '@doeixd/react';
import { createSubject } from '@doeixd/events';

const userSubject = createSubject({ name: 'John', age: 30 });

function UserName() {
  // Only re-renders when name changes, not age
  const userName = useSubjectSelector(userSubject, (user) => user.name);
  return <p>User: {userName}</p>;
}
```

---

## Vue

### Installation

```bash
npm install @doeixd/vue @doeixd/events
```

### Core Composables

#### `useEvent<T>(handler, callback)`

Subscribe to an event handler with automatic cleanup when the component is unmounted.

```vue
<script setup>
import { useEvent } from '@doeixd/vue';
import { createEvent } from '@doeixd/events';

const [onClick, emitClick] = createEvent();

useEvent(onClick, (event) => {
  console.log('Button clicked!', event);
});
</script>

<template>
  <button @click="emitClick">Click me</button>
</template>
```

#### `useSubject<T>(subject)`

Subscribe to a subject and return its value as a reactive `Ref`.

```vue
<script setup>
import { useSubject } from '@doeixd/vue';
import { createSubject } from '@doeixd/events';

const countSubject = createSubject(0);
const count = useSubject(countSubject);

function increment() {
  countSubject(countSubject() + 1);
}
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>
```

#### `useSubjectSelector<T, R>(subject, selector)`

Subscribe only to specific parts of state for optimized reactivity.

```vue
<script setup>
import { useSubjectSelector } from '@doeixd/vue';
import { createSubject } from '@doeixd/events';

const userSubject = createSubject({ name: 'John', age: 30 });

// Only re-renders when name changes
const userName = useSubjectSelector(userSubject, (user) => user.name);
</script>

<template>
  <p>User name: {{ userName }}</p>
</template>
```

---

## Svelte

### Installation

```bash
npm install @doeixd/svelte @doeixd/events
```

### Store-based API (Svelte 4+)

For maximum compatibility, use the store-based API:

```svelte
<!-- MyComponent.svelte -->
<script>
  import { useSubjectStore } from '@doeixd/svelte';
  import { createSubject } from '@doeixd/events';

  const countSubject = createSubject(0);
  const count = useSubjectStore(countSubject);

  function increment() {
    countSubject(countSubject() + 1);
  }
</script>

<!-- Use the $ prefix for auto-subscription -->
<p>The current count is: {$count}</p>
<button on:click={increment}>Increment</button>
```

### Runes API (Svelte 5+)

For Svelte 5+, use the modern runes-based API for fine-grained reactivity:

```svelte
<!-- MyComponent.svelte -->
<script>
  import { useEvent, useSubjectState } from '@doeixd/svelte/runes';
  import { createEvent, createSubject } from '@doeixd/events';

  const [onAlert, emitAlert] = createEvent();
  const userSubject = createSubject({ name: 'John', age: 30 });

  // Subscribe to events
  useEvent(onAlert, (message) => {
    alert(message);
  });

  // Get reactive state from subject
  let user = useSubjectState(userSubject);

  // Derive state reactively
  let greeting = $derived(`Hello, ${user.name}`);
</script>

<p>{greeting}</p>
<p>Age: {user.age}</p>
<button onclick={() => emitAlert('Hello!')}>Alert</button>
```

**Important:** The runes API (`@doeixd/svelte/runes`) must be used inside `.svelte` files or `.svelte.ts`/`.svelte.js` modules, as it uses Svelte 5's rune syntax.

---

## Solid

### Installation

```bash
npm install @doeixd/solid @doeixd/events
```

The SolidJS integration provides bidirectional bridges between `@doeixd/events`'s push-based system and Solid's pull-based reactivity.

### Consuming Events in Solid

#### `useEvent<T>(handler, callback)`

Subscribe to an event handler with automatic cleanup.

```tsx
import { useEvent } from '@doeixd/solid';
import { createEvent } from '@doeixd/events';

function MyComponent() {
  const [onAlert, emitAlert] = createEvent<string>();

  useEvent(onAlert, (message) => {
    alert(message);
  });

  return <button onClick={() => emitAlert('Hello!')}>Alert</button>;
}
```

#### `useSubject<T>(subject)`

Convert a Subject into a Solid signal.

```tsx
import { useSubject } from '@doeixd/solid';
import { createSubject } from '@doeixd/events';

const counterSubject = createSubject(0);

function Counter() {
  const count = useSubject(counterSubject);

  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => counterSubject(counterSubject() + 1)}>
        Increment
      </button>
    </div>
  );
}
```

#### `useSubjectStore<T>(subject)`

Convert a Subject into a Solid store for fine-grained reactivity.

```tsx
import { useSubjectStore } from '@doeixd/solid';
import { createSubject } from '@doeixd/events';

const userSubject = createSubject({
  name: 'John',
  age: 30
});

function UserProfile() {
  const [user] = useSubjectStore(userSubject);

  // This component ONLY re-renders when user.name changes
  return <p>User name: {user.name}</p>;
}
```

### Driving Events from Solid

#### `fromSignal<T>(accessor)`

Create a Handler from a Solid signal that emits when the signal changes.

```tsx
import { fromSignal } from '@doeixd/solid';
import { createSignal } from 'solid-js';
import { debounce } from '@doeixd/events/operators';

function SearchBox() {
  const [query, setQuery] = createSignal("");
  const onQueryChange = fromSignal(query);

  // Use powerful operators from @doeixd/events
  const onDebouncedQuery = debounce(300)(onQueryChange);

  onDebouncedQuery(q => {
    console.log(`Searching for: ${q}`);
  });

  return <input value={query()} onInput={(e) => setQuery(e.target.value)} />;
}
```

#### `bindSignalToSubject<T>(accessor, subject)`

Create a one-way binding from a Solid signal to a Subject.

```tsx
import { bindSignalToSubject } from '@doeixd/solid';
import { createSignal } from 'solid-js';
import { createSubject } from '@doeixd/events';

const [solidCount, setSolidCount] = createSignal(0);
const eventsCount = createSubject(0);

bindSignalToSubject(solidCount, eventsCount);

// Changes to solidCount automatically update eventsCount
eventsCount.subscribe(val => console.log('Count:', val));
setSolidCount(10); // Logs: "Count: 10"
```

#### `syncSignalWithSubject<T>(signal, subject)`

Create a two-way binding between a signal and a Subject.

```tsx
import { syncSignalWithSubject } from '@doeixd/solid';
import { createSignal } from 'solid-js';
import { createSubject } from '@doeixd/events';

const solidSignal = createSignal("Hello");
const eventsSubject = createSubject("Hello");

syncSignalWithSubject(solidSignal, eventsSubject);

// Changes from either side sync to the other
solidSignal[1]("Solid");
console.log(eventsSubject()); // "Solid"

eventsSubject("Events");
console.log(solidSignal[0]()); // "Events"
```

---

## Philosophy

All integration packages follow these principles:

1. **Automatic Cleanup**: Subscriptions are automatically cleaned up when components unmount
2. **Type Safety**: Full TypeScript support with proper type inference
3. **Minimal API Surface**: Simple, intuitive APIs that feel native to each framework
4. **Zero Configuration**: Works out of the box with sensible defaults
5. **Framework Idioms**: Each integration uses patterns familiar to users of that framework

## Contributing

Want to add support for another framework? Check out the existing integration packages as examples and submit a PR!

## License

MIT
