# @doeixd/svelte

Svelte stores and Runes for [@doeixd/events](https://github.com/doeixd/events) - seamless integration with Svelte.

## Installation

```bash
npm install @doeixd/svelte @doeixd/events
# or
pnpm add @doeixd/svelte @doeixd/events
# or
yarn add @doeixd/svelte @doeixd/events
```

## Usage

### Store-based API (Svelte 4+)

The main entry point provides a store-based API that works with all modern versions of Svelte:

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

For Svelte 5+, use the runes entry point for fine-grained reactivity:

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

  // You can derive state from it reactively
  let greeting = $derived(`Hello, ${user.name}`);
</script>

<p>{greeting}</p>
<p>Age: {user.age}</p>
<button onclick={() => emitAlert('Hello!')}>Alert</button>
```

## API

### Store-based API (`@doeixd/svelte`)

#### useSubjectStore<T>(subject)

Converts an `@doeixd/events` `Subject` into a readable Svelte store.

- **subject**: `Subject<T>` - The subject to convert
- **returns**: `Readable<T>` - A readable Svelte store

### Runes API (`@doeixd/svelte/runes`)

**Note:** These functions must be used inside `.svelte` files or `.svelte.ts`/`.svelte.js` modules, as they use Svelte 5's rune syntax.

#### useEvent<T>(handler, callback)

Creates a subscription to an event handler that's automatically cleaned up when the component is unmounted.

- **handler**: `Handler<T>` - The event handler to subscribe to
- **callback**: `(data: T) => void` - Function to call when events are emitted

#### useSubjectState<T>(subject)

Returns a reactive `$state` variable that updates when the subject's value changes.

- **subject**: `Subject<T>` - The subject to subscribe to
- **returns**: `T` - A reactive state variable

## License

MIT
