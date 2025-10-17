# @doeixd/solid

SolidJS utilities for [@doeixd/events](https://github.com/doeixd/events) - seamless, bidirectional integration between push-based and pull-based reactivity.

## Installation

```bash
npm install @doeixd/solid @doeixd/events
# or
pnpm add @doeixd/solid @doeixd/events
# or
yarn add @doeixd/solid @doeixd/events
```

## Overview

This package provides powerful utilities for bridging `@doeixd/events`'s push-based event system with SolidJS's pull-based, auto-tracking reactivity. You can:

- **Consume events in Solid**: Convert Handlers and Subjects into Solid signals and stores
- **Drive events from Solid**: Create event handlers from Solid signals
- **Bidirectional sync**: Keep signals and subjects in sync automatically

## Usage

### Consuming @doeixd/events in SolidJS

#### useEvent

Subscribe to an event handler with automatic cleanup:

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

#### useSubject

Convert a Subject into a Solid signal:

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

#### useSubjectStore

Convert a Subject into a Solid store for fine-grained reactivity:

```tsx
import { useSubjectStore } from '@doeixd/solid';
import { createSubject } from '@doeixd/events';

const userSubject = createSubject({
  name: 'John',
  age: 30,
  email: 'john@example.com'
});

function UserProfile() {
  const [user, setUser] = useSubjectStore(userSubject);

  // This component will ONLY re-render when user.name changes
  return <p>User name: {user.name}</p>;
}
```

### Driving @doeixd/events from SolidJS

#### fromSignal

Create a Handler from a Solid signal:

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
    // Fetch search results...
  });

  return <input value={query()} onInput={(e) => setQuery(e.target.value)} />;
}
```

#### bindSignalToSubject

Create a one-way binding from a Solid signal to a Subject:

```tsx
import { bindSignalToSubject } from '@doeixd/solid';
import { createSignal } from 'solid-js';
import { createSubject } from '@doeixd/events';

const [solidCount, setSolidCount] = createSignal(0);
const eventsCount = createSubject(0);

bindSignalToSubject(solidCount, eventsCount);

// Now when solidCount changes, eventsCount will be updated
eventsCount.subscribe(val => console.log('Count:', val));
setSolidCount(10); // Logs: "Count: 10"
```

#### syncSignalWithSubject

Create a two-way binding between a signal and a Subject:

```tsx
import { syncSignalWithSubject } from '@doeixd/solid';
import { createSignal } from 'solid-js';
import { createSubject } from '@doeixd/events';

const solidSignal = createSignal("Hello");
const eventsSubject = createSubject("Hello");

syncSignalWithSubject(solidSignal, eventsSubject);

// Changes from either side will sync to the other
solidSignal[1]("Solid");
console.log(eventsSubject()); // "Solid"

eventsSubject("Events");
console.log(solidSignal[0]()); // "Events"
```

## API

### Consuming Events

#### useEvent<T>(handler, callback)

Creates a subscription to an event handler that's automatically cleaned up.

- **handler**: `Handler<T>` - The event handler to subscribe to
- **callback**: `(data: T) => void` - Function to call when events are emitted

#### useSubject<T>(subject)

Returns a Solid `Accessor` that reactively returns the subject's value.

- **subject**: `Subject<T>` - The subject to convert
- **returns**: `Accessor<T>` - A reactive signal accessor

#### useSubjectStore<T>(subject)

Returns a Solid store for fine-grained reactivity on object properties.

- **subject**: `Subject<T>` - The subject to convert (must contain an object)
- **returns**: `[Store<T>, SetStoreFunction<T>]` - A Solid store tuple

### Driving Events

#### fromSignal<T>(accessor)

Creates a Handler from a Solid signal that emits when the signal changes.

- **accessor**: `Accessor<T>` - The Solid signal to track
- **returns**: `Handler<T>` - An event handler

#### bindSignalToSubject<T>(accessor, subject)

Creates a one-way binding from a signal to a Subject.

- **accessor**: `Accessor<T>` - The source signal
- **subject**: `Subject<T>` - The target subject
- **returns**: `() => void` - Cleanup function

#### syncSignalWithSubject<T>(signal, subject)

Creates a two-way binding between a signal and a Subject.

- **signal**: `[Accessor<T>, Setter<T>]` - The Solid signal tuple
- **subject**: `Subject<T>` - The subject to sync with
- **returns**: `() => void` - Cleanup function

## License

MIT
