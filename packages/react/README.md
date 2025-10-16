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
import { useEvent, useSubject } from '@doeixd/react';
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

## Advanced Example

```tsx
import { useEvent, useSubject, useSubjectSelector } from '@doeixd/react';
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