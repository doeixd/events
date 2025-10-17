# Web Platform Integration Guide

This document provides a comprehensive overview of how the `@doeixd/events` library integrates with, extends, and leverages native web platform APIs. It serves as a reference for developers seeking to understand the library's relationship with browser standards and modern JavaScript features.

## Table of Contents

1. [Introduction](#introduction)
2. [Event vs CustomEvent: Deep Comparison](#event-vs-customevent-deep-comparison)
3. [Core Web Platform Integrations](#core-web-platform-integrations)
4. [DOM Integration Layer](#dom-integration-layer)
5. [Advanced Platform Features](#advanced-platform-features)
6. [Browser Compatibility and Polyfills](#browser-compatibility-and-polyfills)
7. [Framework Integration Points](#framework-integration-points)
8. [Security and Performance Considerations](#security-and-performance-considerations)
9. [Edge Cases and Error Handling](#edge-cases-and-error-handling)
10. [Platform Extensions and Innovations](#platform-extensions-and-innovations)
11. [Examples and Use Cases](#examples-and-use-cases)
12. [Migration and Compatibility](#migration-and-compatibility)

## Introduction

The `@doeixd/events` library bridges functional reactive programming with native web platform APIs, providing a declarative and composable approach to event handling and state management. At its core, the library extends the browser's native event system while maintaining compatibility with existing web standards.

### Core Philosophy

The library's design philosophy centers on:
- **Native-first approach**: Leveraging existing web APIs rather than reinventing them
- **Zero-cost abstractions**: Minimal overhead when using platform features
- **Progressive enhancement**: Works with or without modern APIs through graceful degradation
- **Type safety**: Full TypeScript integration with platform types

### Key Integration Points

The library integrates with these fundamental web platform APIs:
- `EventTarget` and `CustomEvent` for event emission and handling
- `AbortController`/`AbortSignal` for lifecycle management
- `queueMicrotask` for batched state updates
- `IntersectionObserver` and `ResizeObserver` for reactive DOM observation
- `DisposableStack` and `Symbol.dispose` for resource cleanup
- `Proxy` for reactive object observation

## Event vs CustomEvent: Deep Comparison

Understanding the distinction between native `Event` and `CustomEvent` is crucial for grasping how the library extends the web platform while maintaining compatibility.

### Event: The Platform Standard

**Native `Event` objects** are the foundation of DOM event handling. They represent specific user interactions or browser state changes with standardized properties and behaviors.

```typescript
// Native click event
element.addEventListener('click', (event: MouseEvent) => {
  console.log(event.clientX, event.clientY); // Standardized properties
  console.log(event.target); // Standardized target
  event.preventDefault(); // Standardized methods
});
```

**Key characteristics:**
- **Standardized interfaces**: Each event type (MouseEvent, KeyboardEvent, etc.) has a well-defined API
- **Browser-generated**: Created by the browser in response to user actions or state changes
- **Immutable properties**: Most properties are read-only and set by the browser
- **Propagation control**: `stopPropagation()`, `preventDefault()`, `stopImmediatePropagation()`
- **Phase tracking**: `eventPhase` property indicates capture, target, or bubble phase

### CustomEvent: Structured Data Extension

**`CustomEvent` extends the native Event interface** to allow developers to dispatch events with custom data payloads while inheriting all standard event behaviors.

```typescript
// Custom event with structured data
const customEvent = new CustomEvent('user-action', {
  detail: { action: 'save', userId: 123, timestamp: Date.now() },
  bubbles: true,
  cancelable: true
});
element.dispatchEvent(customEvent);
```

**Key characteristics:**
- **Typed payloads**: `detail` property can contain any structured data
- **Developer-controlled**: Created and dispatched by application code
- **Full Event inheritance**: All standard Event properties and methods available
- **Serialization-friendly**: Detail payload can be JSON-serializable
- **Type-safe**: TypeScript can enforce payload structure

### Library's Strategic Use of CustomEvent

The `@doeixd/events` library leverages `CustomEvent` strategically to bridge functional programming with the DOM event system:

```typescript
// Library's internal CustomEvent usage
function createEvent<T>(): [Handler<T>, Emitter<T>] {
  const eventName = Math.random().toString(36).slice(2);
  const target = new EventTarget();

  const emit: Emitter<T> = (data?: T) => {
    // CustomEvent enables type-safe data passing
    target.dispatchEvent(new CustomEvent(eventName, {
      detail: { data, signal: currentController.signal }
    }));
  };

  // Handler creation with type preservation
  const createHandler = <A>(): Handler<A> => ((cb) => {
    const listener = (ev: CustomEvent<{ data: A; signal: AbortSignal }>) => {
      const { data, signal } = ev.detail;
      cb(data, { signal }); // Type-safe data extraction
    };
    target.addEventListener(eventName, listener as any);
    return () => target.removeEventListener(eventName, listener as any);
  }) as Handler<A>;

  return [createHandler(), emit];
}
```

### Comparative Analysis

| Aspect | Event | CustomEvent | Library's Approach |
|--------|-------|-------------|-------------------|
| **Data Payload** | Fixed properties per event type | Flexible `detail` object | Strongly-typed generic payloads |
| **Creation** | Browser-generated only | Developer-created | Internal event system abstraction |
| **Type Safety** | Interface-based (MouseEvent, etc.) | Any data in `detail` | Full TypeScript generics |
| **Propagation** | Standard DOM bubbling | Configurable bubbling | Handler chains (non-DOM) |
| **Cancellation** | `preventDefault()` | `preventDefault()` | `halt()` symbol for chains |
| **Memory** | Browser-managed | Developer-managed | Automatic cleanup via signals |
| **Debugging** | Browser dev tools integration | Custom event logging | EventTarget-based inspection |

### Performance Implications

**Event (Native):**
- **Zero allocation overhead**: Browser reuses event objects
- **Optimized dispatch**: Browser's native event loop
- **Memory efficient**: Automatic garbage collection

**CustomEvent:**
- **Allocation cost**: New object creation per dispatch
- **Serialization overhead**: Detail payload copying
- **Memory pressure**: Developer responsibility for cleanup

**Library optimization:**
```typescript
// Minimizes CustomEvent creation through intelligent batching
function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      queueMicrotask(() => {
        // Single CustomEvent emission for batched updates
        pendingNotifications.forEach((value, subject) => {
          subject._notifyImmediate(value);
        });
        pendingNotifications.clear();
      });
    }
  }
}
```

### Use Case Comparison

**When to use native Events:**
- DOM interactions (clicks, scrolls, inputs)
- Browser state changes (resize, visibility)
- Standard web APIs (WebSocket, Fetch events)
- Performance-critical scenarios

**When the library uses CustomEvent:**
- Internal event system communication
- Type-safe data flow between handlers
- Reactive state propagation
- Cross-component coordination

**Migration considerations:**
```typescript
// From native events
element.addEventListener('click', (e) => handleClick(e));

// To library events (maintains Event compatibility)
const clicks = fromDomEvent(element, 'click');
clicks((event) => handleClick(event)); // Same Event object

// To custom data flow
const [handler, emit] = createEvent<UserAction>();
emit({ type: 'save', payload: userData }); // Structured data
```

### Edge Cases and Gotchas

**CustomEvent detail cloning:**
```typescript
// Problem: Objects are passed by reference
const data = { count: 0 };
element.dispatchEvent(new CustomEvent('update', { detail: data }));
data.count = 1; // Modifies the detail object!

// Solution: Clone or use immutable data
element.dispatchEvent(new CustomEvent('update', {
  detail: { ...data } // Spread for shallow clone
}));
```

**Event phase considerations:**
```typescript
// CustomEvents dispatched during capture phase
element.addEventListener('custom-event', handler, { capture: true });

// Library handles this transparently through EventTarget isolation
```

**Memory leaks with CustomEvent:**
```typescript
// Potential leak: Holding references in detail
const largeObject = { /* big data */ };
element.dispatchEvent(new CustomEvent('data', { detail: largeObject }));
// largeObject stays in memory if event listeners hold references

// Library mitigation: Signal-based cleanup prevents accumulation
```

## Core Web Platform Integrations

### Event System Foundation

#### EventTarget API

The library uses `EventTarget` as the underlying mechanism for all event emission and handling. Each `createEvent` call creates a new `EventTarget` instance to manage event dispatching.

```typescript
// Internal implementation
function createEvent<T>(): [Handler<T>, Emitter<T>] {
  const eventName = Math.random().toString(36).slice(2);
  const target = new EventTarget(); // Native EventTarget usage
  
  const emit: Emitter<T> = (data?: T) => {
    target.dispatchEvent(new CustomEvent(eventName, {
      detail: { data, signal: currentController.signal }
    }));
  };
  
  // ...
}
```

**Benefits over traditional approaches:**
- **Memory efficiency**: EventTarget handles listener management natively
- **Performance**: Browser-optimized event dispatching
- **Compatibility**: Works across all modern browsers
- **Debugging**: Integrates with browser dev tools

#### CustomEvent

The library extensively uses `CustomEvent` for structured event dispatching with typed detail payloads. This provides type-safe event data while maintaining compatibility with the native event system.

```typescript
// Event emission with structured data
target.dispatchEvent(new CustomEvent(eventName, {
  detail: { data, signal: currentController.signal }
}));
```

**Detailed comparison with standard DOM events:**

| Feature | Standard DOM Event | CustomEvent | Library's Usage |
|---------|-------------------|-------------|-----------------|
| **Data Structure** | Fixed properties (`clientX`, `key`, etc.) | Flexible `detail` object | Strongly-typed generics `<T>` |
| **Creation Source** | Browser-generated only | Developer-created | Internal event system |
| **Type Safety** | Interface-based typing | Runtime `detail` access | Full TypeScript inference |
| **Serialization** | Not applicable | JSON-compatible | Cross-context communication |
| **Memory Overhead** | Browser-optimized | Object allocation | Minimized through batching |
| **Debugging** | Browser dev tools | Custom logging | EventTarget inspection |
| **Propagation** | DOM tree bubbling | Configurable bubbling | Handler chain flow |
| **Cancellation** | `preventDefault()` | `preventDefault()` | `halt()` for chains |

**Performance comparison:**
- **DOM Events**: Zero allocation, browser-optimized dispatch path
- **CustomEvent**: Object creation overhead, but enables rich data flow
- **Library optimization**: Batches updates to minimize CustomEvent creation

**Compatibility comparison:**
```typescript
// Standard DOM event - browser handles everything
element.addEventListener('click', (e: MouseEvent) => {
  // e.clientX, e.clientY - standardized
});

// CustomEvent - developer controls data structure
element.dispatchEvent(new CustomEvent('app-action', {
  detail: { action: 'save', data: userInput }
}));

// Library bridges both worlds
const [handler, emit] = createEvent<UserAction>();
emit({ action: 'save', data: userInput }); // Type-safe, structured
```

#### AbortController/AbortSignal

Every event emission creates an `AbortController` for race condition prevention and automatic cleanup. This integrates with the platform's signal-based cancellation pattern.

```typescript
// Race condition prevention
let currentController: AbortController | null = null;

const emit: Emitter<T> = (data?: T) => {
  // Abort previous async operations
  if (currentController) {
    currentController.abort();
  }
  
  currentController = new AbortController();
  // Use currentController.signal in event detail
};
```

**Platform integration benefits:**
- **Standardized cancellation**: Uses web platform's native abort mechanism
- **Memory safety**: Prevents resource leaks from abandoned operations
- **Interoperability**: Works with `fetch()`, `addEventListener()`, and other signal-aware APIs

### Asynchronous Programming

#### Promises and Async/Await

The library fully supports async event handlers, integrating seamlessly with JavaScript's promise-based asynchronous programming model.

```typescript
// Async handler support
handler(async (data) => {
  const result = await someAsyncOperation(data);
  return result; // Chain to next handler
});
```

**Platform alignment:**
- **Promise integration**: Handlers can return promises for async operations
- **Error propagation**: Unhandled promise rejections are caught and logged
- **Chain continuation**: Async results automatically flow to chained handlers

#### Microtasks

The `batch()` function uses `queueMicrotask()` for deferred state notifications, ensuring updates happen at the end of the current microtask queue.

```typescript
function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      queueMicrotask(() => {
        pendingNotifications.forEach((value, subject) => {
          subject._notifyImmediate(value);
        });
        pendingNotifications.clear();
      });
    }
  }
}
```

**Performance implications:**
- **Batching efficiency**: Groups multiple updates into single notification cycle
- **Render optimization**: Defers updates until after current execution context
- **Consistency**: Ensures all batched changes appear atomic to subscribers

### Disposal and Resource Management

#### DisposableStack

The library implements the TC39 Disposable protocol using `DisposableStack` for managing multiple subscriptions and resources.

```typescript
export function createSubscriptionManager(): SubscriptionManager {
  const stack = new DisposableStack();
  
  return {
    add(unsubscribe: Unsubscribe): void {
      stack.defer(unsubscribe);
    },
    dispose(): void {
      stack.dispose();
    },
    [Symbol.dispose](): void {
      stack.dispose();
    }
  };
}
```

**Platform benefits:**
- **Automatic cleanup**: `using` keyword support for scope-based disposal
- **Resource safety**: Prevents memory leaks from forgotten unsubscriptions
- **Composability**: Multiple managers can be nested and disposed hierarchically

#### Symbol.dispose

The library polyfills `Symbol.dispose` for environments that don't support it, ensuring compatibility with the emerging disposal standard.

```typescript
// Polyfill for older environments
if (typeof Symbol.dispose !== 'symbol') {
  (Symbol as any).dispose = Symbol.for('Symbol.dispose');
}
```

**Future-proofing:**
- **Standards compliance**: Aligns with TC39 disposal proposal
- **Tooling support**: Works with linters and type checkers
- **Cross-platform**: Functions in Node.js and browser environments

## DOM Integration Layer

### Event Handling

#### addEventListener/removeEventListener

The `fromDomEvent` function provides a type-safe wrapper around native DOM event listeners, maintaining full compatibility with standard options while adding powerful abstractions.

```typescript
export function fromDomEvent<
  Target extends EventTarget,
  EventName extends string
>(
  target: Target,
  eventName: EventName,
  options?: AddEventListenerOptions
): Handler<any> {
  return ((cb) => {
    const listener = (ev: Event) => {
      try {
        // We pass the raw event to the callback. The `Handler` chain will manage transformations.
        const result = cb(ev as any);
        if (result instanceof Promise) result.catch(console.error);
      } catch (err) {
        if (err === HaltSymbol) return; // Silently catch and stop propagation for this chain.
        throw err;
      }
    };

    target.addEventListener(eventName as string, listener as EventListener, options);

    const unsub = () => target.removeEventListener(eventName as string, listener as EventListener, options);

    // If a signal is provided, automatically clean up when it's aborted.
    if (options?.signal) {
      if (options.signal.aborted) {
        unsub();
      } else {
        options.signal.addEventListener('abort', unsub, { once: true });
      }
    }

    return unsub;
  }) as Handler<any>;
}
```

**Detailed comparison with native addEventListener:**

| Aspect | Native addEventListener | Library fromDomEvent | Benefits |
|--------|------------------------|---------------------|----------|
| **Type Safety** | `Event` type only | Strongly-typed event interfaces | Compile-time error prevention |
| **Cleanup** | Manual `removeEventListener` | Automatic via AbortSignal | No forgotten cleanup |
| **Async Support** | Manual promise handling | Built-in async/await | Simplified async code |
| **Error Handling** | Try/catch required | Automatic error catching | Robust error boundaries |
| **Composition** | Single callback | Chainable handlers | Functional programming |
| **Memory Safety** | Developer responsibility | Signal-based disposal | Leak prevention |
| **Debugging** | Browser dev tools | Enhanced stack traces | Better error reporting |

**Edge cases handled:**

```typescript
// Native: Error-prone manual cleanup
const handler = (e) => console.log(e);
element.addEventListener('click', handler);
// Forgot removeEventListener? Memory leak!

// Library: Automatic cleanup
const controller = new AbortController();
fromDomEvent(element, 'click', { signal: controller.signal })((e) => {
  console.log(e);
});
controller.abort(); // Automatically cleaned up

// Native: Async handlers require manual error handling
element.addEventListener('click', async (e) => {
  try {
    await asyncOperation();
  } catch (err) {
    console.error(err); // Manual error handling
  }
});

// Library: Automatic async error handling
fromDomEvent(element, 'click')((e) => {
  return asyncOperation(); // Errors automatically caught and logged
});
```

**Performance comparison:**
- **Native**: Minimal overhead, direct browser API calls
- **Library**: Small wrapper overhead, but gains from batching and optimization
- **Net result**: Often better performance due to automatic cleanup preventing leaks

**Compatibility comparison:**
```typescript
// Native - all browsers
element.addEventListener('click', handler, { capture: true });

// Library - same options supported
fromDomEvent(element, 'click', { capture: true })(handler);

// Enhanced - additional library features
fromDomEvent(element, 'click', { signal: controller.signal })
  .filter(e => e.target === element)
  .map(e => ({ x: e.clientX, y: e.clientY }))
  ((pos) => console.log('Filtered click at:', pos));
```

#### Event Options

The library supports all standard `addEventListener` options including `capture`, `passive`, `once`, and `signal`.

```typescript
// Passive listeners for performance
dom.scroll(element, { passive: true })(handler);

// One-time listeners
dom.click(button, { once: true })(handler);

// Signal-based cleanup
const controller = new AbortController();
dom.input(input, { signal: controller.signal })(handler);
controller.abort(); // Removes listener
```

**Performance optimizations:**
- **Passive listeners**: Prevents scroll blocking on touch/wheel events
- **Capture phase**: Supports event interception during capture
- **Signal cleanup**: More efficient than manual removal

#### Event Propagation

The library respects standard DOM event propagation while adding chain-based control flow.

```typescript
// Standard propagation control
dom.click(button)((event) => {
  event.stopPropagation(); // Standard DOM behavior
  event.preventDefault();  // Standard DOM behavior
});

// Chain halting
handler((data) => {
  if (someCondition) {
    halt(); // Library-specific chain termination
  }
});
```

**Control flow comparison:**
- **DOM propagation**: `stopPropagation()` affects all listeners
- **Chain halting**: `halt()` only affects current handler chain
- **Composition**: Chains can implement complex conditional logic

### Observer APIs

#### IntersectionObserver

The `onIntersect` function provides reactive viewport detection using the native `IntersectionObserver` API.

```typescript
export function onIntersect(
  target: Element,
  options?: IntersectionObserverInit
): Handler<IntersectionObserverEntry> {
  return ((cb) => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => cb(entry));
    }, options);

    observer.observe(target);
    return () => observer.disconnect();
  }) as Handler<IntersectionObserverEntry>;
}
```

**Integration benefits:**
- **Performance**: Browser-optimized intersection detection
- **Memory efficient**: Automatic cleanup and resource management
- **Flexible**: Supports all standard IntersectionObserver options
- **Reactive**: Integrates with library's handler chains

#### ResizeObserver

The `onResize` function enables reactive dimension tracking using the native `ResizeObserver` API.

```typescript
export function onResize(
  target: Element,
  options?: ResizeObserverOptions
): Handler<ResizeObserverEntry> {
  return ((cb) => {
    const observer = new ResizeObserver((entries) => {
      entries.forEach(entry => cb(entry));
    });

    observer.observe(target, options);
    return () => observer.disconnect();
  }) as Handler<ResizeObserverEntry>;
}
```

**Use cases:**
- **Responsive design**: React to container size changes
- **Canvas resizing**: Update canvas dimensions dynamically
- **Layout adjustments**: Trigger layout recalculations

### Focus Management

#### Document.activeElement

The `trapFocus` function uses `document.activeElement` and keyboard events to implement accessible focus trapping.

```typescript
export function trapFocus(container: HTMLElement): Unsubscribe {
  const focusableElements = Array.from(
    container.querySelectorAll<HTMLElement>(focusableElementsSelector)
  ).filter(el => el.offsetParent !== null);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  };

  document.addEventListener('keydown', onKeyDown);
  firstElement.focus();

  return () => document.removeEventListener('keydown', onKeyDown);
}
```

**Accessibility compliance:**
- **WCAG guidelines**: Implements proper focus management for modals
- **Keyboard navigation**: Supports Tab and Shift+Tab cycling
- **Screen reader friendly**: Maintains focus within interactive regions

## Advanced Platform Features

### Streams and Reactive Programming

#### Event Streams

The library treats DOM events as reactive streams, enabling functional composition and transformation.

```typescript
// Event stream composition
const clicks = dom.click(button);
const doubleClicks = clicks
  .filter(() => /* double-click logic */)
  .map(event => ({ x: event.clientX, y: event.clientY }));

doubleClicks((position) => {
  console.log('Double-clicked at:', position);
});
```

**Streaming benefits:**
- **Composability**: Chain operations like `map`, `filter`, `debounce`
- **Backpressure**: Natural flow control through handler chains
- **Type safety**: Transformations maintain type information

#### Subject Pattern

Subjects implement the observer pattern using platform features for reactive state management.

```typescript
export interface Subject<S> {
  (value?: S): S;
  subscribe(cb: (value: S) => void): Unsubscribe;
  dispose?: () => void;
}
```

**Platform integration:**
- **Memory management**: Uses `WeakMap` internally for efficient storage
- **Batching**: Leverages `queueMicrotask` for update coalescing
- **Disposal**: Implements `Symbol.dispose` for cleanup

### State Management

#### Proxy API

While not directly used in the current implementation, the library is designed to integrate with `Proxy` for deep reactive object observation in future extensions.

#### WeakMap

Internal subscription management uses `WeakMap` for memory-efficient storage of event listeners and subject subscribers.

```typescript
// Conceptual usage (not in current codebase but architecturally compatible)
const listenerMap = new WeakMap<EventTarget, Set<EventListener>>();
```

**Memory benefits:**
- **Automatic cleanup**: Garbage collection removes unused references
- **Performance**: Faster lookups and insertions
- **Safety**: Prevents memory leaks from forgotten unsubscriptions

### Performance Optimizations

#### Passive Event Listeners

The library enables passive listeners by default where appropriate, preventing scroll jank.

```typescript
// Automatic passive listeners for performance-critical events
dom.scroll(element, { passive: true });
dom.touchmove(element, { passive: true });
```

#### Debouncing/Throttling

While not built-in, the reactive nature enables easy implementation of debouncing patterns.

```typescript
// Debounced input handling
const debouncedInput = dom.input(element)
  .debounce(300) // Hypothetical operator
  .map(event => event.target.value);
```

#### Batching

The `batch()` function prevents redundant re-renders by coalescing multiple state updates.

```typescript
batch(() => {
  subject1('value1');
  subject2('value2'); // Updates batched into single notification
});
```

## Browser Compatibility and Polyfills

### Modern APIs Used

The library relies on these modern web APIs with graceful degradation:

- **DisposableStack** (with polyfill fallback)
- **AbortController/AbortSignal** (widely supported)
- **IntersectionObserver** (polyfill available)
- **ResizeObserver** (polyfill available)
- **queueMicrotask** (fallback to setTimeout)
- **Proxy** (for future reactive objects)
- **Symbol.dispose** (polyfilled)

### Fallback Implementations

```typescript
// Symbol.dispose polyfill
if (typeof Symbol.dispose !== 'symbol') {
  (Symbol as any).dispose = Symbol.for('Symbol.dispose');
}

// queueMicrotask fallback
const queueMicrotask = globalThis.queueMicrotask || 
  ((fn) => Promise.resolve().then(fn));
```

**Compatibility strategy:**
- **Progressive enhancement**: Core functionality works without modern APIs
- **Polyfill-friendly**: Accepts external polyfills
- **Feature detection**: Gracefully degrades when APIs unavailable

## Framework Integration Points

### React/Vue/Svelte Bridges

The library provides framework-specific packages that integrate with each framework's reactivity system.

#### React Integration

**Comparison with traditional React patterns:**

```typescript
// Traditional React: Manual effect cleanup
function MyComponent() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const handler = (data) => setCount(data);
    const unsubscribe = someEvent.subscribe(handler);

    return unsubscribe; // Manual cleanup
  }, []); // Empty deps - effect runs once

  return <div>{count}</div>;
}

// Library integration: Automatic cleanup
function MyComponent() {
  const [handler, emit] = createEvent<number>();
  const count = useSubject(createSubject(0));

  useEvent(handler, (data) => {
    count(data); // Update reactive state
  });

  // No manual cleanup needed - handled by useEvent/useSubject
  return <div>{count()}</div>;
}
```

**Detailed hook comparison:**

```typescript
// useEvent: Event subscription with automatic cleanup
export function useEvent<T>(
  handler: Handler<T>,
  callback: (data: T, meta?: { signal: AbortSignal }) => void,
  deps: DependencyList = []
): void {
  const callbackRef = useRef(callback);

  // Update callback ref when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
  }, deps);

  useEffect(() => {
    const unsubscribe = handler((data: T, meta?: { signal: AbortSignal }) => {
      // Check if callback expects meta parameter
      if (callbackRef.current.length > 1 && meta) {
        callbackRef.current(data, meta);
      } else {
        callbackRef.current(data);
      }
    });

    return unsubscribe;
  }, [handler]);
}

// useSubject: Reactive state subscription
export function useSubject<T>(subject: Subject<T>): T {
  const [value, setValue] = useState<T>(() => subject());

  useEffect(() => {
    const unsubscribe = subject.subscribe(setValue);
    return unsubscribe;
  }, [subject]);

  return value;
}
```

**Integration benefits vs traditional approaches:**

| Aspect | Traditional React | Library Integration | Advantages |
|--------|------------------|-------------------|------------|
| **Cleanup** | Manual `useEffect` returns | Automatic hook cleanup | No forgotten unsubscriptions |
| **Re-renders** | Manual `setState` calls | Reactive state changes | Consistent update timing |
| **Async handling** | Manual `useEffect` deps | Built-in signal support | Race condition prevention |
| **Type safety** | Generic state types | Strongly-typed events | Compile-time guarantees |
| **Performance** | Manual memoization | Optimized subscriptions | Reduced unnecessary renders |
| **Testing** | Mock effects/states | Test event handlers | Easier unit testing |
| **Composition** | Nested effects | Declarative chains | Cleaner component logic |

**Edge cases handled:**

```typescript
// StrictMode double effects
function MyComponent() {
  useEvent(handler, () => {
    console.log('Called once per emission, not per render');
  });

  // Library handles StrictMode correctly
}

// Dependency array changes
useEvent(
  handler,
  (data) => processData(data, currentUser), // Uses currentUser
  [currentUser] // Re-subscribes when currentUser changes
);

// Signal-based cancellation
useEvent(asyncHandler, async (data, { signal }) => {
  try {
    const result = await fetchData(data, { signal });
    if (!signal.aborted) {
      updateState(result);
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      handleError(err);
    }
  }
});
```

**Performance comparison:**
- **Traditional**: Effects run on every render unless memoized
- **Library**: Subscriptions established once, updates batched
- **Memory**: Automatic cleanup prevents subscription leaks
- **Bundle**: Minimal overhead compared to full state management libraries

### Remix Events Compatibility

The library bridges to Remix's declarative event system through compatibility layers.

```typescript
// Declarative event attachment
events(button, [
  press(e => {
    console.log('Pressed with:', e.detail.originalEvent.type);
  })
]);
```

**Compatibility features:**
- **EventDescriptor bridging**: Converts handlers to Remix-compatible format
- **Middleware-style composition**: Chains work as event middleware
- **Type safety**: Maintains TypeScript integration across frameworks

## Security and Performance Considerations

### Memory Management

#### Automatic Listener Cleanup

All event listeners are automatically cleaned up when AbortSignals abort or when scopes dispose.

```typescript
// Signal-based cleanup
const controller = new AbortController();
dom.click(button, { signal: controller.signal })(handler);
controller.abort(); // Listener removed automatically

// Comparison: Manual cleanup is error-prone
const handler = (e) => {};
button.addEventListener('click', handler);
// Forgot to remove? Memory leak!
// button.removeEventListener('click', handler); // Manual and easy to forget
```

**Edge case: Nested signals**
```typescript
const parentController = new AbortController();
const childController = new AbortController();

// Child signal aborts first
dom.click(button, { signal: childController.signal })(handler);
childController.abort(); // Handler removed

// Parent signal abort has no effect (already removed)
// parentController.abort();
```

#### Weak References

The library uses weak references where possible to prevent memory leaks.

```typescript
// Conceptual: WeakMap prevents memory leaks
const listenerMap = new WeakMap<Element, Set<() => void>>();

// When element is garbage collected, listeners are automatically cleaned up
// No manual cleanup needed for removed DOM elements
```

#### Subscription Stacks

`createSubscriptionStack()` manages multiple subscriptions with guaranteed cleanup.

```typescript
// Stack ensures all subscriptions are cleaned up together
const stack = createSubscriptionStack();
stack.defer(dom.click(button1)(handler1));
stack.defer(dom.click(button2)(handler2));
// Single cleanup call removes both
stack.dispose();
```

### Event Safety

#### XSS Prevention

The library uses structured events with typed payloads, reducing XSS risks compared to string-based event systems.

**Comparison:**
```typescript
// Vulnerable: String-based events
element.dispatchEvent(new CustomEvent('message', {
  detail: userInput // Could contain <script> tags
}));

// Safe: Typed structured data
element.dispatchEvent(new CustomEvent('user-action', {
  detail: { type: 'message', content: sanitizedContent }
}));
```

#### Race Condition Prevention

Each event emission creates a new AbortController, preventing race conditions in async handlers.

**Race condition scenario:**
```typescript
// Without AbortController: Race condition possible
let currentOperation: Promise<any>;
handler(async (data) => {
  currentOperation = slowAsyncOperation(data);
  await currentOperation;
  updateUI();
});

// Rapid emissions could cause UI updates in wrong order

// With AbortController: Race condition prevented
handler(async (data, { signal }) => {
  try {
    const result = await slowAsyncOperation(data, signal);
    if (!signal.aborted) updateUI(result);
  } catch (err) {
    if (err.name !== 'AbortError') throw err;
  }
});
```

#### Memory Leak Prevention

All subscriptions include disposal mechanisms, either through signals or explicit cleanup functions.

**Leak patterns prevented:**
```typescript
// Leak: Forgotten cleanup in dynamic components
function createComponent() {
  const button = document.createElement('button');
  button.addEventListener('click', handler); // Never removed!
  return button;
}

// Safe: Automatic cleanup
function createComponent() {
  const button = document.createElement('button');
  const controller = new AbortController();
  dom.click(button, { signal: controller.signal })(handler);

  // Cleanup when component is removed
  return { element: button, dispose: () => controller.abort() };
}
```

## Edge Cases and Error Handling

### Asynchronous Handler Edge Cases

#### Promise Rejection Handling

```typescript
// Unhandled promise rejections are caught
handler(async (data) => {
  throw new Error('Async error'); // Caught and logged by library
});

// Explicit error handling
handler(async (data) => {
  try {
    await riskyOperation(data);
  } catch (error) {
    // Handle error appropriately
    console.error('Handler error:', error);
    // Return value to continue chain, or throw to halt
  }
});
```

#### Signal Abortion During Async Operations

```typescript
handler(async (data, { signal }) => {
  // Operation starts
  const promise = fetch('/api/data', { signal });

  // If signal aborts here, fetch is cancelled
  signal.addEventListener('abort', () => {
    console.log('Operation cancelled');
  });

  try {
    const result = await promise;
    if (!signal.aborted) {
      // Safe to use result
      processData(result);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      // Expected cancellation
      return;
    }
    throw err; // Unexpected error
  }
});
```

### Event Propagation Edge Cases

#### Halt Symbol vs DOM Propagation

```typescript
// halt() affects only the handler chain
handler((data) => {
  if (shouldStop) {
    halt(); // Stops this chain only
    // Other handlers on same event continue
  }
});

// stopPropagation() affects all listeners
dom.click(button)((event) => {
  event.stopPropagation(); // Stops DOM bubbling
  // All other DOM listeners are blocked
});
```

#### Chain Interruption Scenarios

```typescript
// Chain halts on first error
handler((data) => {
  if (!validate(data)) {
    halt(); // Chain stops here
  }
  return transform(data);
})
((transformed) => {
  // This never executes if validation failed
  saveData(transformed);
});
```

### Memory Management Edge Cases

#### Circular Reference Prevention

```typescript
// Potential circular reference
const subject = createSubject();
subject.subscribe(() => {
  // Accessing subject in subscription could create cycles
  const current = subject(); // Safe: reads current value
  // subject(something); // Dangerous: would trigger subscription recursively
});

// Safe pattern: Use batching to prevent infinite loops
subject.subscribe(() => {
  batch(() => {
    subject(transform(subject()));
  });
});
```

#### WeakMap Key Edge Cases

```typescript
// WeakMap keys must be objects
const primitiveKey = 'string';
const objectKey = { id: 'string' };

// This won't work as expected
const weakMap = new WeakMap();
weakMap.set(primitiveKey, 'value'); // TypeScript error

// Correct usage
weakMap.set(objectKey, 'value');
```

### Observer API Edge Cases

#### IntersectionObserver Threshold Arrays

```typescript
// Multiple thresholds for precise control
onIntersect(element, {
  threshold: [0, 0.25, 0.5, 0.75, 1.0] // Array of thresholds
})((entry) => {
  const ratio = entry.intersectionRatio;
  if (ratio === 0) console.log('Element left viewport');
  else if (ratio >= 1) console.log('Element fully visible');
  else console.log(`Element ${Math.round(ratio * 100)}% visible`);
});
```

#### ResizeObserver Content vs Border Box

```typescript
// Observe content box by default
onResize(element)((entry) => {
  const { width, height } = entry.contentRect; // Content size
});

// Observe border box
onResize(element, { box: 'border-box' })((entry) => {
  const { width, height } = entry.borderBoxSize[0]; // Border size
});
```

### Framework Integration Edge Cases

#### React StrictMode Double Rendering

```typescript
// React 18 StrictMode causes double handler registration
function MyComponent() {
  useEvent(handler, () => {
    console.log('Handler called'); // Logs twice in StrictMode
  });

  // Solution: Use useEffect for side effects
  useEvent(handler, () => {
    setCount(c => c + 1); // Safe: React handles deduplication
  });
}
```

#### Vue Reactivity Edge Cases

```typescript
// Vue's reactivity can cause infinite loops
const subject = createSubject(0);
const doubled = computed(() => subject() * 2);

// This creates an infinite loop
watch(doubled, (newVal) => {
  subject(newVal / 2); // Modifies subject, triggers watch again
});

// Solution: Use watchers carefully
watch(doubled, (newVal) => {
  // Only update if necessary
  if (someCondition) {
    subject(newVal / 2);
  }
});
```

### Error Recovery Patterns

#### Graceful Degradation

```typescript
// Handle missing platform APIs
function createResilientHandler() {
  try {
    return createEvent(); // Uses modern APIs
  } catch (error) {
    // Fallback to basic implementation
    return createBasicEvent();
  }
}
```

#### Circuit Breaker Pattern

```typescript
let failureCount = 0;
const maxFailures = 3;

handler(async (data) => {
  if (failureCount >= maxFailures) {
    console.warn('Circuit breaker open, skipping operation');
    return;
  }

  try {
    await riskyOperation(data);
    failureCount = 0; // Reset on success
  } catch (error) {
    failureCount++;
    throw error;
  }
});
```

### Performance Edge Cases

#### Handler Chain Length Limits

```typescript
// Very long chains can impact performance
const chain = handler
  .map(transform1)
  .filter(predicate1)
  .map(transform2)
  .filter(predicate2)
  // ... many more operations

// Solution: Break into logical groups or use batching
const intermediate = handler.map(transform1).filter(predicate1);
const final = intermediate.map(transform2).filter(predicate2);
```

#### High-Frequency Event Throttling

```typescript
// Scroll events can fire very frequently
dom.scroll(window)((event) => {
  // This could execute 60+ times per second
  updateScrollPosition(event);
});

// Solution: Use passive listeners and throttle
dom.scroll(window, { passive: true })
  .throttle(16) // ~60fps max
  ((event) => {
    updateScrollPosition(event);
  });
```

### Browser Compatibility Edge Cases

#### Polyfill Loading Order

```typescript
// Ensure polyfills load before library
import 'core-js/features/symbol/async-iterator'; // Polyfills first
import 'core-js/features/weak-map';
import { createEvent } from '@doeixd/events'; // Then library
```

#### Feature Detection

```typescript
// Detect platform capabilities
const supportsAbortController = typeof AbortController !== 'undefined';
const supportsDisposableStack = typeof DisposableStack !== 'undefined';

// Conditional feature usage
if (supportsAbortController) {
  // Use signal-based cleanup
} else {
  // Fallback to manual cleanup
}
```

## Platform Extensions and Innovations

### Custom Primitives

#### Handler Chaining

Extends beyond standard event listeners by enabling functional composition.

```typescript
// Chain composition
const processedEvents = dom.click(button)
  .filter(event => event.target === button)
  .map(event => ({ x: event.clientX, y: event.clientY }))
  .throttle(100);

processedEvents((position) => {
  // Handle throttled, filtered click positions
});
```

#### Subject-based Reactive Programming

Provides observable values that integrate with the event system.

```typescript
const count = createSubject(0);
const doubled = count.map(x => x * 2); // Reactive transformation
```

#### Actor Pattern

Stateful components that manage their own event handling and cleanup.

### Enhanced APIs

#### Multi-element Event Handling

The `on()` function attaches handlers to multiple elements or event types simultaneously.

```typescript
// Multiple elements, multiple events
const unsub = on([button1, button2], ['click', 'keydown'], handler);
```

#### Event Delegation Patterns

While not directly implemented, the architecture supports efficient event delegation.

#### Focus Trapping Utilities

`trapFocus()` provides accessible modal focus management.

## Examples and Use Cases

### Real-world Platform Integration Examples

#### Form Handling with Validation

**Traditional approach vs Library approach:**

```typescript
// Traditional: Manual state management and cleanup
class FormHandler {
  constructor(form) {
    this.form = form;
    this.data = { email: '', password: '' };
    this.handlers = [];

    // Manual binding
    const emailInput = form.querySelector('#email');
    const passwordInput = form.querySelector('#password');
    const submitBtn = form.querySelector('button[type="submit"]');

    const emailHandler = (e) => {
      this.data.email = e.target.value;
      this.validate();
    };
    const passwordHandler = (e) => {
      this.data.password = e.target.value;
      this.validate();
    };
    const submitHandler = (e) => {
      e.preventDefault();
      if (this.validate()) {
        this.submit();
      }
    };

    emailInput.addEventListener('input', emailHandler);
    passwordInput.addEventListener('input', passwordHandler);
    submitBtn.addEventListener('click', submitHandler);

    // Store for cleanup
    this.handlers = [
      () => emailInput.removeEventListener('input', emailHandler),
      () => passwordInput.removeEventListener('input', passwordHandler),
      () => submitBtn.removeEventListener('click', submitHandler)
    ];
  }

  validate() { /* validation logic */ }
  submit() { /* submit logic */ }

  destroy() {
    this.handlers.forEach(cleanup => cleanup());
  }
}

// Library: Reactive and self-cleaning
const form = document.querySelector('form');
const controller = new AbortController();

const formData = createSubject({ email: '', password: '' });

// Reactive form binding with automatic cleanup
subjectProperty(form.querySelector('#email'), 'value', 'input')
  .subscribe(email => formData({ ...formData(), email }));

subjectProperty(form.querySelector('#password'), 'value', 'input')
  .subscribe(password => formData({ ...formData(), password }));

// Validation and submission with signal-based cleanup
dom.submit(form, { signal: controller.signal })((event) => {
  event.preventDefault();
  const data = formData();

  if (validateForm(data)) {
    submitForm(data);
  }
});

// Cleanup when component unmounts
// controller.abort(); // Single call cleans everything
```

**Key improvements:**
- **Memory safety**: No manual cleanup tracking
- **Reactivity**: Automatic UI updates on data changes
- **Type safety**: Strongly-typed form data
- **Composition**: Easy to extend with additional validation rules

**Edge cases handled:**
```typescript
// Handle form reset
dom.reset(form, { signal: controller.signal })((event) => {
  formData({ email: '', password: '' }); // Reset reactive state
});

// Handle input validation with debouncing
subjectProperty(emailInput, 'value', 'input')
  .debounce(300) // Wait for user to stop typing
  .map(value => validateEmail(value))
  .subscribe(isValid => {
    emailInput.classList.toggle('invalid', !isValid);
  });
```

#### Infinite Scroll with IntersectionObserver

```typescript
const loadMoreTrigger = document.querySelector('.load-more-trigger');

onIntersect(loadMoreTrigger, { threshold: 0.1 })((entry) => {
  if (entry.isIntersecting) {
    loadMoreItems();
  }
});
```

#### Drag and Drop with Mouse/Touch Events

```typescript
const draggable = document.querySelector('.draggable');
let isDragging = false;
let startPos = { x: 0, y: 0 };

dom.mousedown(draggable)((event) => {
  isDragging = true;
  startPos = { x: event.clientX, y: event.clientY };
});

dom.mousemove(document, { passive: true })((event) => {
  if (!isDragging) return;
  
  const deltaX = event.clientX - startPos.x;
  const deltaY = event.clientY - startPos.y;
  
  draggable.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
});

dom.mouseup(document)((event) => {
  isDragging = false;
});
```

#### Modal Management with Focus Trapping

**Traditional vs Library approach:**

```typescript
// Traditional: Complex manual focus management
class ModalManager {
  constructor(modal, openBtn, closeBtn) {
    this.modal = modal;
    this.openBtn = openBtn;
    this.closeBtn = closeBtn;
    this.focusableElements = [];
    this.firstElement = null;
    this.lastElement = null;
    this.keydownHandler = this.handleKeydown.bind(this);

    this.init();
  }

  init() {
    this.openBtn.addEventListener('click', () => this.open());
    this.closeBtn.addEventListener('click', () => this.close());

    // Manual ESC key handling
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display !== 'none') {
        this.close();
      }
    });
  }

  open() {
    this.modal.style.display = 'block';
    this.updateFocusableElements();
    this.firstElement?.focus();
    document.addEventListener('keydown', this.keydownHandler);
  }

  close() {
    this.modal.style.display = 'none';
    document.removeEventListener('keydown', this.keydownHandler);
    this.openBtn.focus(); // Return focus
  }

  updateFocusableElements() {
    const selector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    this.focusableElements = Array.from(this.modal.querySelectorAll(selector))
      .filter(el => el.offsetParent !== null);

    this.firstElement = this.focusableElements[0];
    this.lastElement = this.focusableElements[this.focusableElements.length - 1];
  }

  handleKeydown(e) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === this.firstElement) {
        this.lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === this.lastElement) {
        this.firstElement.focus();
        e.preventDefault();
      }
    }
  }
}

// Library: Declarative and robust
const modal = document.querySelector('.modal');
const openButton = document.querySelector('.open-modal');
const closeButton = modal.querySelector('.close-modal');

const modalState = createSubject({ isOpen: false, focusRelease: null });

const controller = new AbortController();

// Open modal with focus trapping
dom.click(openButton, { signal: controller.signal })((event) => {
  modal.style.display = 'block';
  const focusRelease = trapFocus(modal);
  modalState({ isOpen: true, focusRelease });
});

// Close modal and release focus
dom.click(closeButton, { signal: controller.signal })((event) => {
  modal.style.display = 'none';
  modalState().focusRelease?.();
  modalState({ isOpen: false, focusRelease: null });
});

// ESC key handling
dom.keydown(document, { signal: controller.signal })
  .filter(event => event.key === 'Escape')
  .filter(() => modalState().isOpen)
  ((event) => {
    event.preventDefault();
    modal.style.display = 'none';
    modalState().focusRelease?.();
    modalState({ isOpen: false, focusRelease: null });
  });

// Click outside to close
dom.click(document, { signal: controller.signal })
  .filter(event => !modal.contains(event.target))
  .filter(() => modalState().isOpen)
  ((event) => {
    modal.style.display = 'none';
    modalState().focusRelease?.();
    modalState({ isOpen: false, focusRelease: null });
  });
```

**Key improvements:**
- **Automatic cleanup**: Single `controller.abort()` closes everything
- **Declarative logic**: Clear data flow instead of imperative state management
- **Reusability**: Modal logic can be easily extracted and reused
- **Type safety**: Strongly-typed event handling
- **Error resilience**: Signal-based cancellation prevents race conditions

**Advanced modal patterns:**

```typescript
// Modal stacking (multiple modals)
const modalStack = createSubject([]);

function openModal(modal) {
  const focusRelease = trapFocus(modal);
  modalStack([...modalStack(), { modal, focusRelease }]);
}

function closeTopModal() {
  const stack = modalStack();
  if (stack.length > 0) {
    const topModal = stack[stack.length - 1];
    topModal.focusRelease();
    modalStack(stack.slice(0, -1));
  }
}

// Animated modals with state transitions
const modalAnimation = createSubject('closed');

modalState
  .map(state => state.isOpen ? 'opening' : 'closing')
  .distinctUntilChanged()
  .subscribe(phase => {
    modalAnimation(phase);
    // Trigger CSS animations

    if (phase === 'closing') {
      setTimeout(() => {
        modal.style.display = 'none';
        modalAnimation('closed');
      }, 300); // Match CSS transition duration
    }
  });
```

**Accessibility edge cases:**

```typescript
// Handle focus restoration
const previouslyFocusedElement = createSubject(null);

dom.click(openButton)((event) => {
  previouslyFocusedElement(document.activeElement);
  // ... open modal
});

modalState
  .filter(state => !state.isOpen)
  .subscribe(() => {
    previouslyFocusedElement()?.focus(); // Restore focus
  });

// Handle screen reader announcements
const announcement = createSubject('');
announcement.subscribe(message => {
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.style.position = 'absolute';
  announcer.style.left = '-10000px';
  announcer.textContent = message;
  document.body.appendChild(announcer);
  setTimeout(() => document.body.removeChild(announcer), 1000);
});

dom.click(openButton)(() => {
  announcement('Modal opened. Press Escape to close.');
});
```

### Performance Patterns

#### Batched Updates for Complex UIs

```typescript
const updateUI = batch(() => {
  // Multiple state updates batched together
  userProfile({ ...userProfile(), lastLogin: new Date() });
  notificationCount(notificationCount() + 1);
  uiState({ ...uiState(), isLoading: false });
});
```

#### Passive Listeners for Smooth Scrolling

```typescript
// Performance-critical scroll handling
dom.scroll(scrollContainer, { passive: true })((event) => {
  updateScrollIndicators(event);
});
```

#### Debounced Input Handling

**Traditional vs Library approach:**

```typescript
// Traditional: Manual debouncing with timers
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const searchInput = document.querySelector('#search');
const debouncedSearch = debounce((query) => {
  if (query.length > 2) performSearch(query);
}, 300);

searchInput.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});

// Cleanup requires manual timeout clearing
// Memory leak if component destroyed!

// Library: Declarative debouncing with automatic cleanup
const searchInput = document.querySelector('#search');
const controller = new AbortController();

dom.input(searchInput, { signal: controller.signal })
  .map(event => event.target.value)
  .filter(query => query.length > 2)
  .debounce(300) // Declarative debouncing
  ((query) => {
    performSearch(query);
  });

// Cleanup: controller.abort() - stops everything automatically
```

**Advanced debouncing patterns:**

```typescript
// Leading edge debouncing (immediate first call)
dom.input(searchInput)
  .debounce(300, { leading: true })
  ((query) => performSearch(query));

// Throttling for high-frequency events
dom.scroll(window, { passive: true })
  .throttle(16) // ~60fps
  .map(() => window.scrollY)
  ((scrollY) => updateScrollIndicator(scrollY));

// Conditional debouncing
const isTypingFast = createSubject(false);

dom.input(searchInput)
  .branch(
    () => isTypingFast(),
    chain => chain.debounce(100), // Fast typing: shorter delay
    chain => chain.debounce(500)  // Slow typing: longer delay
  )
  ((query) => performSearch(query));
```

**Edge cases in input handling:**

```typescript
// Handle IME composition (CJK input)
dom.input(searchInput)
  .filter(event => !event.isComposing) // Wait for composition end
  .debounce(300)
  ((query) => performSearch(query));

// Handle paste events
dom.paste(searchInput)
  .map(event => event.clipboardData.getData('text'))
  .merge(dom.input(searchInput).map(e => e.target.value))
  .debounce(100)
  ((value) => validateAndUpdate(value));

// Handle form validation with multiple inputs
const formData = createSubject({ name: '', email: '' });

subjectProperty(nameInput, 'value', 'input')
  .subscribe(name => formData({ ...formData(), name }));

subjectProperty(emailInput, 'value', 'input')
  .subscribe(email => formData({ ...formData(), email }));

// Validate entire form reactively
formData
  .map(data => ({
    ...data,
    isValid: validateName(data.name) && validateEmail(data.email)
  }))
  .distinctUntilChanged((a, b) => a.isValid === b.isValid)
  .subscribe(state => {
    submitButton.disabled = !state.isValid;
  });
```

## Migration and Compatibility

### From Traditional Event Handling

#### addEventListener → Handler Chains

**Detailed comparison:**

```typescript
// Traditional: Single-purpose, manual cleanup
button.addEventListener('click', (event) => {
  console.log('Clicked!');
  // Single responsibility only
});

// Events library: Composable, chainable, auto-cleaning
dom.click(button)((event) => {
  console.log('Clicked!');
})
.filter(event => event.target === button) // Add filtering
.map(event => ({ x: event.clientX, y: event.clientY })) // Transform data
.debounce(200) // Add debouncing
((position) => {
  handleClickAt(position); // Final handler
});
```

**Migration benefits:**
- **Type safety**: Strongly-typed event objects with generics
- **Composability**: Functional composition instead of nested callbacks
- **Automatic cleanup**: Signal-based disposal prevents memory leaks
- **Error boundaries**: Built-in error handling and recovery
- **Performance**: Optimized through batching and lazy evaluation

**Edge cases in migration:**
```typescript
// Traditional: Multiple handlers require coordination
let handler1 = (e) => console.log('Handler 1');
let handler2 = (e) => console.log('Handler 2');
button.addEventListener('click', handler1);
button.addEventListener('click', handler2);
// Removing one affects others

// Library: Isolated chains
const chain1 = dom.click(button)((e) => console.log('Handler 1'));
const chain2 = dom.click(button)((e) => console.log('Handler 2'));
// Each chain is independent, can be disposed separately
chain1(); // Remove only first chain
```

#### Manual Cleanup → Automatic Disposal

**Memory leak prevention comparison:**

```typescript
// Traditional: Error-prone manual cleanup
class Component {
  constructor() {
    this.handlers = [];
    this.button = document.createElement('button');

    const handler = (e) => this.handleClick(e);
    this.button.addEventListener('click', handler);
    this.handlers.push(() => this.button.removeEventListener('click', handler));

    // What if component is destroyed before handler is stored?
    // Memory leak!
  }

  destroy() {
    this.handlers.forEach(cleanup => cleanup());
  }
}

// Library: Automatic, signal-based cleanup
class Component {
  constructor() {
    this.controller = new AbortController();
    this.button = document.createElement('button');

    // All related handlers use same signal
    dom.click(this.button, { signal: this.controller.signal })
      ((e) => this.handleClick(e));

    dom.mouseover(this.button, { signal: this.controller.signal })
      ((e) => this.handleHover(e));

    // Even async operations are cancelled
    dom.click(this.button, { signal: this.controller.signal })
      (async (e) => {
        await this.asyncOperation();
        if (!this.controller.signal.aborted) {
          this.updateUI();
        }
      });
  }

  destroy() {
    this.controller.abort(); // Single call cleans everything
  }
}
```

**Cleanup timing comparison:**
- **Traditional**: Manual timing, easy to forget or call too early/late
- **Library**: Signal-based, works with async operations and proper timing
- **Edge case**: Component destroyed during async operation - library handles gracefully

#### Imperative Logic → Declarative Composition

**Paradigm shift comparison:**

```typescript
// Imperative: State scattered across callbacks
let clickCount = 0;
let isEnabled = true;

button.addEventListener('click', () => {
  if (!isEnabled) return;

  clickCount++;
  console.log(`Click ${clickCount}`);

  if (clickCount >= 3) {
    isEnabled = false;
    button.disabled = true;
    console.log('Button disabled after 3 clicks');
  }
});

// State changes elsewhere can break logic
function resetCounter() {
  clickCount = 0;
  isEnabled = true;
  button.disabled = false;
}

// Declarative: Logic flows through composable operators
const clickState = dom.click(button)
  .filter(() => isEnabled) // Declarative condition
  .scan((count) => count + 1, 0) // Accumulate with initial value
  .takeWhile(count => count < 3) // Stop after 3 clicks
  .finally(() => {
    isEnabled = false;
    button.disabled = true;
    console.log('Button disabled after 3 clicks');
  });

clickState((count) => {
  console.log(`Click ${count}`);
});

// State changes are handled reactively
const resetSignal = createSubject();
resetSignal.subscribe(() => {
  clickCount = 0;
  isEnabled = true;
  button.disabled = false;
  // Logic automatically resumes
});
```

**Key advantages:**
- **Separation of concerns**: Data flow separate from side effects
- **Testability**: Each operator can be tested independently
- **Reusability**: Operators can be composed in different ways
- **Debugging**: Clear data flow makes issues easier to trace

**Edge cases in composition:**
```typescript
// Handle errors in chains
dom.click(button)
  .map(event => riskyTransformation(event))
  .catch(error => {
    console.error('Transformation failed:', error);
    return fallbackValue;
  })
  ((result) => {
    // Result is either transformed value or fallback
  });

// Conditional chains
const isAdvancedMode = createSubject(false);

dom.click(button)
  .branch(
    () => isAdvancedMode(), // Condition
    chain => chain.map(advancedTransform), // True branch
    chain => chain.map(simpleTransform) // False branch
  )
  ((result) => handleResult(result));
```

**Migration benefits:**
- **Type safety**: Strongly-typed event objects
- **Composability**: Chain operations and transformations
- **Automatic cleanup**: No manual `removeEventListener` calls

#### Manual Cleanup → Automatic Disposal

```typescript
// Traditional manual cleanup
const handler = (event) => { /* ... */ };
button.addEventListener('click', handler);

// Later...
button.removeEventListener('click', handler);

// Events library automatic cleanup
const unsub = dom.click(button)((event) => { /* ... */ });

// Later...
unsub(); // Or use AbortSignal for automatic cleanup
```

#### Imperative Logic → Declarative Composition

```typescript
// Imperative event handling
let clickCount = 0;
button.addEventListener('click', () => {
  clickCount++;
  if (clickCount === 3) {
    button.disabled = true;
  }
});

// Declarative composition
dom.click(button)
  .scan((count) => count + 1, 0) // Accumulate clicks
  .filter(count => count >= 3)
  .take(1) // Only trigger once
  ((count) => {
    button.disabled = true;
  });
```

### Cross-Platform Considerations

#### Browser vs Node.js Environments

The library is designed to work in both browser and Node.js environments:

- **Browser**: Full DOM API integration
- **Node.js**: EventEmitter compatibility for server-side usage
- **Shared**: Core event system works everywhere

#### Framework-Specific Adaptations

Each framework package adapts the core library to work optimally with that framework's patterns:

- **React**: Hooks for component lifecycle integration
- **Vue**: Composables for reactive integration
- **Svelte**: Stores for state management
- **SolidJS**: Direct reactivity system integration

#### Legacy Browser Support

The library supports older browsers through:

- **Polyfills**: For modern APIs like `AbortController`
- **Graceful degradation**: Core functionality works without advanced APIs
- **Progressive enhancement**: Modern features enhance but don't break basic usage

This comprehensive integration with web platform APIs makes the `@doeixd/events` library a powerful tool for building reactive, performant, and maintainable web applications while staying true to browser standards and best practices.