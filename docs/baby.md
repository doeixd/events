# Introducing `@doeixd/events`: Where Solid's Reactivity Meets Remix's Composability

In the world of modern web development, we're constantly seeking better patterns for managing the two trickiest parts of any application: state and user events. Two libraries have recently offered brilliant but distinct solutions:

*   **`solid-events`** from the SolidJS ecosystem, which champions a declarative, reactive approach where state is a direct result of event streams.
*   **`@remix-run/events`**, a low-level toolkit that provides a robust, composable engine for attaching event listeners and creating reusable, stateful "Interactions."

A while ago, we imagined what would happen if you could combine the elegant, declarative logic of `solid-events` with the powerful, composable attachment engine of Remix Events. That idea became **`@doeixd/events`**—the conceptual love child of these two powerful ideas.

Today, that "baby" has grown up. With the latest version, it has not only matured but also learned some incredible new skills, incorporating the power of **RxJS-style operators** and **built-in async safety**.

## Part 1: The SolidJS DNA - Declarative Event Logic

At its core, `@doeixd/events` still carries the philosophical DNA of `solid-events`. It treats events not just as things that happen, but as streams of data that can be transformed, filtered, and composed to declaratively define your application's state.

The two fundamental primitives, `createEvent` and `createSubject`, allow you to define how your state changes in response to events, right where you create it.

```typescript
import { createEvent, createSubject } from '@doeixd/events';

// 1. Define the events that can happen
const [onIncrement, emitIncrement] = createEvent<number>();
const [onReset, emitReset] = createEvent();

// 2. Define state as a result of those events
const count = createSubject(0,
  // When 'onIncrement' happens, update the count
  onIncrement(delta => currentCount => currentCount + delta),
  // When 'onReset' happens, set the count to 0
  onReset(() => 0)
);

count.subscribe(value => console.log(`Count is now: ${value}`));

emitIncrement(5); // Logs: "Count is now: 5"
emitReset();      // Logs: "Count is now: 0"
```

This pattern makes your state logic traceable, predictable, and co-located with the state itself.

## Part 2: The Remix DNA - Composable Event Attachment

While the logic is inspired by Solid, the library is designed as the perfect companion to `@remix-run/events`. The relationship is simple:

*   **`@remix-run/events`** is the **engine**. It attaches listeners and builds high-level, reusable Interactions.
*   **`@doeixd/events`** is the **logic toolkit**. It builds the reactive pipelines that process the event data.

The `toEventDescriptor` function bridges these two worlds, allowing you to plug any powerful event chain directly into Remix's engine.

```typescript
import { events } from '@remix-run/events';
import { dom, halt, toEventDescriptor } from '@doeixd/events';

// Create a declarative validation pipeline
const onValidatedSubmit = dom.submit(formElement)(event => {
    event.preventDefault(); // Chain 1: Prevent default
    return event;
  })( () => {
    if (emailInput.value.includes('@')) { // Chain 2: Validate
      return { email: emailInput.value };
    }
    return halt(); // Stop the chain if invalid
  });

// Bridge the pipeline to Remix and attach it
const submitDescriptor = toEventDescriptor(onValidatedSubmit, 'submit');
events(formElement, [submitDescriptor]);
```

## Part 3: Now with RxJS Superpowers - Introducing Handler Operators

This is where the library takes a massive leap forward. The latest version introduces **Handler Operators**—pipeable functions that transform event streams, just like in RxJS.

Complex, stateful event logic like debouncing, throttling, or detecting double-clicks is now trivial.

Let's revisit building a `doubleClick` interaction. Previously, you'd write the timing logic by hand. Now, you can just use the built-in `doubleClick` operator:

```typescript
import { dom } from '@doeixd/events';
import { doubleClick } from '@doeixd/events/operators'; // Import the operator

// 1. Start with a DOM event stream
const onButtonClick = dom.click(button);

// 2. Pipe it through the doubleClick operator
const onButtonDoubleClick = doubleClick(500)(onButtonClick);

// 3. Subscribe to the result
onButtonDoubleClick(() => console.log('Double click detected!'));
```

It's that simple. The operator encapsulates all the complex timer logic, leaving you with clean, declarative code. The same goes for debouncing user input:

```typescript
import { dom } from '@doeixd/events';
import { debounce } from '@doeixd/events/operators';

const onDebouncedInput = debounce(300)(dom.input(textInput));

onDebouncedInput((event) => {
  console.log('User stopped typing:', event.target.value);
});
```

These operators are not meant to replace Remix Interactions. They serve different purposes:
*   **Handler Operators** are for transforming *single* event streams (timing, filtering, data mapping).
*   **Remix Interactions** are for composing *multiple* event types (e.g., mouse, keyboard, touch) into a single, high-level user behavior like "press."

They are two powerful tools that work beautifully together.

## Race Conditions Begone: Automatic Async Cancellation

Another sign of the library's maturity is its new focus on async safety. Handling asynchronous operations in event handlers (like fetching data) can lead to race conditions, where an old, slow response overwrites a newer one.

`@doeixd/events` now solves this elegantly. When you create an event with `createEvent`, every handler receives an `AbortSignal`. This signal is **automatically aborted** the next time the event is emitted.

```typescript
const [onSearch, emitSearch] = createEvent<string>();

onSearch(async (query, meta) => {
  try {
    // Pass the signal directly to fetch
    const response = await fetch(`/api/search?q=${query}`, {
      signal: meta.signal, // This is the magic!
    });
    const data = await response.json();
    // Update UI...
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Search for previous query was cancelled.');
      return; // Safely ignore the aborted request
    }
  }
});

emitSearch('react'); // Starts a fetch
emitSearch('solid'); // Starts a new fetch and AUTOMATICALLY aborts the 'react' fetch
```
This simple but powerful feature eliminates a whole class of common bugs in modern UIs.

## The Framework-Agnostic Advantage

While its inspirations are clear, `@doeixd/events` is built to be used anywhere. It comes with:
*   **React Hooks (`@doeixd/react`)** for automatic subscription management.
*   **Svelte Store Compatibility** out-of-the-box.
*   A rich set of **DOM Utilities** for vanilla JS/TS projects.

The key trade-off for this flexibility remains: you are responsible for **manual memory management**. Outside of an integrated environment like `@doeixd/react`, you must call the `unsubscribe` function to prevent memory leaks.

## Conclusion

`@doeixd/events` has evolved. It’s no longer just a clever combination of two great ideas. It's a mature, feature-rich toolkit for building robust, event-driven applications. It gives you:

*   The **declarative, state-from-events logic** of `solid-events`.
*   The **composable attachment engine** of `@remix-run/events`.
*   The **transformative power of RxJS-style operators**.
*   The **safety of automatic async cancellation**.

If you're looking to bring more predictability, power, and joy to your event and state management, it’s time to add this library to your toolbelt.

**Check out `@doeixd/events` on [GitHub](https://github.com/doeixd/events) and [npm](https://www.npmjs.com/package/@doeixd/events).**