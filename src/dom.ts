/**
 * @module dom
 * A comprehensive, type-safe toolkit for creating reactive and declarative
 * interactions with the DOM.
 *
 * This module provides a rich set of utilities, from simple event handler
 * shortcuts to advanced observers and focus management, all designed to
 * integrate seamlessly with the `@doeixd/events` core primitives.
 */

import { HaltSymbol, Handler, Subject, Unsubscribe, createSubject } from './main';
import { createSubscriptionStack } from './stack';

/* -------------------------------------------------------------------------- */
/*                                Base Helpers                                */
/* -------------------------------------------------------------------------- */

/**
 * Creates a type-safe, chainable `Handler` from a DOM event on a given target.
 *
 * This is the foundational function for all DOM event utilities in this module.
 * It automatically handles listener cleanup and integrates with `AbortSignal` for
 * declarative, lifecycle-managed event handling.
 *
 * @param target The `EventTarget` to listen on (e.g., an Element, `window`, or `document`).
 * @param eventName The name of the event.
 * @param options Standard `addEventListener` options, including `signal` for automatic cleanup.
 * @returns A `Handler` stream that emits events of the correct type.
 *
 * @example
 * const onWindowResize = fromDomEvent(window, 'resize');
 * onWindowResize(() => {
 *   console.log('Window was resized!');
 * });
 */
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




/* -------------------------------------------------------------------------- */
/*                          DOM Event Shortcuts (`dom`)                       */
/* -------------------------------------------------------------------------- */

/**
 * A collection of pre-built, type-safe shortcuts for creating `Handler` streams
 * from common DOM events on an `Element`.
 *
 * @example
 * const onButtonClick = dom.click(buttonElement);
 * onButtonClick(() => console.log('Button clicked!'));
 *
 * const onTextInput = dom.input(inputElement);
 * onTextInput(event => console.log('Value:', event.target.value));
 */
export const dom = {
  // Mouse Events
  click: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'click', options),
  dblclick: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'dblclick', options),
  mousedown: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'mousedown', options),
  mouseup: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'mouseup', options),
  mousemove: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'mousemove', options),
  mouseover: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'mouseover', options),
  mouseout: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'mouseout', options),
  mouseenter: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'mouseenter', options),
  mouseleave: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'mouseleave', options),
  contextmenu: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'contextmenu', options),

  // Keyboard Events
  keydown: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'keydown', options),
  keyup: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'keyup', options),
  keypress: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'keypress', options),

  // Form & Input Events
  input: <E extends HTMLElement>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'input', options),
  change: <E extends HTMLElement>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'change', options),
  submit: <E extends HTMLFormElement>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'submit', options),
  reset: <E extends HTMLFormElement>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'reset', options),

  // Focus Events
  focus: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'focus', options),
  blur: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'blur', options),
  focusin: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'focusin', options),
  focusout: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'focusout', options),

  // Touch Events
  touchstart: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'touchstart', options),
  touchend: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'touchend', options),
  touchmove: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'touchmove', options),
  touchcancel: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'touchcancel', options),

  // Pointer Events
  pointerdown: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'pointerdown', options),
  pointerup: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'pointerup', options),
  pointermove: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'pointermove', options),
  pointerenter: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'pointerenter', options),
  pointerleave: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'pointerleave', options),

  // Scroll & Wheel
  scroll: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'scroll', options),
  wheel: <E extends Element>(el: E, options?: AddEventListenerOptions) => fromDomEvent(el, 'wheel', options),
};


/* -------------------------------------------------------------------------- */
/*                   Reactive Subjects from DOM Properties                    */
/* -------------------------------------------------------------------------- */

/**
 * Creates a reactive `Subject` that is automatically updated with the value
 * of a DOM element's property whenever a specific event occurs.
 *
 * This is perfect for creating a reactive binding to an input's value,
 * a checkbox's checked state, or any other DOM property.
 *
 * @param el The DOM element to observe.
 * @param prop The property to track (e.g., 'value', 'checked', 'scrollTop').
 * @param eventName The event that triggers an update check (defaults to 'input').
 * @returns A `Subject` that holds the current value of the property.
 *
 * @example
 * const inputValue = subjectProperty(myInput, 'value');
 * inputValue.subscribe(value => console.log('Current value:', value));
 *
 * const isChecked = subjectProperty(myCheckbox, 'checked', 'change');
 * isChecked.subscribe(checked => console.log('Is checked:', checked));
 */
export function subjectProperty<
  T extends Element,
  K extends keyof T
>(el: T, prop: K, eventName: keyof HTMLElementEventMap = 'input'): Subject<T[K]> {
  // A core `Subject` to hold the state.
  const subject = createSubject(el[prop]) as Subject<T[K]>;

  // A controller to manage the lifecycle of the underlying listener.
  const controller = new AbortController();

  // Listen to the specified DOM event to update the subject.
  fromDomEvent(el, eventName as any, { signal: controller.signal })(() => {
    subject(el[prop]);
  });

  // Enhance the subject with a `dispose` method for manual cleanup.
  subject.dispose = () => {
    controller.abort();
    (subject as any)._subscribers?.clear(); // Internal cleanup
  };

  return subject;
}

/**
 * Converts a DOM event stream directly into a reactive `Subject`.
 * The subject will hold the most recent event object that was fired.
 *
 * @param el The DOM element to observe.
 * @param eventName The name of the event to create a subject from.
 * @returns A `Subject` that holds the last emitted event object.
 *
 * @example
 * const lastClickEvent = subjectFromEvent(button, 'click');
 * lastClickEvent.subscribe(clickEvent => {
 *   console.log('Last click was at:', clickEvent.clientX, clickEvent.clientY);
 * });
 */
export function subjectFromEvent<
  E extends Element,
  K extends keyof HTMLElementEventMap
>(el: E, eventName: K): Subject<HTMLElementEventMap[K]> {
  const subject = createSubject<HTMLElementEventMap[K]>() as Subject<HTMLElementEventMap[K]>;
  const controller = new AbortController();

  fromDomEvent(el, eventName, { signal: controller.signal })(ev => {
    subject(ev as HTMLElementEventMap[K]);
  });

  subject.dispose = () => controller.abort();
  return subject;
}


/* -------------------------------------------------------------------------- */
/*                     Advanced DOM Utilities & Observers                     */
/* -------------------------------------------------------------------------- */

/**
 * A flexible utility to attach a single handler to multiple elements or event types.
 * Returns a single `Unsubscribe` function that cleans up all attached listeners.
 *
 * @param targets An element, an array of elements, or a NodeListOf.
 * @param events A single event name or an array of event names.
 * @param handler The function to execute for the events.
 * @param options Standard `addEventListener` options.
 * @returns A single `Unsubscribe` function to remove all listeners.
 *
 * @example
 * // Attach one handler to multiple elements
 * const buttons = document.querySelectorAll('button');
 * const unsubButtons = on(buttons, 'click', () => console.log('A button was clicked'));
 *
 * // Attach one handler to multiple event types
 * const unsubFocus = on(inputElement, ['focus', 'blur'], e => console.log('Focus changed:', e.type));
 */
export function on<E extends Element>(
  targets: E | E[] | NodeListOf<E>,
  events: (keyof HTMLElementEventMap) | (keyof HTMLElementEventMap)[],
  handler: (ev: Event) => void,
  options?: AddEventListenerOptions
): Unsubscribe {
  const stack = createSubscriptionStack();
  const elements = Array.isArray(targets) || targets instanceof NodeList ? Array.from(targets) : [targets];
  const eventNames = Array.isArray(events) ? events : [events];

  for (const el of elements) {
    for (const eventName of eventNames) {
      const unsub = fromDomEvent(el, eventName as any, options)(handler);
      stack.defer(unsub);
    }
  }
  return () => stack.dispose();
}

/**
 * Creates a `Handler` that fires when an element enters or leaves the viewport.
 * This is a reactive wrapper around the `IntersectionObserver` API.
 *
 * @param target The element to observe.
 * @param options Standard `IntersectionObserver` options (root, rootMargin, threshold).
 * @returns A `Handler` that emits `IntersectionObserverEntry` objects.
 *
 * @example
 * const onImageVisible = onIntersect(imageElement, { threshold: 0.5 });
 * onImageVisible(entry => {
 *   if (entry.isIntersecting) {
 *     console.log('Image is at least 50% visible, time to lazy load!');
 *     // unsub(); // Optionally unsubscribe after first trigger
 *   }
 * });
 */
export function onIntersect(
  target: Element,
  options?: IntersectionObserverInit
): Handler<IntersectionObserverEntry> {
  return ((cb) => {
    const observer = new IntersectionObserver((entries) => {
      // An intersection can have multiple entries, though typically one for a single target.
      entries.forEach(entry => cb(entry));
    }, options);

    observer.observe(target);

    return () => observer.disconnect();
  }) as Handler<IntersectionObserverEntry>;
}

/**
 * Creates a `Handler` that fires when an element's dimensions change.
 * A reactive wrapper around the `ResizeObserver` API.
 *
 * @param target The element to observe.
 * @param options Standard `ResizeObserver` options.
 * @returns A `Handler` that emits `ResizeObserverEntry` objects.
 *
 * @example
 * const onChartResize = onResize(chartContainer);
 * onChartResize(entry => {
 *   const { width, height } = entry.contentRect;
 *   console.log(`Chart container resized to ${width}x${height}. Redrawing...`);
 * });
 */
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

/**
 * Traps focus within a container element, preventing the user from tabbing out.
 * Essential for building accessible modals and dialogs.
 * Returns an `Unsubscribe` function to release the focus trap.
 *
 * @param container The element to trap focus within.
 * @returns A `Cleanup` function that removes the focus trap.
 *
 * @example
 * const modal = document.getElementById('my-modal');
 * const releaseFocus = trapFocus(modal);
 *
 * // When the modal closes:
 * // releaseFocus();
 */
export function trapFocus(container: HTMLElement): Unsubscribe {
  const focusableElementsSelector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const focusableElements = Array.from(
    container.querySelectorAll<HTMLElement>(focusableElementsSelector)
  ).filter(el => el.offsetParent !== null); // Filter out hidden elements

  if (focusableElements.length === 0) return () => {};

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) { // Tabbing backwards
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else { // Tabbing forwards
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  };

  document.addEventListener('keydown', onKeyDown);

  // Focus the first element when the trap is activated
  firstElement.focus();

  return () => document.removeEventListener('keydown', onKeyDown);
}


