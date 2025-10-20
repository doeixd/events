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
import type { EventHandler } from './events-remix-types';

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
 * A collection of pre-built, type-safe shortcuts for creating `EventDescriptor` objects
 * from common DOM events on an `Element`.
 *
 * @example
 * // Now returns EventDescriptor objects instead of Handler streams
 * const descriptors = [
 *   dom.click(() => console.log('Button clicked!')),
 *   dom.input(event => console.log('Value:', event.target.value))
 * ];
 */
export const dom = {
  // Mouse Events
  click: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'click', handler, options }),
  dblclick: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'dblclick', handler, options }),
  mousedown: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'mousedown', handler, options }),
  mouseup: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'mouseup', handler, options }),
  mousemove: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'mousemove', handler, options }),
  mouseover: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'mouseover', handler, options }),
  mouseout: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'mouseout', handler, options }),
  mouseenter: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'mouseenter', handler, options }),
  mouseleave: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'mouseleave', handler, options }),
  contextmenu: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'contextmenu', handler, options }),

  // Keyboard Events
  keydown: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'keydown', handler, options }),
  keyup: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'keyup', handler, options }),
  keypress: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'keypress', handler, options }),

  // Form & Input Events
  input: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'input', handler, options }),
  change: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'change', handler, options }),
  submit: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'submit', handler, options }),
  reset: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'reset', handler, options }),

  // Focus Events
  focus: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'focus', handler, options }),
  blur: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'blur', handler, options }),
  focusin: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'focusin', handler, options }),
  focusout: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'focusout', handler, options }),

  // Touch Events
  touchstart: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'touchstart', handler, options }),
  touchend: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'touchend', handler, options }),
  touchmove: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'touchmove', handler, options }),
  touchcancel: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'touchcancel', handler, options }),

  // Pointer Events
  pointerdown: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'pointerdown', handler, options }),
  pointerup: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'pointerup', handler, options }),
  pointermove: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'pointermove', handler, options }),
  pointerenter: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'pointerenter', handler, options }),
  pointerleave: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'pointerleave', handler, options }),

  // Scroll & Wheel
  scroll: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'scroll', handler, options }),
  wheel: (handler: EventHandler, options?: AddEventListenerOptions) => ({ type: 'wheel', handler, options }),
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


