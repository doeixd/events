/**
 * @module interaction
 *
 * Contains the `createInteraction` factory for building high-level,
 * stateful, and reusable user interactions from low-level DOM events.
 */

import type { EventHandler, Cleanup, InteractionDescriptor } from './events-remix-types';

/**
 * The function signature that defines the logic of a custom interaction.
 *
 * It is executed once when the interaction is attached to an element. It should
 * set up all necessary low-level event listeners and return a function or array
 * of functions to clean them up.
 *
 * @template Target The type of the `EventTarget` the interaction is attached to.
 * @template Detail The type of the `detail` object in the dispatched `CustomEvent`.
 * @template Options The type of the configuration options object for the interaction.
 *
 * @param context An object containing:
 *   - `target`: The DOM element the interaction is attached to.
 *   - `dispatch`: A function to call to emit the high-level custom event.
 * @param options The configuration options passed by the user.
 * @returns A single `Cleanup` function or an array of them.
 */
export type InteractionFactory<Target extends EventTarget, Detail = any, Options = any> = (
  context: {
    dispatch: (options?: CustomEventInit<Detail>) => void;
    target: Target;
  },
  options?: Options
) => Cleanup | Cleanup[] | void;

/**
 * Creates a reusable, stateful, high-level user interaction.
 *
 * An interaction composes multiple low-level DOM events (e.g., `mousedown`, `touchstart`, `keydown`)
 * into a single, semantic custom event (e.g., `press`). This encapsulates complex state,
 * timers, and logic, making components cleaner and more declarative.
 *
 * @template Target The expected `EventTarget` type (e.g., `Element`).
 * @template Detail The type of the `detail` property of the dispatched `CustomEvent`.
 * @template Options The type of the options object the interaction can accept.
 *
 * @param eventName The name of the custom event that this interaction will dispatch.
 * @param factory The function that implements the interaction's logic.
 *
 * @returns A function that, when called with a handler and options, produces an `InteractionDescriptor`
 *   ready to be used with the `events()` attacher.
 *
 * @example
 * // 1. Create the interaction
 * const longPress = createInteraction<{}, { duration: number }>(
 *   'longpress',
 *   ({ target, dispatch }) => {
 *     let timer: number;
 *     const onMouseDown = fromDomEvent(target, 'mousedown');
 *     const onMouseUp = fromDomEvent(window, 'mouseup');
 *
 *     const downSub = onMouseDown(e => {
 *       const start = Date.now();
 *       timer = setTimeout(() => {
 *         dispatch({ detail: { duration: Date.now() - start } });
 *       }, 500);
 *     });
 *
 *     const upSub = onMouseUp(() => clearTimeout(timer));
 *
 *     return [downSub, upSub];
 *   }
 * );
 *
 * // 2. Use the interaction in a component
 * const buttonEvents = events(buttonElement);
 * buttonEvents.on(
 *   longPress(e => {
 *     console.log(`Long press detected for ${e.detail.duration}ms!`);
 *   })
 * );
 */
export function createInteraction<Target extends EventTarget, Detail = any, Options = any>(
  eventName: string,
  factory: InteractionFactory<Target, Detail, Options>
) {
  return <ECurrentTarget extends EventTarget = Target>(
    handler: EventHandler<CustomEvent<Detail>, ECurrentTarget>,
    options?: Options
  ): InteractionDescriptor<ECurrentTarget> => {
    return {
      type: eventName,
      handler: handler as EventHandler<any, ECurrentTarget>,
      isCustom: true,
      factory: factory as any,
      factoryOptions: options,
    };
  };
}