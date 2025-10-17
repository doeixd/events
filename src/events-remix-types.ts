/**
 * @module remix-types
 *
 * Provides the core, shared type definitions for the Remix Events compatibility layer.
 * This includes the declarative `EventDescriptor` and the interfaces for building
 * composable, high-level `Interaction`s.
 */

import type { InteractionFactory } from './interaction';

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
 * It receives the typed event object and an `AbortSignal` for re-entry management,
 * ensuring that an async handler is cancelled if the same event is fired again
 * before the handler completes.
 */
export type EventHandler<
  E = Event,
  ECurrentTarget = any,
  ETarget = any
> = (event: EventWithTargets<E, ECurrentTarget, ETarget>, signal: AbortSignal) => any | Promise<any>;

/**
 * A declarative description of an event listener to be attached to a target.
 * This serves as the primary data structure for the `events()` attacher function.
 */
export interface EventDescriptor<ECurrentTarget = any> {
  /** The name of the event (e.g., 'click', 'keydown', or a custom event name). */
  type: string;
  /** The function to execute when the event is triggered. */
  handler: EventHandler<any, ECurrentTarget>;
  /** A flag indicating whether this is a standard DOM event or a custom interaction. */
  isCustom?: boolean;
  /** Standard `addEventListener` options. */
  options?: AddEventListenerOptions;
}

/**
 * A specialized `EventDescriptor` for a high-level, custom interaction.
 * It includes the `factory` function that implements the interaction's logic.
 */
export interface InteractionDescriptor<Target extends EventTarget = any> extends EventDescriptor<Target> {
  isCustom: true;
  /** The factory function that sets up the low-level listeners for this interaction. */
  factory: InteractionFactory<Target>;
  /** The options object passed to the factory function during setup. */
  factoryOptions?: any;
}

/**
 * An object that manages a dynamic set of event listeners on a target.
 * Returned by `events(target)`.
 */
export interface EventContainer {
  /**
   * Attaches or updates the event listeners on the target.
   * This will clean up any previously attached listeners and apply the new set.
   * @param descriptors A single `EventDescriptor` or an array of them.
   */
  on: (descriptors: EventDescriptor | EventDescriptor[] | undefined) => void;
  /**
   * Removes all event listeners managed by this container.
   */
  cleanup: () => void;
}