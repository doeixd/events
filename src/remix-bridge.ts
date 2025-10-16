/**
 * remix-bridge.ts
 *
 * Bridges your type-safe event/subject system with Remix-style EventDescriptors.
 * Integrates:
 *   - Handler<T> / Emitter<T> <-> EventDescriptor<T>
 *   - Subject<T> <-> EventDescriptor<T>
 *   - DOM events via dom.ts helpers
 *   - AbortSignal-based cleanup
 */

import type {
  EventDescriptor,
  EventHandler,
  EventWithTargets,
  InteractionDescriptor
} from './events-remix-types.ts';
/**
 * Remix Bridge Module
 *
 * Provides utilities to integrate the event system with Remix-style event handling.
 * Allows converting between Handler/Emitter/Subject and Remix EventDescriptors.
 *
 * @example
 * import { toEventDescriptor, subjectToEventDescriptor } from './remix-bridge';
 *
 * const [handler, emit] = createEvent<string>();
 * const descriptor = toEventDescriptor(handler, 'custom-event');
 */

import { Handler, Subject, Emitter, subjectToEventDescriptor } from './main.js';
import { dom } from './dom';

/* -------------------------------------------------------------------------- */
/*                               Conversion Helpers                             */
/* -------------------------------------------------------------------------- */




/* -------------------------------------------------------------------------- */
/*                           Interaction Factory Bridge                        */
/* -------------------------------------------------------------------------- */

/**
 * Convert a Handler<T> into an InteractionDescriptor factory.
 */
export /**
 * Converts a Handler into a Remix InteractionDescriptor factory.
 * Useful for advanced custom interactions in Remix events().
 * @param handler The handler to convert
 * @returns A factory function for creating interactions
 */
function bridgeInteractionFactory<T>(
  handler: Handler<T>
): InteractionDescriptor['factory'] {
  return ({ dispatch }) => {
    const unsub = handler((value) => {
      // @ts-ignore
      dispatch({ detail: value });
    });
    return unsub;
  };
}

/* -------------------------------------------------------------------------- */
/*                           DOM Integration Helpers                           */
/* -------------------------------------------------------------------------- */

/**
 * Convert a DOM event into a type-safe Handler<T>.
 */
export /**
 * Creates a Handler from a DOM event on an element.
 * Automatically integrates AbortSignal support and cleanup.
 * @param el The DOM element to attach the event to
 * @param eventName The event name (e.g., 'click', 'input')
 * @param opts Options for event listener (signal, capture, passive)
 * @returns A Handler for the DOM event
 */
function fromDomHandler<E extends Element, K extends keyof HTMLElementEventMap>(
  el: E,
  eventName: K,
  opts?: { signal?: AbortSignal; capture?: boolean; passive?: boolean }
): Handler<HTMLElementEventMap[K]> {
  return (dom as any)[eventName](el, opts);
}



/* -------------------------------------------------------------------------- */
/*                          Bidirectional DOM Bridge                           */
/* -------------------------------------------------------------------------- */

/**
 * Wire a Subject<T> to a DOM property or event.
 * Two-way binding: event updates subject, subject updates element.
 */
export /**
 * Bidirectionally binds a Subject to a DOM element property or event.
 * Updates flow both ways: event/subject changes update each other.
 * @param subject The subject to bind
 * @param el The DOM element
 * @param propOrEvent Property name or event name
 * @param opts Options for binding (signal, fromEvent mode)
 * @returns EventDescriptor for use in Remix events()
 */
function bindSubjectToDom<E extends Element, K extends keyof E>(
  subject: Subject<any>,
  el: E,
  propOrEvent: K | keyof HTMLElementEventMap,
  opts?: { signal?: AbortSignal; fromEvent?: boolean }
): EventDescriptor {
  if (opts?.fromEvent) {
    // Event -> Subject
    return subjectToEventDescriptor(subject, propOrEvent as string, opts.signal);
  } else {
    // Subject -> property
    return {
      type: propOrEvent as string,
      handler: (() => {
        const unsub = subject.subscribe((val: any) => {
          try {
            (el as any)[propOrEvent] = val;
          } catch (err) {
            console.error('Failed to set DOM property', err);
          }
        });
        if (opts?.signal) {
          if (opts.signal.aborted) unsub();
          else opts.signal.addEventListener('abort', unsub, { once: true });
        }
        return unsub;
      }) as EventHandler
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                                Emitter Bridge                               */
/* -------------------------------------------------------------------------- */

/**
 * Convert an Emitter<T> to a Remix EventDescriptor.
 */
export /**
 * Converts an Emitter into a Remix EventDescriptor.
 * Allows using emitters directly in Remix event systems.
 * @param emitter The emitter to convert
 * @param type The event type string
 * @param signal Optional AbortSignal for cleanup
 * @returns EventDescriptor that triggers the emitter
 */
function emitterToEventDescriptor<T>(
emitter: Emitter<T>,
type: string,
_signal?: AbortSignal
): EventDescriptor {
  return {
  type,
  handler: ((ev: EventWithTargets<T>, _evtSignal: AbortSignal) => {
  // @ts-ignore
    emitter(ev.detail as T);
    }) as unknown as EventHandler
  };
}


