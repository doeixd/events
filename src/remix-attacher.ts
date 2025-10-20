/**
 * @module remix-attacher
 *
 * The declarative event attachment system inspired by Remix Events.
 * Provides the central `events()` function that manages event lifecycles
 * and direct event listener attachment.
 */

import type {
  EventDescriptor,
  Interaction,
  InteractionHandle,
  InteractionDescriptor,
  EventContainer,
} from './events-remix-types';

// Type guards to distinguish between different descriptor types.
function isInteraction(descriptor: any): descriptor is Interaction<any> {
  return typeof descriptor === 'function' && !descriptor.type;
}

function isInteractionDescriptor(descriptor: any): descriptor is InteractionDescriptor<any> {
  return typeof descriptor === 'object' && descriptor.interaction && descriptor.handler && descriptor.type;
}

/**
 * Attaches event listeners declaratively to a target and returns a cleanup function,
 * or creates a container for dynamic event management.
 * This system supports high-level interactions and direct event listener attachment
 * where `stopImmediatePropagation()` works as expected by the browser.
 *
 * @param target The `EventTarget` (e.g., an element, window, or document).
 * @returns An `EventContainer` object with `.on()` and `.cleanup()` methods.
 *
 * @example
 * // Dynamic usage with a container
 * const buttonEvents = events(buttonElement);
 *
 * buttonEvents.on([
 *   dom.click(validate),
 *   press(submit),
 * ]);
 *
 * // ...later
 * buttonEvents.cleanup();
 */
export function events<Target extends EventTarget>(target: Target): EventContainer {
  let controller: AbortController | null = null;

  const cleanupAll = () => {
    if (controller) {
      controller.abort();
      controller = null;
    }
  };

  const on = (nextDescriptors: (EventDescriptor | Interaction<any> | InteractionDescriptor<any>)[] | EventDescriptor | Interaction<any> | InteractionDescriptor<any> | undefined) => {
    cleanupAll();
    controller = new AbortController();
    const signal = controller.signal;

    const descriptors = nextDescriptors ? (Array.isArray(nextDescriptors) ? nextDescriptors : [nextDescriptors]) : [];

    if (descriptors.length === 0) return;

    // Process each descriptor
    for (const descriptor of descriptors) {
      if (isInteractionDescriptor(descriptor)) {
        // This is an interaction descriptor - handle the high-level interaction
        const handle: InteractionHandle<any> = {
          dispatchEvent: (event: any) => target.dispatchEvent(event),
          signal,
        };

        // Call the interaction logic to get the low-level event bindings
        const interactionDescriptors = descriptor.interaction(handle as any);

        // Attach each low-level descriptor returned by the interaction
        for (const desc of interactionDescriptors) {
          const listener = (event: Event) => {
            desc.handler(event as any, signal);
          };
          target.addEventListener(desc.type, listener, {
            ...desc.options,
            signal,
          });
        }

        // Separately attach the user's handler for the high-level custom event
        const highLevelListener = (event: Event) => {
          descriptor.handler(event as any, signal);
        };
        target.addEventListener(descriptor.type, highLevelListener, {
          signal,
        });
      } else if (isInteraction(descriptor)) {
        // This is a legacy interaction function - call it with the handle context
        const handle: InteractionHandle<any> = {
          dispatchEvent: (event: any) => target.dispatchEvent(event),
          signal,
        };

        const interactionDescriptors = descriptor(handle);

        // Attach each descriptor returned by the interaction
        for (const desc of interactionDescriptors) {
          const listener = (event: Event) => {
            desc.handler(event as any, signal);
          };
          target.addEventListener(desc.type, listener, {
            ...desc.options,
            signal,
          });
        }
      } else {
        // This is a standard event descriptor - attach it directly
        const listener = (event: Event) => {
          descriptor.handler(event as any, signal);
        };
        target.addEventListener(descriptor.type, listener, {
          ...descriptor.options,
          signal,
        });
      }
    }
  };

  const cleanup = () => {
    cleanupAll();
  };

  return { on, cleanup };
}