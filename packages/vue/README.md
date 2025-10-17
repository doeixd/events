# @doeixd/vue

Vue Composables for [@doeixd/events](https://github.com/doeixd/events) - seamless integration with Vue 3's Composition API.

## Installation

```bash
npm install @doeixd/vue @doeixd/events
# or
pnpm add @doeixd/vue @doeixd/events
# or
yarn add @doeixd/vue @doeixd/events
```

## Usage

### useEvent

Subscribe to an event handler with automatic cleanup:

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

### useSubject

Subscribe to a subject and get a reactive ref:

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

### useSubjectSelector

Optimize performance by subscribing only to specific parts of state:

```vue
<script setup>
import { useSubjectSelector } from '@doeixd/vue';
import { createSubject } from '@doeixd/events';

const userSubject = createSubject({
  name: 'John',
  age: 30,
  email: 'john@example.com'
});

// This component will ONLY re-render when the name changes
const userName = useSubjectSelector(userSubject, (user) => user.name);
</script>

<template>
  <p>User name: {{ userName }}</p>
</template>
```

## API

### useEvent<T>(handler, callback)

Creates a subscription to an event handler that's automatically cleaned up when the component is unmounted.

- **handler**: `Handler<T>` - The event handler to subscribe to
- **callback**: `(data: T) => void` - Function to call when events are emitted

### useSubject<T>(subject)

Returns a reactive `Ref` that updates when the subject's value changes.

- **subject**: `Subject<T>` - The subject to subscribe to
- **returns**: `Ref<T>` - A reactive reference to the subject's value

### useSubjectSelector<T, R>(subject, selector)

Returns a reactive `Ref` that only updates when the selected value changes, improving performance for large state objects.

- **subject**: `Subject<T>` - The subject to subscribe to
- **selector**: `(value: T) => R` - Function to select a value from the subject's state
- **returns**: `Ref<R>` - A reactive reference to the selected value

## License

MIT
