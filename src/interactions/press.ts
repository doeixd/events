/**
 * @module interactions/press
 *
 * A high-level `press` interaction that normalizes user input across mouse,
 * keyboard, and touch into a single, semantic event.
 */

import { createInteraction } from '../interaction';
import { dom } from '../dom';
import { createSubscriptionStack } from '../stack';

/**
 * A normalized "press" interaction.
 *
 * Dispatches a `press` custom event when a user activates an element via:
 * - Left mouse button click
 * - `Enter` or `Space` key press
 * - Touch tap
 *
 * This encapsulates the logic for handling different input methods, simplifying
 * component code.
 *
 * @example
 * events(button, [
 *   press(e => {
 *     console.log(`Pressed with a ${e.detail.originalEvent.type} event.`);
 *     // e.detail.originalEvent is the underlying MouseEvent, KeyboardEvent, etc.
 *   })
 * ]);
 */
export const press = createInteraction<Element, { originalEvent: Event }>(
  'press',
  ({ target, dispatch }) => {
    // Use the library's own robust subscription manager for cleanup.
    const stack = createSubscriptionStack();

    const onPress = (originalEvent: Event) => {
      // We check for defaultPrevented on the original event here.
      // If another handler (e.g., for validation) stopped it, we don't dispatch our custom event.
      if (originalEvent.defaultPrevented) {
        return;
      }
      dispatch({ detail: { originalEvent } });
    };

    // --- Mouse Logic ---
    stack.defer(dom.click(target)(onPress));

    // --- Keyboard Logic ---
    stack.defer(
      dom.keydown(target)(e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); // Prevent page scroll on spacebar press.
          onPress(e);
        }
      })
    );

    // --- Touch Logic ---
    // Note: We use touchend to better simulate a "tap" action.
    stack.defer(dom.touchend(target)(onPress));

    // Return a single, robust cleanup function.
    return () => stack.dispose();
  }
);