/**
 * @module interactions/press
 *
 * A high-level `press` interaction that normalizes user input across mouse,
 * keyboard, and touch into a single, semantic event.
 */

import type { EventDescriptor, InteractionHandle, InteractionDescriptor, EventHandler } from '../events-remix-types';

/**
 * A custom event class for press interactions that carries the original event
 * directly as a property, eliminating the need for event.detail.
 */
export class PressEvent extends Event {
  constructor(public originalEvent: Event) {
    super('press', { bubbles: true, cancelable: true });
  }
}

/**
 * A normalized "press" interaction factory.
 *
 * Creates a press interaction that dispatches a `PressEvent` when a user activates
 * an element via:
 * - Left mouse button click
 * - `Enter` or `Space` key press
 * - Touch tap
 *
 * This encapsulates the logic for handling different input methods, simplifying
 * component code.
 *
 * @param handler The user's callback for the press event
 * @returns An InteractionDescriptor that can be used with events()
 *
 * @example
 * events(button, [
 *   press(e => {
 *     console.log(`Pressed with a ${e.originalEvent.type} event.`);
 *     // e.originalEvent is the underlying MouseEvent, KeyboardEvent, etc.
 *   })
 * ]);
 */
export function press(handler: EventHandler<PressEvent>): InteractionDescriptor<PressEvent> {
  return {
    interaction: pressInteraction,
    handler,
    type: 'press',
  };
}

/**
 * The actual press interaction logic that defines the low-level event bindings.
 */
function pressInteraction(handle: InteractionHandle<PressEvent>): EventDescriptor[] {
  const dispatch = handle.dispatchEvent;

  const onPress = (originalEvent: Event) => {
    // We check for defaultPrevented on the original event here.
    // If another handler (e.g., for validation) stopped it, we don't dispatch our custom event.
    if (originalEvent.defaultPrevented) {
      return;
    }
    dispatch(new PressEvent(originalEvent as MouseEvent | KeyboardEvent | TouchEvent));
  };

  // The interaction returns its low-level event bindings.
  return [
    { type: 'click', handler: onPress },
    { type: 'keydown', handler: (e) => {
      const event = e as KeyboardEvent;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); // Prevent page scroll on spacebar press.
        onPress(event);
      }
    }},
    { type: 'touchend', handler: onPress },
  ];
}