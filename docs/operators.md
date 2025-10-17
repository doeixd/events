# @doeixd/events - Operators Guide

## Overview

RxJS-style operators for event stream transformation. These operators provide powerful, composable tools for processing event data in a functional programming style.

## Core Concepts

- **Functional Composition**: Operators are higher-order functions that transform `Handler<T>` into `Handler<R>`
- **Type Safety**: Full TypeScript inference with complex generic chains
- **Async Support**: All operators handle both synchronous and asynchronous operations
- **Error Handling**: Robust error handling with appropriate halting behavior
- **Memory Management**: Proper cleanup for stateful operators

## Built-in Operators

### Transformation Operators

#### `map<T, R>(transform: (data: T) => R | Promise<R>): (source: Handler<T>) => Handler<R>`

Transforms event data using a mapping function. Supports both sync and async transformations.

```typescript
import { createEvent, map } from '@doeixd/events';

const [onNumber, emitNumber] = createEvent<number>();
const doubledNumbers = map((n: number) => n * 2)(onNumber);

doubledNumbers((result) => console.log('Doubled:', result));
emitNumber(5); // Logs: Doubled: 10

// Async transformation
const asyncProcessed = map(async (data: string) => {
  const result = await processData(data);
  return result.toUpperCase();
})(onData);
```

**Error Handling**: Transform errors cause the event chain to halt, preventing corrupted data from propagating.

### Filtering Operators

#### `filter<T>(predicate: (data: T) => boolean | Promise<boolean>): (source: Handler<T>) => Handler<T>`

Conditionally passes through events based on a predicate function.

```typescript
import { createEvent, filter } from '@doeixd/events';

const [onNumber, emitNumber] = createEvent<number>();
const evenNumbers = filter((n: number) => n % 2 === 0)(onNumber);

evenNumbers((result) => console.log('Even:', result));
emitNumber(1); // No output
emitNumber(2); // Logs: Even: 2

// Async filtering
const validEmails = filter(async (email: string) => {
  return await isValidEmail(email);
})(onEmailInput);
```

**Error Handling**: Predicate errors cause the event chain to halt.

### Accumulation Operators

#### `reduce<T, R>(accumulator: (acc: R, data: T) => R | Promise<R>, initial: R, options?: { signal?: AbortSignal }): (source: Handler<T>) => Handler<R>`

Accumulates values over time, emitting the accumulated result after each event.

```typescript
import { createEvent, reduce } from '@doeixd/events';

const [onPurchase, emitPurchase] = createEvent<number>();
const runningTotal = reduce((total: number, amount: number) => total + amount, 0)(onPurchase);

runningTotal((total) => console.log('Total spent:', total));
emitPurchase(10); // Logs: Total spent: 10
emitPurchase(5);  // Logs: Total spent: 15
emitPurchase(8);  // Logs: Total spent: 23

// With cleanup on abort
const controller = new AbortController();
const cancellableTotal = reduce(
  (total, amount) => total + amount,
  0,
  { signal: controller.signal }
)(onPurchase);

// Later: controller.abort(); // Resets accumulation
```

**State Management**: Maintains internal state that can be reset via AbortSignal.

**Error Handling**: Accumulator errors cause the event chain to halt.

### Terminal Operators

#### `sink<T>(consumer: (data: T) => void | Promise<void>, options?: { signal?: AbortSignal }): (source: Handler<T>) => Unsubscribe`

Terminal operator that consumes events without further chaining. Returns an `Unsubscribe` function.

```typescript
import { createEvent, sink } from '@doeixd/events';

const [onMessage, emitMessage] = createEvent<string>();
const logMessages = sink((message: string) => {
  console.log('Received:', message);
})(onMessage);

emitMessage('Hello!'); // Logs: Received: Hello!

// Cleanup when done
logMessages(); // Unsubscribes

// Async consumption
const saveToDatabase = sink(async (data: any, meta) => {
  if (meta?.signal?.aborted) return;
  await api.save(data);
}, { signal: abortController.signal })(onData);
```

**Cleanup**: Returns an unsubscribe function. Supports AbortSignal for automatic cleanup.

**Error Handling**: Consumer errors are logged but don't throw (terminal operator).

## Timing Operators

#### `debounce<T>(delay: number): (source: Handler<T>) => Handler<T>`

Delays execution until after a timeout. Subsequent events reset the timer.

```typescript
import { dom, debounce } from '@doeixd/events';

const debouncedInput = debounce(300)(dom.input(searchInput));
debouncedInput((event) => {
  console.log('User stopped typing:', event.target.value);
});
```

#### `throttle<T>(interval: number): (source: Handler<T>) => Handler<T>`

Limits execution to once per interval.

```typescript
import { dom, throttle } from '@doeixd/events';

const throttledScroll = throttle(100)(dom.scroll(window));
throttledScroll(() => {
  console.log('Scroll event (throttled)');
});
```

#### `doubleClick<T extends Event>(timeout?: number): (source: Handler<T>) => Handler<T>`

Detects double clicks within a timeout window.

```typescript
import { dom, doubleClick } from '@doeixd/events';

const doubleClickHandler = doubleClick(500)(dom.click(button));
doubleClickHandler(() => console.log('Double click detected!'));
```

## Creating Custom Operators

### Basic Pattern

Use the `createOperator` helper for simple operators:

```typescript
import { createOperator } from '@doeixd/events/operators';

export function take<T>(count: number) {
  let taken = 0;
  return createOperator<T>((data, emit, halt) => {
    if (taken < count) {
      taken++;
      emit(data);
    } else {
      halt();
    }
  });
}
```

### Advanced Custom Operators

For operators that need direct access to the handler chain:

```typescript
export function myOperator<T, R>(
  config: MyConfig
): (source: Handler<T>) => Handler<R> {
  return (source: Handler<T>): Handler<R> =>
    (callback) => source((data, meta) => {
      if (data === DUMMY) return callback(data as any);

      // Custom logic here
      const result = processData(data, config, meta);
      callback(result);
    });
}
```

## Examples

### Simple Composition

```typescript
import { createEvent, map, filter, sink } from '@doeixd/events';

const [onNumber, emitNumber] = createEvent<number>();

// Chain: filter evens -> double them -> log
const processedNumbers = sink(
  map((n: number) => n * 2)(
    filter((n: number) => n % 2 === 0)(onNumber)
  )
);

processedNumbers(result => console.log(result));

emitNumber(1); // No output
emitNumber(2); // Logs: 4
emitNumber(3); // No output
emitNumber(4); // Logs: 8
```

### Complex Async Pipeline

```typescript
const validatedEmails = map(async (email: string) => {
  const isValid = await validateEmail(email);
  return { email, isValid };
})(
  filter((email: string) => email.includes('@'))(onEmailInput)
);

const saveValidatedEmails = sink(async (result) => {
  await saveToDatabase(result);
})(validatedEmails);
```

### Stateful Accumulation with Cleanup

```typescript
const runningTotal = reduce((total: number, amount: number) => total + amount, 0)(onPurchase);
const logTotal = sink((total: number) => console.log(`Total spent: $${total}`))(runningTotal);

// Cleanup when component unmounts
useEffect(() => {
  return () => {
    // Cleanup logic if needed
  };
}, []);
```

## Best Practices

### Memory Management
- Always cleanup stateful operators when components unmount
- Use AbortSignal for automatic cleanup in async operations
- Avoid memory leaks by properly unsubscribing terminal operators

### Error Handling
- Transform/filter errors halt the chain to prevent corrupted data
- Terminal operators (sink) log errors but continue processing
- Use appropriate error handling strategies based on operator purpose

### Performance
- Consider operator overhead in performance-critical paths
- Use timing operators (debounce/throttle) to control event frequency
- Profile memory usage of stateful operators in long-running applications

### Composition
- Compose operators functionally: `result = op3(op2(op1(source)))`
- Build reusable operator combinations
- Leverage TypeScript's type inference for complex chains

## API Reference

### Transformation
- `map<T, R>(transform)` - Transform event data
- `filter<T>(predicate)` - Conditionally filter events

### Accumulation
- `reduce<T, R>(accumulator, initial, options?)` - Accumulate values over time

### Timing
- `debounce<T>(delay)` - Delay execution until quiet
- `throttle<T>(interval)` - Limit execution frequency
- `doubleClick<T>(timeout?)` - Detect double clicks

### Terminal
- `sink<T>(consumer, options?)` - Consume events without chaining

### Utilities
- `createOperator<T>(process)` - Helper for creating custom operators

## Integration with Framework Features

### React
```typescript
function SearchComponent() {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const debouncedSearch = sink(
      map((value: string) => value.trim())(
        debounce(300)(dom.input(searchInput))
      )
    )((cleanQuery) => {
      // Perform search
      searchAPI(cleanQuery);
    });

    return debouncedSearch; // Cleanup
  }, []);

  return <input ref={searchInput} />;
}
```

### Vue
```typescript
// Similar pattern with Vue's lifecycle hooks
```

### Svelte
```typescript
// Similar pattern with Svelte's lifecycle functions
```

This guide covers the core operators and patterns. For more advanced use cases, see the main documentation and examples.</content>
</xai:function_call
```

<xai:function_call name="bash">
<parameter name="command">npm run type-check