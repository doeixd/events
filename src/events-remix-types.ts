/**
 * @module remix-types
 *
 * Provides the core, shared type definitions for the Remix Events compatibility layer.
 * This includes the declarative `EventDescriptor` and the interfaces for building
 * composable, high-level `Interaction`s.
 */

/**
 * A function that is called to clean up an event listener or other resources.
 * Typically returned from a subscription.
 */
export type Cleanup = () => void;

/**
 * A generic event object where the `target` and `currentTarget` properties
 * can be strongly typed, which is essential for type-safe event handlers.
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
 * The signature for an event handler function within the Remix-style system.
 * It receives the event object and an `AbortSignal` for cancellation.
 */
export type EventHandler<E extends Event = Event> = (event: E, signal: AbortSignal) => any | Promise<any>;

/**
 * A declarative description of an event listener to be attached to a target.
 * This serves as the primary data structure for the `events()` attacher function.
 */
export interface EventDescriptor {
  /** The name of the event (e.g., 'click', 'keydown', or a custom event name). */
  type: string;
  /** The function to execute when the event is triggered. */
  handler: EventHandler;
  /** Standard `addEventListener` options. */
  options?: AddEventListenerOptions;
}

/**
 * The `this` context provided to an interaction function, giving it the tools
 * it needs to dispatch custom events and respond to abort signals.
 */
export type InteractionHandle<E extends Event> = {
  dispatchEvent: (event: E) => void;
  signal: AbortSignal;
};

/**
 * An interaction is a function that returns an array of `EventDescriptor` bindings.
 * It receives an `InteractionHandle` as the first parameter, providing access to
 * `dispatchEvent` and `signal` for managing the interaction's lifecycle.
 */
export type Interaction<E extends Event> = (
  handle: InteractionHandle<E>,
  ...args: any[]
) => EventDescriptor[];

/**
 * A descriptor for a high-level interaction that combines the interaction logic
 * with the user's event handler. This makes interactions truly component-like.
 */
export interface InteractionDescriptor<E extends Event = Event> {
  /** The interaction function that defines the low-level event bindings. */
  interaction: Interaction<E>;
  /** The user's handler for the high-level custom event. */
  handler: EventHandler<E>;
  /** The type of the custom event this interaction dispatches. */
  type: string;
}

/**
 * An object that manages a dynamic set of event listeners on a target.
 * Returned by `events(target)`.
 */
export interface EventContainer {
  /**
   * Attaches or updates the event listeners on the target.
   * This will clean up any previously attached listeners and apply the new set.
   * @param descriptors A single descriptor, interaction, or an array of them.
   */
   on: (descriptors: (EventDescriptor | Interaction<any> | InteractionDescriptor<any>)[] | EventDescriptor | Interaction<any> | InteractionDescriptor<any> | undefined) => void;
  /**
   * Removes all event listeners managed by this container.
   */
  cleanup: () => void;
}