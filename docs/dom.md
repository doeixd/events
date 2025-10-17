# DOM Utilities: Reactive Event Handling for the Web

The DOM utilities in `@doeixd/events` provide a comprehensive, type-safe toolkit for creating reactive and declarative interactions with the DOM. This module bridges the gap between raw DOM events and reactive programming, offering everything from simple event handler shortcuts to advanced observers and focus management.

## Core Philosophy

The DOM module treats DOM events as reactive streams that can be transformed, combined, and observed. Every utility integrates seamlessly with the core `@doeixd/events` primitives like `Handler`, `Subject`, and event chaining, enabling you to build complex UI interactions with declarative clarity.

## The Handler Chain: DOM Events as Reactive Streams

At the heart of the DOM utilities is the concept of treating DOM events as chainable, transformable streams:

```typescript
import { dom, halt } from '@doeixd/events';

// Raw click events
const onClick = dom.click(buttonElement);

// Chain 1: Filter out clicks on disabled buttons
const onValidClick = onClick(event => {
  if (buttonElement.disabled) return halt();
  return event;
});

// Chain 2: Transform to coordinates
const onClickCoords = onValidClick(event => ({
  x: event.clientX,
  y: event.clientY
}));

// Subscribe to the final transformed stream
onClickCoords(coords => {
  console.log('Valid click at:', coords);
});
```

This pattern enables you to build sophisticated event logic that's both readable and maintainable.

---

## API Reference

### `fromDomEvent<Target, EventName>(target, eventName, options?)`

The foundational function for all DOM event utilities. Creates a type-safe, chainable `Handler` from any DOM event.

**Parameters:**
- `target: EventTarget` - The element/window/document to listen on
- `eventName: string` - The event name (e.g., 'click', 'input', 'custom-event')
- `options?: AddEventListenerOptions` - Standard listener options

**Returns:** `Handler<Event>` - A chainable event handler

**Options:**
- `signal?: AbortSignal` - Automatic cleanup when aborted
- `capture?: boolean` - Use capture phase (default: false)
- `passive?: boolean` - Passive listener for performance (default: false)
- `once?: boolean` - Remove listener after first event (default: false)

**Examples:**

```typescript
// Basic usage
const onResize = fromDomEvent(window, 'resize');
onResize(() => console.log('Window resized'));

// With options for performance
const onScroll = fromDomEvent(window, 'scroll', { passive: true });
onScroll(() => updateScrollPosition());

// Custom events
const onCustom = fromDomEvent(window, 'my-custom-event');
onCustom((event: CustomEvent) => console.log(event.detail));

// Automatic cleanup with AbortSignal
const controller = new AbortController();
const onClick = fromDomEvent(button, 'click', { signal: controller.signal });
onClick(() => console.log('Clicked'));
// Later: controller.abort(); // Removes listener
```

**Type Safety:** The returned `Handler` is fully typed based on the event name, providing IntelliSense and compile-time safety.

---

### `dom` - Event Type Shortcuts

A comprehensive collection of pre-built shortcuts for common DOM events. All shortcuts support the same `AddEventListenerOptions` as `fromDomEvent`.

**Mouse Events:**
```typescript
dom.click(element, options?)
dom.dblclick(element, options?)
dom.mousedown(element, options?)
dom.mouseup(element, options?)
dom.mousemove(element, options?)
dom.mouseover(element, options?)
dom.mouseout(element, options?)
dom.mouseenter(element, options?)
dom.mouseleave(element, options?)
dom.contextmenu(element, options?)
```

**Keyboard Events:**
```typescript
dom.keydown(element, options?)
dom.keyup(element, options?)
dom.keypress(element, options?)
```

**Form & Input Events:**
```typescript
dom.input(element, options?)      // <input>, <textarea>
dom.change(element, options?)     // <input>, <select>, <textarea>
dom.submit(element, options?)     // <form>
dom.reset(element, options?)      // <form>
```

**Focus Events:**
```typescript
dom.focus(element, options?)
dom.blur(element, options?)
dom.focusin(element, options?)
dom.focusout(element, options?)
```

**Touch Events:**
```typescript
dom.touchstart(element, options?)
dom.touchend(element, options?)
dom.touchmove(element, options?)
dom.touchcancel(element, options?)
```

**Pointer Events:**
```typescript
dom.pointerdown(element, options?)
dom.pointerup(element, options?)
dom.pointermove(element, options?)
dom.pointerenter(element, options?)
dom.pointerleave(element, options?)
```

**Scroll & Wheel:**
```typescript
dom.scroll(element, options?)
dom.wheel(element, options?)
```

**Examples:**

```typescript
// Form handling with validation
const onSubmit = dom.submit(formElement);
const onValidSubmit = onSubmit(event => {
  event.preventDefault();
  if (isFormValid()) {
    submitForm();
  } else {
    return halt(); // Stop processing
  }
});

// Keyboard shortcuts
const onKeyDown = dom.keydown(window);
const onShortcut = onKeyDown(event => {
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault();
    saveDocument();
  }
});

// Touch gestures (with passive for performance)
const onTouchMove = dom.touchmove(element, { passive: true });
onTouchMove(event => handleTouch(event));
```

---

### Reactive Subjects from DOM

### `subjectProperty<T, K>(element, property, eventName?)`

Creates a reactive `Subject` that automatically syncs with a DOM element's property. Perfect for two-way data binding.

**Parameters:**
- `element: T` - The DOM element to observe
- `property: K` - The property to bind to (e.g., 'value', 'checked', 'scrollTop')
- `eventName?: string` - Event that triggers updates (default: 'input')

**Returns:** `Subject<T[K]>` - Reactive subject bound to the property

**Examples:**

```typescript
// Text input binding
const inputValue = subjectProperty(inputElement, 'value');
inputValue.subscribe(value => console.log('Input changed:', value));

// Checkbox state
const isChecked = subjectProperty(checkbox, 'checked', 'change');
isChecked.subscribe(checked => console.log('Checked:', checked));

// Scroll position
const scrollTop = subjectProperty(scrollableDiv, 'scrollTop', 'scroll');
scrollTop.subscribe(position => updateScrollIndicator(position));

// Two-way binding: Update DOM when subject changes
inputValue('Hello World'); // Updates inputElement.value
```

**Advanced Example - Reactive Form Validation:**

```typescript
function createReactiveForm() {
  const nameInput = document.querySelector('#name') as HTMLInputElement;
  const emailInput = document.querySelector('#email') as HTMLInputElement;

  // Reactive subjects
  const name = subjectProperty(nameInput, 'value');
  const email = subjectProperty(emailInput, 'value');

  // Derived validation state
  const isValid = createSubject(false);
  combineLatest(name, email).subscribe(([n, e]) => {
    isValid(n.length > 0 && /^[^@]+@[^@]+\.[^@]+$/.test(e));
  });

  // Reactive error messages
  const errors = createSubject({ name: '', email: '' });
  name.subscribe(value => {
    errors({ ...errors(), name: value ? '' : 'Name is required' });
  });
  email.subscribe(value => {
    const isValidEmail = /^[^@]+@[^@]+\.[^@]+$/.test(value);
    errors({ ...errors(), email: isValidEmail ? '' : 'Invalid email' });
  });

  return { name, email, isValid, errors };
}
```

---

### `subjectFromEvent<T, K>(element, eventName)`

Creates a `Subject` that emits the most recent DOM event object. Useful when you need to react to events while maintaining the event object.

**Parameters:**
- `element: T` - The DOM element to observe
- `eventName: K` - The event name to create a subject from

**Returns:** `Subject<HTMLElementEventMap[K]>` - Subject that emits event objects

**Examples:**

```typescript
// Track mouse position
const mouseMoves = subjectFromEvent(window, 'mousemove');
mouseMoves.subscribe(event => {
  console.log('Mouse at:', event.clientX, event.clientY);
});

// Handle keyboard events
const keyPresses = subjectFromEvent(document, 'keydown');
keyPresses.subscribe(event => {
  if (event.key === 'Escape') {
    closeModal();
  }
});
```

---

### Multi-Element Event Handling

### `on<T>(targets, events, handler, options?)`

Attaches a single handler to multiple elements or multiple event types. Returns a single unsubscribe function.

**Parameters:**
- `targets: T | T[] | NodeListOf<T>` - Elements to attach to
- `events: string | string[]` - Event name(s) to listen for
- `handler: (event: Event) => void` - The event handler function
- `options?: AddEventListenerOptions` - Listener options

**Returns:** `Unsubscribe` - Function to remove all listeners

**Examples:**

```typescript
// Multiple elements, single event
const buttons = document.querySelectorAll('.btn');
const unsub = on(buttons, 'click', (event) => {
  const button = event.target as HTMLButtonElement;
  console.log('Clicked:', button.dataset.action);
});

// Single element, multiple events
const input = document.querySelector('input');
const unsub = on(input, ['focus', 'blur'], (event) => {
  console.log('Input focus changed:', event.type);
});

// Mixed usage with options
const links = document.querySelectorAll('a');
const unsub = on(links, 'click', (event) => {
  event.preventDefault();
  navigateTo(event.target.href);
}, { passive: false });
```

**Advanced Example - Event Delegation:**

```typescript
// Delegate events from a container to child elements
const list = document.querySelector('#todo-list');
const onListClick = on(list, 'click', (event) => {
  const target = event.target as HTMLElement;

  if (target.matches('.delete-btn')) {
    deleteTodo(target.dataset.id);
  } else if (target.matches('.edit-btn')) {
    editTodo(target.dataset.id);
  } else if (target.matches('.todo-item')) {
    toggleTodo(target.dataset.id);
  }
});
```

---

### Observer Utilities

### `onIntersect(target, options?)`

Creates a `Handler` that fires when an element enters or leaves the viewport. A reactive wrapper around `IntersectionObserver`.

**Parameters:**
- `target: Element` - The element to observe
- `options?: IntersectionObserverInit` - Observer options

**Returns:** `Handler<IntersectionObserverEntry>`

**Options:**
- `root?: Element` - The element to use as the viewport (default: browser viewport)
- `rootMargin?: string` - Margin around the root (default: '0px')
- `threshold?: number | number[]` - Visibility threshold(s) (default: 0)

**Examples:**

```typescript
// Basic intersection detection
const image = document.querySelector('img');
const onVisible = onIntersect(image);
onVisible((entry) => {
  if (entry.isIntersecting) {
    loadHighResImage(entry.target as HTMLImageElement);
  }
});

// Lazy loading with margin
const cards = document.querySelectorAll('.card');
cards.forEach(card => {
  const onCardVisible = onIntersect(card, {
    rootMargin: '50px' // Start loading 50px before visible
  });
  onCardVisible((entry) => {
    if (entry.isIntersecting) {
      loadCardContent(entry.target);
    }
  });
});

// Multiple thresholds for progressive enhancement
const progressBar = document.querySelector('.progress');
const onProgressVisible = onIntersect(progressBar, {
  threshold: [0, 0.25, 0.5, 0.75, 1.0]
});
onProgressVisible((entry) => {
  updateProgressBar(entry.intersectionRatio);
});
```

---

### `onResize(target, options?)`

Creates a `Handler` that fires when an element's dimensions change. A reactive wrapper around `ResizeObserver`.

**Parameters:**
- `target: Element` - The element to observe
- `options?: ResizeObserverOptions` - Observer options

**Returns:** `Handler<ResizeObserverEntry>`

**Options:**
- `box?: 'content-box' | 'border-box'` - Which box model to observe

**Examples:**

```typescript
// Chart resizing
const chartContainer = document.querySelector('.chart');
const onChartResize = onResize(chartContainer);
onChartResize((entry) => {
  const { width, height } = entry.contentRect;
  chart.resize(width, height);
});

// Responsive layout adjustments
const mainContent = document.querySelector('main');
const onContentResize = onResize(mainContent);
onContentResize((entry) => {
  if (entry.contentRect.width < 768) {
    switchToMobileLayout();
  } else {
    switchToDesktopLayout();
  }
});

// Multiple resize observers
const elements = document.querySelectorAll('.resizable');
elements.forEach(el => {
  const onResize = onResize(el);
  onResize((entry) => {
    console.log(`${el.id} resized to:`, entry.contentRect);
  });
});
```

---

### Focus Management

### `trapFocus(container)`

Traps focus within a container element, preventing tab navigation from escaping. Essential for accessible modals and dialogs.

**Parameters:**
- `container: HTMLElement` - The container to trap focus within

**Returns:** `Unsubscribe` - Function to release the focus trap

**Examples:**

```typescript
// Modal focus trapping
function openModal(modalElement: HTMLElement) {
  modalElement.style.display = 'block';
  const releaseFocus = trapFocus(modalElement);

  // Store the release function for later
  modalElement._releaseFocus = releaseFocus;
}

function closeModal(modalElement: HTMLElement) {
  modalElement.style.display = 'none';
  modalElement._releaseFocus?.(); // Release focus trap
}

// Usage
const modal = document.querySelector('#my-modal') as HTMLElement;
document.querySelector('#open-modal')?.addEventListener('click', () => {
  openModal(modal);
});
```

**Advanced Example - Complete Modal Implementation:**

```typescript
class AccessibleModal {
  private modal: HTMLElement;
  private trigger: HTMLElement;
  private closeBtn: HTMLElement;
  private releaseFocus?: () => void;

  constructor(modalId: string, triggerId: string) {
    this.modal = document.getElementById(modalId)!;
    this.trigger = document.getElementById(triggerId)!;
    this.closeBtn = this.modal.querySelector('.close-btn') as HTMLElement;

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Open modal
    dom.click(this.trigger)(() => this.open());

    // Close modal (button)
    dom.click(this.closeBtn)(() => this.close());

    // Close modal (escape key)
    dom.keydown(this.modal)((event) => {
      if (event.key === 'Escape') {
        this.close();
      }
    });

    // Close modal (backdrop click)
    dom.click(this.modal)((event) => {
      if (event.target === this.modal) {
        this.close();
      }
    });
  }

  open() {
    this.modal.style.display = 'block';
    this.releaseFocus = trapFocus(this.modal);
    // Focus first focusable element
    const firstFocusable = this.modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;
    firstFocusable?.focus();
  }

  close() {
    this.modal.style.display = 'none';
    this.releaseFocus?.();
    // Return focus to trigger
    this.trigger.focus();
  }
}
```

---

## Advanced Patterns and Examples

### Reactive Form with Validation

```typescript
import { createSubject, combineLatest, dom, subjectProperty } from '@doeixd/events';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email: string;
  password: string;
  confirmPassword: string;
}

function createReactiveForm(formElement: HTMLFormElement) {
  // Get form inputs
  const emailInput = formElement.querySelector('#email') as HTMLInputElement;
  const passwordInput = formElement.querySelector('#password') as HTMLInputElement;
  const confirmInput = formElement.querySelector('#confirm') as HTMLInputElement;

  // Create reactive subjects
  const email = subjectProperty(emailInput, 'value');
  const password = subjectProperty(passwordInput, 'value');
  const confirmPassword = subjectProperty(confirmInput, 'value');

  // Validation state
  const errors = createSubject<FormErrors>({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const isValid = createSubject(false);

  // Email validation
  email.subscribe(value => {
    const emailErrors = [];
    if (!value) emailErrors.push('Email is required');
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      emailErrors.push('Invalid email format');
    }

    errors({
      ...errors(),
      email: emailErrors.join(', ')
    });
  });

  // Password validation
  password.subscribe(value => {
    const passwordErrors = [];
    if (!value) passwordErrors.push('Password is required');
    if (value && value.length < 8) passwordErrors.push('Must be at least 8 characters');

    errors({
      ...errors(),
      password: passwordErrors.join(', ')
    });
  });

  // Confirm password validation
  combineLatest(password, confirmPassword).subscribe(([pwd, confirm]) => {
    const confirmErrors = [];
    if (confirm && pwd !== confirm) {
      confirmErrors.push('Passwords do not match');
    }

    errors({
      ...errors(),
      confirmPassword: confirmErrors.join(', ')
    });
  });

  // Overall form validity
  combineLatest(email, password, confirmPassword, errors).subscribe(
    ([emailVal, pwdVal, confirmVal, errorState]) => {
      const hasErrors = Object.values(errorState).some(error => error.length > 0);
      const hasValues = emailVal && pwdVal && confirmVal;
      isValid(hasValues && !hasErrors);
    }
  );

  // Form submission
  const onSubmit = dom.submit(formElement);
  onSubmit(event => {
    event.preventDefault();
    if (isValid()) {
      const formData: FormData = {
        email: email(),
        password: password(),
        confirmPassword: confirmPassword()
      };
      submitForm(formData);
    } else {
      // Focus first invalid field
      if (errors().email) emailInput.focus();
      else if (errors().password) passwordInput.focus();
      else if (errors().confirmPassword) confirmInput.focus();
    }
  });

  return {
    email,
    password,
    confirmPassword,
    errors,
    isValid,
    submit: () => formElement.requestSubmit()
  };
}
```

### Infinite Scroll Component

```typescript
import { onIntersect, createSubject } from '@doeixd/events';

function createInfiniteScroll(
  container: HTMLElement,
  loadMore: (page: number) => Promise<void>
) {
  const sentinel = document.createElement('div');
  sentinel.style.height = '10px';
  container.appendChild(sentinel);

  const currentPage = createSubject(1);
  const isLoading = createSubject(false);
  const hasMore = createSubject(true);

  // Intersection observer for the sentinel
  const onSentinelVisible = onIntersect(sentinel, {
    root: container,
    rootMargin: '100px' // Load more when sentinel is 100px from viewport
  });

  onSentinelVisible(async (entry) => {
    if (entry.isIntersecting && !isLoading() && hasMore()) {
      isLoading(true);
      try {
        await loadMore(currentPage());
        currentPage(currentPage() + 1);
      } catch (error) {
        console.error('Failed to load more items:', error);
        hasMore(false);
      } finally {
        isLoading(false);
      }
    }
  });

  return {
    currentPage: currentPage.subscribe,
    isLoading: isLoading.subscribe,
    stop: () => hasMore(false)
  };
}
```

### Drag and Drop Handler

```typescript
import { dom, createSubject, halt } from '@doeixd/events';

function createDragHandler(element: HTMLElement) {
  const isDragging = createSubject(false);
  const dragOffset = createSubject({ x: 0, y: 0 });
  const dragStart = createSubject({ x: 0, y: 0 });

  // Mouse down - start drag
  const onMouseDown = dom.mousedown(element);
  const onDragStart = onMouseDown(event => {
    if (event.button !== 0) return halt(); // Only left mouse button

    event.preventDefault();
    isDragging(true);
    dragStart({ x: event.clientX, y: event.clientY });

    const startRect = element.getBoundingClientRect();
    dragOffset({
      x: event.clientX - startRect.left,
      y: event.clientY - startRect.top
    });

    return event;
  });

  // Mouse move - drag
  const onMouseMove = dom.mousemove(window);
  const onDrag = onMouseMove(event => {
    if (!isDragging()) return halt();

    const newX = event.clientX - dragOffset().x;
    const newY = event.clientY - dragOffset().y;

    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;

    return { x: newX, y: newY };
  });

  // Mouse up - end drag
  const onMouseUp = dom.mouseup(window);
  const onDragEnd = onMouseUp(() => {
    if (!isDragging()) return halt();
    isDragging(false);
  });

  return {
    isDragging: isDragging.subscribe,
    dragStart: dragStart.subscribe,
    onDragStart,
    onDrag,
    onDragEnd
  };
}
```

---

## Gotchas and Best Practices

### Memory Management

**Always clean up listeners:** DOM event listeners can cause memory leaks if not properly removed. Use `AbortSignal` or manual cleanup:

```typescript
// ✅ Good: Automatic cleanup
const controller = new AbortController();
const handler = dom.click(button, { signal: controller.signal });
handler(() => console.log('Clicked'));
// Later: controller.abort();

// ✅ Good: Manual cleanup
const unsubscribe = dom.click(button)(() => console.log('Clicked'));
// Later: unsubscribe();

// ❌ Bad: No cleanup
dom.click(button)(() => console.log('Clicked')); // Potential memory leak
```

### Event Propagation

**Use `halt()` for conditional stopping:** In event chains, use `halt()` instead of `event.stopPropagation()`:

```typescript
// ✅ Good: Declarative halting
const onValidClick = dom.click(button)(event => {
  if (!isValidClick(event)) return halt();
  return event;
});

// ❌ Bad: Imperative stopping
dom.click(button)(event => {
  if (!isValidClick(event)) {
    event.stopPropagation();
    return;
  }
  // Continue processing
});
```

### Performance Considerations

**Use passive listeners for scroll/touch events:**

```typescript
// ✅ Good: Passive scroll listener
const onScroll = dom.scroll(window, { passive: true });
onScroll(() => updateScrollPosition());

// ❌ Bad: Blocking scroll
const onScroll = dom.scroll(window); // Can block scrolling
```

**Debounce/throttle high-frequency events:**

```typescript
import { debounce } from '@doeixd/events/operators';

// ✅ Good: Debounced resize handler
const onResize = debounce(100)(dom.resize(window));
onResize(() => updateLayout());

// ❌ Bad: Fires on every resize
dom.resize(window)(() => updateLayout()); // Can fire 60+ times/second
```

### Browser Compatibility

**Check for observer support:**

```typescript
// Feature detection for observers
if ('IntersectionObserver' in window) {
  const onVisible = onIntersect(element);
  // Use intersection observer
} else {
  // Fallback for older browsers
  const onScroll = dom.scroll(window);
  // Implement scroll-based visibility detection
}
```

### Focus Management

**Always restore focus:** When closing modals or hiding elements, restore focus to a logical element:

```typescript
function closeModal(modal: HTMLElement, trigger: HTMLElement) {
  modal.style.display = 'none';
  releaseFocus?.(); // Release focus trap
  trigger.focus(); // ✅ Restore focus to trigger
}
```

**Test keyboard navigation:** Ensure all interactive elements are keyboard accessible and focus flows logically.

### Type Safety

**Leverage TypeScript for event types:**

```typescript
// ✅ Good: Type-safe event handling
const onKeyDown = dom.keydown(input);
onKeyDown((event) => {
  // event is typed as KeyboardEvent
  if (event.key === 'Enter') {
    submitForm();
  }
});

// ✅ Good: Custom event types
const onCustom = fromDomEvent(window, 'my-event' as any);
onCustom((event: CustomEvent<MyData>) => {
  console.log(event.detail); // Fully typed
});
```

### Testing

**Use DOM testing utilities:** When testing DOM utilities, ensure proper cleanup:

```typescript
describe('DOM utilities', () => {
  let element: HTMLButtonElement;

  beforeEach(() => {
    element = document.createElement('button');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('should handle clicks', () => {
    const onClick = dom.click(element);
    let clicked = false;
    onClick(() => clicked = true);

    element.click();
    expect(clicked).toBe(true);
  });
});
```

---

## Integration with Framework Integrations

The DOM utilities work seamlessly with `@doeixd/events` framework integrations:

### React Integration

```typescript
import { useEvent, useSubject } from '@doeixd/react';
import { dom, subjectProperty } from '@doeixd/events';

function ReactiveInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [onInput, emitInput] = createEvent<string>();

  // Reactive subject from DOM
  const value = subjectProperty(inputRef.current!, 'value');

  // Connect to React state
  useEvent(onInput, (newValue) => {
    // Handle input changes
  });

  return (
    <input
      ref={inputRef}
      onInput={(e) => emitInput(e.target.value)}
    />
  );
}
```

### Vue Integration

```typescript
<template>
  <input ref="inputRef" @input="handleInput" />
</template>

<script setup>
import { subjectProperty } from '@doeixd/events';

const inputRef = ref();
const value = subjectProperty(inputRef, 'value');

function handleInput(event) {
  // value() is automatically updated
  console.log('Current value:', value());
}
</script>
```

### Svelte Integration

```typescript
<script>
  import { subjectProperty } from '@doeixd/events';

  let inputElement;
  const value = subjectProperty(inputElement, 'value');

  // Svelte auto-subscription works with subjects
  $: console.log('Value changed:', $value);
</script>

<input bind:this={inputElement} />
```

---

## Summary

The DOM utilities in `@doeixd/events` provide a complete toolkit for reactive web development:

- **Type-safe event handling** with full TypeScript support
- **Reactive subjects** for two-way data binding
- **Observer utilities** for intersection and resize detection
- **Focus management** for accessibility
- **Performance optimizations** with passive listeners and debouncing
- **Framework integration** across React, Vue, Svelte, and vanilla JS

By treating DOM events as reactive streams, you can build complex UI interactions with the same declarative clarity used for application state management.