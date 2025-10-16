// // events-remix-types.ts
// /**
//  * Core types for Remix-style event integration with our library.
//  * 
//  * Provides type-safe definitions for EventDescriptors, EventContainers,
//  * EventHandlers, and interactions, fully compatible with AbortSignals.
//  */

// /**
//  * Generic event object extended to allow typed `currentTarget` and `target`.
//  */
// export type EventWithTargets<
//   E = Event,
//   ECurrentTarget = any,
//   ETarget = any
// > = Omit<E, 'target' | 'currentTarget'> & {
//   target: ETarget
//   currentTarget: ECurrentTarget
// };

// /**
//  * Event handler function type.
//  *
//  * @template E - Event type
//  * @template ECurrentTarget - currentTarget type
//  * @template ETarget - target type
//  */
// export type EventHandler<
//   E = Event,
//   ECurrentTarget = any,
//   ETarget = any
// > = (event: EventWithTargets<E, ECurrentTarget, ETarget>, signal: AbortSignal) => any | Promise<any>;

// /**
//  * Standard event descriptor for a DOM or custom event.
//  *
//  * Use `bind()` in Remix style to create them.
//  */
// export interface EventDescriptor<ECurrentTarget = any> {
//   /** Event type string (e.g., 'click', 'input') */
//   type: string;

//   /** Event handler function */
//   handler: EventHandler<any, ECurrentTarget>;

//   /** Optional: indicates custom interaction descriptor */
//   isCustom?: boolean;

//   /** Optional addEventListener options */
//   options?: AddEventListenerOptions;
// }

// /**
//  * Factory-based interaction descriptor for advanced custom events or gestures.
//  */
// export interface InteractionDescriptor<Target extends EventTarget = any> extends EventDescriptor<Target> {
//   /** Indicates this is a custom interaction */
//   isCustom: true;

//   /** Factory function that sets up the interaction */
//   factory: (ctx: {
//     dispatch: (eventInit: CustomEventInit) => void;
//     target: Target;
//   }, options?: any) => Cleanup | Cleanup[];
// }

// /**
//  * Function that cleans up attached event listeners.
//  */
// export type Cleanup = () => void;

// /**
//  * Container returned by `events(target)` in Remix style.
//  * Provides `.on()` to attach descriptors and `.cleanup()` to remove all.
//  */
// export interface EventContainer {
//   /** Add or update event descriptors */
//   on: (events: EventDescriptor | EventDescriptor[] | undefined) => void;

//   /** Remove all attached events */
//   cleanup: () => void;
// }
/**
 * events-remix-types.ts
 *
 * Type definitions for bridging a type-safe event/subject system with
 * Remix-style events (@remix-run/events or similar).
 */

export type Cleanup = () => void;

/**
 * Generic event with targets typed separately.
 * Replaces `target` and `currentTarget` with specific types.
 */
export type EventWithTargets<
  E = Event,
  ECurrentTarget = any,
  ETarget = any
> = Omit<E, 'target' | 'currentTarget'> & {
  target: ETarget;
  currentTarget: ECurrentTarget;
};

/**
 * Handler function for Remix-style events.
 * Receives the event and an AbortSignal for cleanup.
 */
export type EventHandler<
  E = Event,
  ECurrentTarget = any,
  ETarget = any
> = (event: EventWithTargets<E, ECurrentTarget, ETarget>, signal: AbortSignal) => any | Promise<any>;

/**
 * Event descriptor for attaching to a target.
 */
export interface EventDescriptor<ECurrentTarget = any> {
  type: string;
  handler: EventHandler<any, ECurrentTarget>;
  isCustom?: boolean;
  options?: AddEventListenerOptions;
}

/**
 * Special descriptor for custom interactions.
 * Used internally for `InteractionDescriptorFactory`.
 */
export interface InteractionDescriptor<Target extends EventTarget = any> extends EventDescriptor<Target> {
  isCustom: true;
  /**
   * Factory that returns cleanup function(s).
   */
  factory: InteractionDescriptorFactory<Target>;
  factoryOptions?: any;
}

/**
 * Factory signature for creating custom interactions.
 */
export type InteractionDescriptorFactory<Target extends EventTarget = any> = (ctx: {
  target: Target;
  dispatch: (event: CustomEvent) => void;
}, opts?: any) => Cleanup | Cleanup[] | void;

/**
 * Container returned by `events(target)`.
 * Allows dynamic updates and cleanup.
 */
export interface EventContainer {
  on: (events: EventDescriptor | EventDescriptor[] | undefined) => void;
  cleanup: () => void;
}

/**
 * Union of DOM events and custom events.
 */
export type AnyEvent = Event | CustomEvent<any>;

/**
 * Utility to infer the type of a DOM event for a given element and event name.
 */
export type DOMEventType<
K extends keyof HTMLElementEventMap
> = HTMLElementEventMap[K];

/**
 * Optional platform-specific extensions.
 */
export interface EventDescriptorExtensions {
  signal?: AbortSignal;
  capture?: boolean;
  passive?: boolean;
}

/**
 * Type guard for distinguishing custom interactions from normal events.
 */
export function isInteractionDescriptor(descriptor: EventDescriptor): descriptor is InteractionDescriptor {
  return descriptor.isCustom === true;
}

/**
 * Helper: split descriptors into custom vs standard.
 */
export function splitDescriptors<T extends EventTarget>(
  descriptors: EventDescriptor<T>[]
): { custom: InteractionDescriptor<T>[]; standard: EventDescriptor<T>[] } {
  const custom: InteractionDescriptor<T>[] = [];
  const standard: EventDescriptor<T>[] = [];
  for (const d of descriptors) {
    if (isInteractionDescriptor(d)) custom.push(d);
    else standard.push(d);
  }
  return { custom, standard };
}
