/**
 * @module remix-attacher
 *
 * The declarative event attachment system inspired by Remix Events.
 * Provides the central `events()` function that manages event lifecycles,
 * custom interactions, and a `preventDefault` middleware chain.
 */

import type {
  EventDescriptor,
  InteractionDescriptor,
  EventContainer,
  Cleanup,
} from './events-remix-types';

// Type guard to distinguish custom interactions from standard event descriptors.
function isInteractionDescriptor(
  descriptor: EventDescriptor
): descriptor is InteractionDescriptor {
  return descriptor.isCustom === true;
}

// Splits a list of descriptors into two arrays: one for custom interactions, one for standard events.
function splitDescriptors<T extends EventTarget>(
  descriptors: EventDescriptor<T>[]
): { custom: InteractionDescriptor<T>[]; standard: EventDescriptor<T>[] } {
  const custom: InteractionDescriptor<T>[] = [];
  const standard: EventDescriptor<T>[] = [];
  for (const d of descriptors) {
    if (isInteractionDescriptor(d)) {
      custom.push(d);
    } else {
      standard.push(d);
    }
  }
  return { custom, standard };
}

// Creates a dispatcher function that interactions use to emit their high-level custom events.
function createDispatcher<T extends EventTarget>(target: T, type: string) {
  return (options?: CustomEventInit) => {
    const customEvent = new CustomEvent(type, {
      bubbles: true,
      cancelable: true,
      ...options,
    });
    target.dispatchEvent(customEvent);
  };
}

/**
 * Attaches event listeners declaratively to a target and returns a cleanup function,
 * or creates a container for dynamic event management.
 * This system supports high-level interactions and a middleware-like composition
 * model where handlers can call `event.preventDefault()` to stop subsequent handlers
 * for the same event.
 *
 * @param target The `EventTarget` (e.g., an element, window, or document).
 * @returns An `EventContainer` object with `.on()` and `.cleanup()` methods.
 *
 * @example
 * // Dynamic usage with a container
 * const buttonEvents = events(buttonElement);
 *
 * buttonEvents.on([
 *   dom.click(validate), // This can call preventDefault()
 *   press(submit),       // This will only run if validate() did not prevent default
 * ]);
 *
 * // ...later
 * buttonEvents.cleanup();
 */
export function events<Target extends EventTarget>(target: Target): EventContainer {
  let cleanups: Cleanup[] = [];

  const cleanupAll = () => {
    cleanups.forEach(c => c());
    cleanups = [];
  };

   const on = (nextDescriptors: EventDescriptor | EventDescriptor[] | undefined) => {
     cleanupAll();
     const descriptors = nextDescriptors ? (Array.isArray(nextDescriptors) ? nextDescriptors : [nextDescriptors]) : [];

     if (descriptors.length === 0) return;

     const { custom, standard } = splitDescriptors(descriptors);

     // 1. Create dispatches for custom interactions
     const dispatches = new Map<string, (options?: CustomEventInit) => void>();
     for (const descriptor of custom) {
       if (!dispatches.has(descriptor.type)) {
         dispatches.set(descriptor.type, createDispatcher(target, descriptor.type));
       }
     }

     // 2. Group all handlers by event type to implement the middleware chain.
     const handlersByType = new Map<string, EventDescriptor<Target>[]>();
     for (const descriptor of [...standard, ...custom]) {
       if (!handlersByType.has(descriptor.type)) {
         handlersByType.set(descriptor.type, []);
       }
       handlersByType.get(descriptor.type)!.push(descriptor);
     }

     // 3. Attach a single "master" listener per event type.
     for (const [eventType, eventDescriptors] of handlersByType.entries()) {
       // This controller is for reentry management on a per-handler basis.
       const reEntryControllers = new WeakMap<EventDescriptor, AbortController>();

       const masterHandler = (event: Event) => {
         for (const descriptor of eventDescriptors) {
           if (event.defaultPrevented) {
             break; // A previous handler in the chain called preventDefault(), so we stop.
           }

           // Re-entry management: abort the previous async call from this specific handler, if any.
           reEntryControllers.get(descriptor)?.abort();
           const controller = new AbortController();
           reEntryControllers.set(descriptor, controller);

           // Execute the user's handler
           try {
             descriptor.handler(event as any, controller.signal);
           } catch (err) {
             console.error('Handler error:', err);
           }
         }
       };

       target.addEventListener(eventType, masterHandler);
       cleanups.push(() => target.removeEventListener(eventType, masterHandler));
     }

     // 4. Prepare and run the factories for all custom interactions.
     // The factories attach the underlying low-level listeners.
     const preparedInteractionTypes = new Set<string>();
     for (const descriptor of custom) {
       if (preparedInteractionTypes.has(descriptor.type)) continue;

       const dispatch = dispatches.get(descriptor.type)!;
       const factoryCleanups = descriptor.factory({ target, dispatch }, descriptor.factoryOptions);

       if (factoryCleanups) {
         cleanups.push(...(Array.isArray(factoryCleanups) ? factoryCleanups : [factoryCleanups]));
       }
       preparedInteractionTypes.add(descriptor.type);
     }
   };

  const cleanup = () => {
    cleanupAll();
  };

  return { on, cleanup };
}