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
- **Component-owned state**: Use `useActor` for actors and reducers
- **Attach DOM interactions**: Use `createEvents` for declarative event handling
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

#### useActor

Create and manage a component-owned instance of an @doeixd/events actor or reducer:

```tsx
import { useActor } from '@doeixd/solid';
import { createCounterActor } from './counterActor';

function CounterComponent() {
  // Create and adapt the actor in one idiomatic line
  const [state, actions] = useActor(createCounterActor);

  // `state` is now a fine-grained Solid store
  // `actions` contains stable methods like `increment`

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => actions.increment()}>Increment</button>
    </div>
  );
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

#### useActor<TState, TActions, TActor>(actorFactory)

Creates and manages a component-owned instance of an @doeixd/events actor or reducer.

- **actorFactory**: `() => TActor` - Factory function that creates the actor instance
- **returns**: `[TState, TActions]` - Tuple of reactive state and stable actions

#### createEvents(target, descriptors, enabled?)

Declaratively attaches event handlers and interactions to DOM elements.

- **target**: `Accessor<EventTarget> | EventTarget` - The target element
- **descriptors**: `Accessor<EventDescriptor[]>` - Array of event descriptors
- **enabled**: `Accessor<boolean>` - Optional enable/disable flag (default: true)

#### useInteraction(target, descriptors, enabled?)

Alias for `createEvents` providing API consistency with React.

- **target**: `Accessor<EventTarget> | EventTarget` - The target element
- **descriptors**: `Accessor<EventDescriptor[]>` - Array of event descriptors
- **enabled**: `Accessor<boolean>` - Optional enable/disable flag (default: true)

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

## Best Practices

### Component-Owned State with useActor

For component-local state managed by Actors or Reducers, always use `useActor`:

```tsx
import { useActor } from '@doeixd/solid';
import { createFormStore } from './stores';

function MyForm() {
  const [state, actions] = useActor(createFormStore);

  // state is a reactive Solid store
  // actions contains stable methods
}
```

### DOM Interactions with useInteraction

For attaching event handlers and interactions to DOM elements, use `useInteraction`:

```tsx
import { createSignal } from 'solid-js';
import { useInteraction } from '@doeixd/solid';
import { press, dom } from '@doeixd/events';

function InteractiveButton() {
  const [buttonEl, setButtonEl] = createSignal<HTMLButtonElement>();

  useInteraction(buttonEl, () => [
    press(() => console.log('Pressed!')),
    dom.click(() => console.log('Clicked!'))
  ]);

  return <button ref={setButtonEl}>Interact</button>;
}
```

### External State with useSubject/useSubjectStore

For subscribing to global or external state, use `useSubject` or `useSubjectStore`:

```tsx
import { useSubjectStore } from '@doeixd/solid';
import { globalUserStore } from './stores';

function UserProfile() {
  const [user, setUser] = useSubjectStore(globalUserStore);

  // Fine-grained reactivity on user.name, user.email, etc.
  return <div>Hello {user.name}!</div>;
}
```

### Signal-to-Events with fromSignal

To push Solid reactivity into @doeixd/events pipelines, use `fromSignal`:

```tsx
import { createSignal } from 'solid-js';
import { fromSignal, debounce } from '@doeixd/solid';
import { createEvent } from '@doeixd/events';

const [query, setQuery] = createSignal('');
const onQueryChange = fromSignal(query);
const onDebouncedQuery = debounce(300)(onQueryChange);

// Now you can use all @doeixd/events operators!
```

## Gotchas

### Accessor Dependencies in useInteraction

Since `useInteraction` (and `createEvents`) accept accessors, make sure to wrap descriptors in accessors to ensure reactivity:

```tsx
// ❌ Won't react to changes in enabled state
useInteraction(buttonEl, [press(handler)], enabled);

// ✅ Will properly track enabled changes
useInteraction(buttonEl, () => [press(handler)], () => enabled);
```

### Solid Component Body Runs Once

Unlike React, Solid component functions run only once. This means you can create store instances directly in the component body:

```tsx
function MyComponent() {
  // ✅ This is fine in Solid - runs once per component instance
  const [state, actions] = useActor(() => createMyStore());

  // ❌ Don't do this - will create a new store on every render
  // const [state, actions] = useActor(createMyStore()); // Without factory
}
```

### Store Instance Updates in useActor

When using reducers that return new instances (like `createReducer`), `useActor` automatically handles the instance updates. The actions object remains stable:

```tsx
const [state, actions] = useActor(createReducer);

// actions.increment() will work even after state changes
// The hook internally manages instance updates
```

### Cleanup in Effects

Solid's effects automatically clean up when the reactive scope ends, but manual cleanup functions are still returned for compatibility:

```tsx
const cleanup = bindSignalToSubject(mySignal, mySubject);

// In Solid, this cleanup is optional since the effect will clean up automatically
// But it's good practice to call it if you need manual control
```

## License

MIT
