# The Architect's Guide to Time, Control, and Memory in `@doeixd/events`

In a synchronous world, code is simple: A happens, then B happens. But modern user interfaces are fundamentally asynchronous. User input, network requests, and animations all happen on their own timelines, creating a complex web of concurrency that is a notorious source of bugs like race conditions, memory leaks, and unresponsive UIs.

`@doeixd/events` is not just a tool for handling events; it is a comprehensive system for managing time, control flow, and system resources. This guide provides a detailed look at the mechanisms the library uses to make asynchronous logic safe, predictable, and robust, transforming chaos into controlled orchestration.

We will cover:
1.  **The Flow of Control:** How events propagate through synchronous and asynchronous chains.
2.  **Cancellation:** The automatic, life-saving mechanism for preventing async race conditions.
3.  **Halting vs. `preventDefault`:** The crucial difference between stopping a data pipeline and a UI behavior.
4.  **Disposal:** The modern, error-proof system for preventing memory leaks.
5.  **Scheduling & Batching:** How microtasks are leveraged to optimize state updates and prevent UI glitches.

<br />

### 1. The Flow of Control: From Synchronous Sprint to Asynchronous Relay Race

Understanding how an `emit` call travels through a `Handler` chain is the foundation for everything that follows.

#### The Synchronous Sprint

By default, a chain of event handlers executes as a single, uninterrupted, synchronous block of code. The `emit` function is a starting pistol, and the entire chain is a sprint to the finish line.

```typescript
const [onNumber, emitNumber] = createEvent<number>();

const onDoubled = onNumber(n => {
  console.log('1. Doubling:', n); // Runs
  return n * 2;
});

const onStringified = onDoubled(n => {
  console.log('2. Stringifying:', n); // Runs immediately after
  return `Result: ${n}`;
});

onStringified(str => {
  console.log('3. Final subscription:', str); // Runs immediately after that
});

console.log('START');
emitNumber(5);
console.log('END');

// CONSOLE OUTPUT:
// > START
// > 1. Doubling: 5
// > 2. Stringifying: 10
// > 3. Final subscription: Result: 10
// > END
```
**Mental Model:** The entire operation happens within a single "tick" of the event loop. The `emit` call will not return until all synchronous work is complete.

#### The Asynchronous Relay Race

When any handler in a chain returns a `Promise`, the nature of the execution changes fundamentally. The sprint becomes a relay race.

```typescript
const [onNumber, emitNumber] = createEvent<number>();

const onAsyncDouble = onNumber(async n => {
  console.log('1. Runner 1 starts (async)');
  await new Promise(res => setTimeout(res, 10)); // The first leg of the race
  return n * 2;
});

const onStringified = onAsyncDouble(n => {
  // This is Runner 2. They are waiting for the baton (the resolved promise).
  console.log('2. Runner 2 receives baton, starts sprint');
  return `Result: ${n}`;
});

console.log('START');
emitNumber(5);
console.log('RACE IN PROGRESS...'); // The original call returns immediately.

// CONSOLE OUTPUT:
// > START
// > 1. Runner 1 starts (async)
// > RACE IN PROGRESS...
// (approx. 10ms later)
// > 2. Runner 2 receives baton, starts sprint
```
**How it Works (Inside `main.ts`):** When `@doeixd/events` detects a `Promise` returned from a handler, it doesn't wait. It attaches a `.then()` to that promise and immediately returns control to the caller. When the promise resolves, its value is pushed into a new, internal event target, effectively "handing off the baton" to the next handler in the chain, which starts its own leg of the race.

<br />

### 2. Cancellation: Winning the Race by Quitting

This is arguably the library's most critical feature for building robust applications. It provides an automatic, zero-configuration solution to asynchronous race conditions.

**The Classic Bug:** A user types "a", then "ab" in a search box. The slow "a" request returns *after* the fast "ab" request, overwriting the correct results with stale data.

**The `@doeixd/events` Solution: Automatic Signal Management**
The `createEvent` primitive is a brilliant manager. It maintains an internal `AbortController` that represents the "current" operation.

```typescript
// Conceptual logic from main.ts
function createEvent<T>() {
  let currentController: AbortController | null = null;

  const emit: Emitter<T> = (data) => {
    // 1. DISQUALIFY THE PREVIOUS RUNNER: If an async operation from a
    //    previous `emit` is still running, its signal is aborted.
    currentController?.abort();

    // 2. START A NEW RACE: A new controller and signal are created for this specific `emit` call.
    currentController = new AbortController();

    // 3. FIRE THE STARTING PISTOL: The event is dispatched, and every
    //    handler receives this new, unique signal.
    target.dispatchEvent(new CustomEvent(..., { detail: { data, signal: currentController.signal } }));
  };
  // ...
}
```

**Practical Application:** Your only job as a developer is to pass this provided signal to any cancellable async API, like `fetch`.

```typescript
const [onSearch, emitSearch] = createEvent<string>();

onSearch(async (query, meta) => {
  try {
    const response = await fetch(`/api/search?q=${query}`, {
      signal: meta.signal, // Pass the managed signal here. That's it.
    });
    // ... update UI
  } catch (err) {
    if (err.name === 'AbortError') {
      // This block executes for the first, now-cancelled, fetch.
      // It's not an error, it's the system working as designed.
      console.log(`Request for "${query}" was correctly cancelled.`);
      return; 
    }
  }
});

emitSearch('react'); // Starts Fetch A with Signal A.
emitSearch('solid'); // Aborts Signal A, cancelling Fetch A. Starts Fetch B with Signal B.
```
**Mental Model:** Think of each `emit` as launching a mission. When you launch a new mission, Mission Control automatically sends a "self-destruct" command to the previous one. This guarantees that only the results from the *latest* mission can ever succeed.

<br />

### 3. Flow Control: `halt()` vs. `preventDefault()`

Both `halt()` and `preventDefault()` stop things, but they operate at different layers of the system and for different reasons. Understanding this distinction is key to building composable logic.

| Feature | `halt()` | `event.preventDefault()` |
| :--- | :--- | :--- |
| **Domain** | `@doeixd/events` (Functional Core) | DOM API (Declarative Layer) |
| **Scope** | Stops a **single `Handler` data-flow chain**. | Stops the **middleware chain** in the `events()` attacher. |
| **Effect** | Other independent subscribers to the same source **are NOT affected**. | Other subscribers in the `events()` array for that event **ARE affected** (skipped). |
| **Analogy** | A quality control check on a single assembly line fails; that one product is discarded, but other lines keep running. | The main power switch for the entire assembly floor is flipped; all lines stop for this cycle. |

**When to use `halt()`:**
Use it inside a functional `Handler` chain to filter data. It's a data-flow tool.

```typescript
const [onNumber, emitNumber] = createEvent<number>();

// Chain A: Processes only positive numbers
const onPositive = onNumber(n => n > 0 ? n : halt());
onPositive(n => console.log('Positive chain:', n));

// Chain B: Processes ALL numbers, unaffected by Chain A's halt
onNumber(n => console.log('Logger chain:', n));

emitNumber(10);  // Both chains log
emitNumber(-5); // Only "Logger chain" logs. `halt` stopped Chain A internally.
```

**When to use `event.preventDefault()`:**
Use it inside the `events()` attacher to prevent default browser actions *and* stop subsequent handlers in the array from running. It's a UI behavior composition tool.

```typescript
events(linkElement, [
  // Handler 1: Consumer's validation logic
  dom.click(e => {
    if (shouldStayOnPage()) {
      e.preventDefault(); // Prevents both browser navigation AND Handler 2
    }
  }),

  // Handler 2: Component's default navigation logic
  dom.click(e => {
    // This code will only run if Handler 1 did NOT call preventDefault.
    navigateTo('/new-page');
  })
]);
```

<br />

### 4. Disposal: Winning the War on Memory Leaks

Forgetting to unsubscribe is the most common cause of memory leaks in event-driven applications. `@doeixd/events` provides a modern, robust, and error-proof system for resource management.

**The Foundation: The `Disposable` Standard**
The library's internal `createSubscriptionStack` intelligently uses the modern `DisposableStack` API. This is more robust than a simple `try...finally` block.

**The Problem `DisposableStack` Solves:**
Imagine cleaning up three subscriptions. If the second one's `unsubscribe` function throws an error:
-   **Traditional `for` loop:** The loop breaks. The third `unsubscribe` is never called. **This is a memory leak.**
-   **`DisposableStack`:** It catches the error from the second `unsubscribe`, *continues to call the third `unsubscribe`*, and then throws a special `SuppressedError` containing the original error at the end. **No leak.**

**Practical Application: `createSubscriptionManager`**
You can leverage this robustness in your own code for managing the lifecycle of multiple subscriptions.

```typescript
import { createSubscriptionManager, createEvent, createSubject } from '@doeixd/events';

class DataWidget {
  private manager = createSubscriptionManager();
  private dataSubject = createSubject([]);
  private [onRefresh, emitRefresh] = createEvent();

  constructor() {
    // Add subscriptions to the manager. It keeps track of their cleanup functions.
    this.manager.add(this.dataSubject.subscribe(this.render));
    this.manager.add(this.onRefresh(this.fetchData));
    
    // An alternative is the `using` keyword for block-scoped cleanup (in modern JS environments)
    // using manager = createSubscriptionManager();
  }

  // This method is called when the widget is removed from the DOM.
  destroy() {
    this.manager.dispose(); // This single call cleans up everything reliably.
    console.log('DataWidget and all its subscriptions have been destroyed.');
  }
}
```

<br />

### 5. Scheduling & Batching: From Immediate to Optimized

The final piece of the puzzle is controlling *when* state notifications fire. Synchronous, immediate updates are simple but can lead to performance issues and UI glitches ("tearing"), where one part of the UI updates before another in the same operation.

**The `batch` Solution: A Promise of Consistency**
The `batch` function is a performance optimization that defers all `Subject` notifications within its callback until the end of the current microtask.

**How it Works:**
`batch` uses a simple counter. While this counter is active, any `subject(newValue)` call bypasses its subscribers and instead stages the update in a global `pendingNotifications` Map. When the outermost `batch` call finishes, it schedules a single microtask (using `queueMicrotask`). In that future tick, it flushes the map, notifying each subscriber of each updated subject only **once** with its **final** value.

```typescript
const firstName = createSubject('Jane');
const lastName = createSubject('Doe');
const fullName = select([firstName, lastName], () => `${firstName()} ${lastName()}`);

fullName.subscribe(name => console.log(`UI updated with: ${name}`));

console.log('--- START BATCH ---');
batch(() => {
  firstName('John'); // Notification is deferred.
  console.log('First name set.');
  lastName('Smith'); // Notification is deferred.
  console.log('Last name set.');
  // The `fullName` `select` function has not run yet.
});
console.log('--- END BATCH ---');

// CONSOLE OUTPUT:
// > --- START BATCH ---
// > First name set.
// > Last name set.
// > --- END BATCH ---
// (at the very end of the current task, in a microtask)
// > UI updated with: John Smith 
```

**Mental Model:** `batch` tells the system: "I'm about to make several related changes. Please don't tell anyone or recalculate anything until I'm completely finished. Then, tell everyone just once." This prevents redundant computations and ensures the UI always reflects a consistent, logical state.