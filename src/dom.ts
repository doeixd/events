/**
 * DOM Utilities Module
 *
 * Provides type-safe utilities for working with DOM events and reactive subjects.
 * Includes event handlers, shortcuts, property bindings, and multi-element operations.
 *
 * @example
 * import { fromDomEvent, dom, subjectProperty } from './dom';
 *
 * // Attach a click handler
 * const clickHandler = dom.click(button, { signal: controller.signal });
 * clickHandler(() => console.log('Clicked!'));
 *
 * // Create a reactive subject for an input's value
 * const inputValue = subjectProperty(inputElement, 'value');
 */

import { HaltSymbol, Handler, Subject, Unsubscribe } from './main';

/* -------------------------------------------------------------------------- */
/*                                Base DOM Helpers                             */
/* -------------------------------------------------------------------------- */

/**
 * Type-safe DOM event handler creator.
 * Automatically integrates AbortSignal and cleans up.
 */
export function fromDomEvent<
  E extends Element,
  K extends keyof HTMLElementEventMap
>(
  el: E,
  eventName: K,
  options?: { signal?: AbortSignal; capture?: boolean; passive?: boolean }
): Handler<HTMLElementEventMap[K]> {
  return ((cb) => {
    const listener = (ev: Event) => {
      try {
        const result = cb(ev as any);
        if (result instanceof Promise) result.catch(console.error);
      } catch (err) {
        if (err === HaltSymbol) return;
        throw err;
      }
    };

    el.addEventListener(eventName as string, listener as EventListener, options as any);

    const unsub = () => el.removeEventListener(eventName as string, listener as EventListener, options as any);

    if (options?.signal) {
      if (options.signal.aborted) unsub();
      else options.signal.addEventListener('abort', unsub, { once: true });
    }

    return unsub;
  }) as Handler<any>;
}

/* -------------------------------------------------------------------------- */
/*                          DOM Event Shortcuts                                */
/* -------------------------------------------------------------------------- */

/**
 * Pre-built event handler shortcuts for common DOM events.
 * Each returns a Handler for the specific event type with proper typing.
 * @example
 * const clickHandler = dom.click(buttonElement);
 * clickHandler(() => console.log('Button clicked!'));
 */
export const dom = {
  click: <E extends Element>(el: E, options?: { signal?: AbortSignal }) =>
    fromDomEvent(el, 'click', options),

  dblclick: <E extends Element>(el: E, options?: { signal?: AbortSignal }) =>
    fromDomEvent(el, 'dblclick', options),

  input: <E extends HTMLInputElement | HTMLTextAreaElement>(el: E, options?: { signal?: AbortSignal }) =>
    fromDomEvent(el, 'input', options),

  change: <E extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    el: E,
    options?: { signal?: AbortSignal }
  ) => fromDomEvent(el, 'change', options),

  submit: <E extends HTMLFormElement>(el: E, options?: { signal?: AbortSignal }) =>
    fromDomEvent(el, 'submit', options),

  keydown: <E extends Element>(el: E, options?: { signal?: AbortSignal }) =>
    fromDomEvent(el, 'keydown', options),

  keyup: <E extends Element>(el: E, options?: { signal?: AbortSignal }) =>
    fromDomEvent(el, 'keyup', options),

  focus: <E extends Element>(el: E, options?: { signal?: AbortSignal }) =>
    fromDomEvent(el, 'focus', options),

  blur: <E extends Element>(el: E, options?: { signal?: AbortSignal }) =>
    fromDomEvent(el, 'blur', options),

  mousemove: <E extends Element>(el: E, options?: { signal?: AbortSignal }) =>
    fromDomEvent(el, 'mousemove', options),

  mousedown: <E extends Element>(el: E, options?: { signal?: AbortSignal }) =>
    fromDomEvent(el, 'mousedown', options),

  mouseup: <E extends Element>(el: E, options?: { signal?: AbortSignal }) =>
    fromDomEvent(el, 'mouseup', options),

  wheel: <E extends Element>(el: E, options?: { signal?: AbortSignal }) =>
    fromDomEvent(el, 'wheel', options),

  touchstart: <E extends Element>(el: E, options?: { signal?: AbortSignal }) =>
    fromDomEvent(el, 'touchstart', options),

  touchend: <E extends Element>(el: E, options?: { signal?: AbortSignal }) =>
    fromDomEvent(el, 'touchend', options),

  touchmove: <E extends Element>(el: E, options?: { signal?: AbortSignal }) =>
    fromDomEvent(el, 'touchmove', options),
};

/* -------------------------------------------------------------------------- */
/*                       Reactive Property Subjects                            */
/* -------------------------------------------------------------------------- */

/**
 * Creates a reactive Subject bound to a DOM element property.
 * Automatically updates on specified DOM event.
 */
export function subjectProperty<
  T extends Element,
  K extends keyof T
>(el: T, prop: K, eventName: keyof HTMLElementEventMap = 'input'): Subject<T[K]> {
  let current: T[K] = el[prop];
  const subscribers: Set<(value: T[K]) => void> = new Set();
  const controller = new AbortController();

  const listener = fromDomEvent(el, eventName as any, { signal: controller.signal });
  listener(() => {
    current = el[prop];
    subscribers.forEach((cb) => cb(current));
  });

  const subject: Subject<T[K]> = Object.assign(
    () => current,
    {
      subscribe: (cb: (value: T[K]) => void) => {
        subscribers.add(cb);
        return () => subscribers.delete(cb);
      },
      dispose: () => {
        controller.abort();
        subscribers.clear();
      },
      _notifyImmediate: (value: T[K]) => {
        subscribers.forEach(cb => cb(value));
      },
    }
  );

  return subject;
}

/**
 * Converts a DOM event into a reactive Subject.
 */
export function subjectFromEvent<
  E extends Element,
  K extends keyof HTMLElementEventMap
>(el: E, eventName: K): Subject<HTMLElementEventMap[K]> {
  let current: HTMLElementEventMap[K] | undefined;
  const subscribers: Set<(value: HTMLElementEventMap[K]) => void> = new Set();
  const controller = new AbortController();

  const listener = fromDomEvent(el, eventName as any, { signal: controller.signal });
  listener((ev) => {
    current = ev;
    subscribers.forEach((cb) => cb(current!));
  });

  const subject: Subject<HTMLElementEventMap[K]> = Object.assign(
    () => current as HTMLElementEventMap[K],
    {
      subscribe: (cb: (value: HTMLElementEventMap[K]) => void) => {
        subscribers.add(cb);
        return () => subscribers.delete(cb);
      },
      dispose: () => {
        controller.abort();
        subscribers.clear();
      },
      _notifyImmediate: (value: HTMLElementEventMap[K]) => {
        subscribers.forEach(cb => cb(value));
      },
    }
  );

  return subject;
}

/* -------------------------------------------------------------------------- */
/*                    Multi-element / batch helpers                           */
/* -------------------------------------------------------------------------- */

/**
 * Attach multiple handlers to multiple elements.
 * Returns a combined unsubscribe.
 */
export function on<E extends Element>(
  elements: E[] | NodeListOf<E>,
  event: keyof HTMLElementEventMap,
  handler: (ev: HTMLElementEventMap[typeof event]) => void,
  options?: { signal?: AbortSignal }
): Unsubscribe {
  const unsubs: Unsubscribe[] = [];
  for (const el of Array.from(elements)) {
    const h = fromDomEvent(el, event, options)(handler);
    unsubs.push(h as Unsubscribe);
  }
  return () => unsubs.forEach((u) => u());
}


