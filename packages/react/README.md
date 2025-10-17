# @doeixd/react

React hooks for seamless integration with [@doeixd/events](https://github.com/doeixd/events).

## Installation

```bash
npm install @doeixd/react @doeixd/events
# or
yarn add @doeixd/react @doeixd/events
# or
pnpm add @doeixd/react @doeixd/events
```

## Quick Start

```tsx
import { useEvent, useSubject, useActor, useEvents, useEventReducer, useStore } from '@doeixd/react';
import { createEvent, createSubject } from '@doeixd/events';

function Counter() {
  const [onIncrement, emitIncrement] = createEvent<number>();
  const count = createSubject(0);

  // Automatically handle subscription lifecycle
  useEvent(onIncrement, delta => count(count() + delta));

  // Re-render when count changes
  const currentCount = useSubject(count);

  return (
    <button onClick={() => emitIncrement(1)}>
      Count: {currentCount}
    </button>
  );
}
```

## API

### `useEvent(handler, callback, deps?)`

Hook that automatically subscribes to an event handler within a component's lifecycle.

**Parameters:**
- `handler`: Event handler to subscribe to
- `callback`: Function called when events are emitted
- `deps`: Optional dependencies array (like `useEffect`)

**Example:**
```tsx
const [onClick, emitClick] = createEvent<MouseEvent>();

useEvent(onClick, (event) => {
  console.log('Clicked at:', event.clientX, event.clientY);
});
```

### `useSubject(subject)`

Hook that subscribes to a subject and triggers re-renders when the value changes.

**Parameters:**
- `subject`: Subject to subscribe to

**Returns:** Current value of the subject

**Example:**
```tsx
const user = createSubject({ name: 'John', age: 30 });
const userData = useSubject(user);

return <div>Hello {userData.name}!</div>;
```

### `useSubjectSelector(subject, selector)`

Optimized version of `useSubject` that only re-renders when the selected part changes.

**Parameters:**
- `subject`: Subject to subscribe to
- `selector`: Function that selects part of the state

**Returns:** Selected value from the subject

**Example:**
```tsx
const user = createSubject({ name: 'John', age: 30 });

// Only re-renders when name changes
const userName = useSubjectSelector(user, (user) => user.name);

return <div>Hello {userName}!</div>;
```

### `useActor(actorFactory)`

Hook that creates a stable, component-bound instance of a stateful actor/store and subscribes to its state.

**Parameters:**
- `actorFactory`: Factory function that creates and returns the actor instance

**Returns:** Tuple `[state, actor]` where `state` is the reactive state and `actor` is the stable instance

**Example:**
```tsx
import { useActor } from '@doeixd/react';
import { createCounterActor } from './counterActor';

function CounterComponent() {
  const [counterState, counterActor] = useActor(createCounterActor);

  return (
    <div>
      <p>Count: {counterState.count}</p>
      <button onClick={() => counterActor.increment(1)}>Increment</button>
    </div>
  );
}
```

### `useActorSelector(actorFactory, selector)`

Optimized version of `useActor` that only re-renders when the selected part of the actor's state changes.

**Parameters:**
- `actorFactory`: Factory function that creates the actor instance
- `selector`: Function that selects a value from the actor's state

**Returns:** Selected reactive state value

**Example:**
```tsx
import { useActorSelector } from '@doeixd/react';
import { createUserProfileActor } from './userProfileActor';

function UserNameDisplay() {
  const userName = useActorSelector(
    createUserProfileActor,
    (state) => state.user.name
  );

  return <h1>{userName}</h1>;
}
```

### `useEvents(targetRef, descriptors, enabled?)`

Hook that declaratively attaches interactions and event handlers to DOM elements.

**Parameters:**
- `targetRef`: React ref object pointing to the target DOM element
- `descriptors`: Array of event descriptors to attach
- `enabled`: Optional boolean to enable/disable listeners (default: true)

**Example:**
```tsx
import { useRef } from 'react';
import { useEvents } from '@doeixd/react';
import { press, dom } from '@doeixd/events';

function InteractiveButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handlePress = () => console.log('Pressed!');
  const handleClick = () => console.log('Clicked!');

  useEvents(buttonRef, [
    press(handlePress),
    dom.click(handleClick)
  ]);

  return <button ref={buttonRef}>Interact</button>;
}
```

### `useEventReducer(reducerFactory)`

Hook that creates a reducer store with a familiar `[state, dispatch]` API.

**Parameters:**
- `reducerFactory`: Factory function that returns a reducer store instance

**Returns:** Tuple `[state, dispatch]` where `state` is reactive and `dispatch` contains action methods

**Example:**
```tsx
import { useEventReducer } from '@doeixd/react';
import { createReducer } from '@doeixd/events';

const counterReducer = () => createReducer({
  initialState: { count: 0 },
  actions: {
    increment: (state, amount: number) => ({ count: state.count + amount }),
    reset: (state) => ({ count: 0 }),
  },
});

function Counter() {
  const [state, dispatch] = useEventReducer(counterReducer);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch.increment(1)}>Increment</button>
      <button onClick={() => dispatch.reset()}>Reset</button>
    </div>
  );
}
```

### `useStore(storeFactory)`

Hook for using @doeixd/events stores (Reducers, Actors, etc.) in a controlled component pattern.

**Parameters:**
- `storeFactory`: Factory function that returns a store instance

**Returns:** Tuple `[state, actions]` where `state` is reactive and `actions` contains store methods

**Example:**
```tsx
import { useStore } from '@doeixd/react';
import { createCounterActor } from './counterActor';

function Counter() {
  const [state, actions] = useStore(createCounterActor);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => actions.increment()}>Increment</button>
    </div>
  );
}
```

## Advanced Example

```tsx
import { useEvent, useSubject, useSubjectSelector, useActor, useEvents, useEventReducer, useStore } from '@doeixd/react';
import { createEvent, createSubject } from '@doeixd/events';

function TodoApp() {
  const [onAddTodo, emitAddTodo] = createEvent<string>();
  const [onToggleTodo, emitToggleTodo] = createEvent<number>();

  const todos = createSubject<Todo[]>([]);

  // Handle events
  useEvent(onAddTodo, (text) => {
    todos([...todos(), { id: Date.now(), text, completed: false }]);
  });

  useEvent(onToggleTodo, (id) => {
    todos(todos().map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  });

  // Get derived state
  const todoList = useSubject(todos);
  const completedCount = useSubjectSelector(todos,
    (todos) => todos.filter(t => t.completed).length
  );

  return (
    <div>
      <input
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            emitAddTodo(e.currentTarget.value);
            e.currentTarget.value = '';
          }
        }}
        placeholder="Add todo..."
      />

      <ul>
        {todoList.map(todo => (
          <li
            key={todo.id}
            onClick={() => emitToggleTodo(todo.id)}
            style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
          >
            {todo.text}
          </li>
        ))}
      </ul>

      <p>Completed: {completedCount}</p>
    </div>
  );
}
```

## TypeScript Support

Full TypeScript support with automatic type inference:

```tsx
const [onUserAction, emitUserAction] = createEvent<{ type: 'click' | 'hover'; target: Element }>();
const user = createSubject<User | null>(null);

// Types are automatically inferred
useEvent(onUserAction, (action) => {
  // action is typed as { type: 'click' | 'hover'; target: Element }
});

const currentUser = useSubject(user); // typed as User | null
```