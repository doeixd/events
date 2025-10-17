// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  events,
  createInteraction,
  press,
  fromHandler,
  dom,
  createEvent,
  debounce
} from '../src/index';

describe('Remix Events Compatibility Layer', () => {
  let element: HTMLButtonElement;
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    element = document.createElement('button');
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }
    document.body.removeChild(element);
  });

  describe('events() - Declarative Event Container', () => {
    it('should create an event container with on and cleanup methods', () => {
      const container = events(element);
      expect(container).toHaveProperty('on');
      expect(container).toHaveProperty('cleanup');
      expect(typeof container.on).toBe('function');
      expect(typeof container.cleanup).toBe('function');
    });

    it('should attach and trigger DOM events', () => {
       const container = events(element);
       const handler = vi.fn();

       container.on({
         type: 'click',
         handler
       });

       element.click();
       expect(handler).toHaveBeenCalledTimes(1);
       expect(handler).toHaveBeenCalledWith(
         expect.any(Event),
         expect.any(AbortSignal)
       );
     });

    it('should support multiple event descriptors', () => {
      const container = events(element);
      const clickHandler = vi.fn();
      const mouseDownHandler = vi.fn();

      container.on([
        { type: 'click', handler: clickHandler },
        { type: 'mousedown', handler: mouseDownHandler }
      ]);

      element.dispatchEvent(new MouseEvent('mousedown'));
      element.click();

      expect(clickHandler).toHaveBeenCalledTimes(1);
      expect(mouseDownHandler).toHaveBeenCalledTimes(1);
    });

    it('should clean up all listeners when cleanup is called', () => {
      const container = events(element);
      const handler = vi.fn();

      container.on({ type: 'click', handler });
      container.cleanup();

      element.click();
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow dynamic updates of event descriptors', () => {
      const container = events(element);
      const oldHandler = vi.fn();
      const newHandler = vi.fn();

      container.on({ type: 'click', handler: oldHandler });
      element.click();
      expect(oldHandler).toHaveBeenCalledTimes(1);

      container.on({ type: 'click', handler: newHandler });
      element.click();
      expect(oldHandler).toHaveBeenCalledTimes(1); // Should not be called again
      expect(newHandler).toHaveBeenCalledTimes(1);
    });

    it('should support preventDefault middleware behavior', () => {
      const container = events(element);
      const firstHandler = vi.fn().mockImplementation((event) => {
        event.preventDefault();
      });
      const secondHandler = vi.fn();

      container.on([
        { type: 'click', handler: firstHandler },
        { type: 'click', handler: secondHandler }
      ]);

      element.click();

      expect(firstHandler).toHaveBeenCalledTimes(1);
      expect(secondHandler).not.toHaveBeenCalled(); // Should be stopped by preventDefault
    });

    it('should handle empty descriptor arrays', () => {
      const container = events(element);
      const handler = vi.fn();

      container.on([]);
      element.click();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle undefined descriptors', () => {
      const container = events(element);
      const handler = vi.fn();

      container.on(undefined);
      element.click();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('createInteraction() - Custom Interaction Factory', () => {
    it('should create a reusable interaction function', () => {
      const longPress = createInteraction<HTMLButtonElement, { duration: number }>(
        'longpress',
        ({ dispatch }) => {
          let timer: number | undefined;
          const cleanup = () => {
            if (timer) clearTimeout(timer);
          };

          element.addEventListener('mousedown', () => {
            timer = window.setTimeout(() => {
              dispatch({ detail: { duration: 500 } });
            }, 500);
          });

          element.addEventListener('mouseup', cleanup);

          return cleanup;
        }
      );

      expect(typeof longPress).toBe('function');
    });

    it('should return an InteractionDescriptor when called with handler', () => {
      const simplePress = createInteraction('simplepress', ({ dispatch }) => {
        element.addEventListener('click', () => dispatch());
        return () => element.removeEventListener('click', () => dispatch());
      });

      const descriptor = simplePress(() => {});

      expect(descriptor).toEqual({
        type: 'simplepress',
        handler: expect.any(Function),
        isCustom: true,
        factory: expect.any(Function),
        factoryOptions: undefined
      });
    });

    it('should pass options to the factory', () => {
      const configurablePress = createInteraction<HTMLButtonElement, void, { delay: number }>(
        'configurablepress',
        ({ dispatch }, options) => {
          const delay = options?.delay ?? 0;
          element.addEventListener('click', () => {
            setTimeout(() => dispatch(), delay);
          });
          return () => {};
        }
      );

      const descriptor = configurablePress(() => {}, { delay: 100 });

      expect(descriptor.factoryOptions).toEqual({ delay: 100 });
    });

    it('should handle factory returning multiple cleanups', () => {
      const multiCleanup = createInteraction('multicleanup', ({ dispatch }) => {
        const cleanup1 = vi.fn();
        const cleanup2 = vi.fn();

        element.addEventListener('click', dispatch);

        return [cleanup1, cleanup2];
      });

      const descriptor = multiCleanup(() => {});
      const cleanups = descriptor.factory({ dispatch: vi.fn() });

      expect(Array.isArray(cleanups)).toBe(true);
      if (Array.isArray(cleanups)) {
        cleanups.forEach(cleanup => cleanup());
        expect(cleanups[0]).toHaveBeenCalledTimes(1);
        expect(cleanups[1]).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('press - Built-in Interaction', () => {
    it('should dispatch press event on mouse click', () => {
      const container = events(element);
      const pressHandler = vi.fn();

      container.on(press(pressHandler));

      element.click();

      expect(pressHandler).toHaveBeenCalledTimes(1);
      expect(pressHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'press',
          detail: { originalEvent: expect.any(MouseEvent) }
        }),
        expect.any(AbortSignal)
      );
    });

    it('should dispatch press event on Enter key', () => {
      const container = events(element);
      const pressHandler = vi.fn();

      container.on(press(pressHandler));

      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(pressHandler).toHaveBeenCalledTimes(1);
      expect(pressHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'press',
          detail: { originalEvent: expect.any(KeyboardEvent) }
        }),
        expect.any(AbortSignal)
      );
    });

    it('should dispatch press event on Space key', () => {
      const container = events(element);
      const pressHandler = vi.fn();

      container.on(press(pressHandler));

      element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

      expect(pressHandler).toHaveBeenCalledTimes(1);
    });

    it('should dispatch press event on touch end', () => {
      const container = events(element);
      const pressHandler = vi.fn();

      container.on(press(pressHandler));

      element.dispatchEvent(new TouchEvent('touchend'));

      expect(pressHandler).toHaveBeenCalledTimes(1);
      expect(pressHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { originalEvent: expect.any(TouchEvent) }
        }),
        expect.any(AbortSignal)
      );
    });

    it('should prevent default on space key to avoid page scroll', () => {
      const container = events(element);
      const pressHandler = vi.fn();

      container.on(press(pressHandler));

      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      const preventDefaultSpy = vi.spyOn(spaceEvent, 'preventDefault');

      element.dispatchEvent(spaceEvent);

      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    });

    it('should not dispatch if original event was preventDefaulted', () => {
      const container = events(element);
      const validationHandler = vi.fn().mockImplementation((event) => {
        event.preventDefault();
      });
      const pressHandler = vi.fn();

      container.on([
        { type: 'click', handler: validationHandler },
        press(pressHandler)
      ]);

      element.click();

      expect(validationHandler).toHaveBeenCalledTimes(1);
      expect(pressHandler).not.toHaveBeenCalled();
    });
  });

   describe('fromHandler() - Bridge Function', () => {
     it('should bridge a Handler to EventDescriptor', () => {
       const handler = (cb: (data: string) => void) => { cb('test'); return () => {}; };
       const callback = vi.fn();
       const descriptor = fromHandler(handler, 'click', callback);

       expect(descriptor).toEqual({
         type: 'click',
         handler: expect.any(Function),
         options: undefined
       });
     });

     it('should call the callback when event is triggered', () => {
       const handler = (cb: (data: string) => void) => { cb('test data'); return () => {}; };
       const callback = vi.fn();
       const descriptor = fromHandler(handler, 'click', callback);

       const container = events(element);
       container.on(descriptor);

       element.click();

       expect(callback).toHaveBeenCalledWith('test data');
     });



     it('should support addEventListener options', () => {
       const handler = (cb: (data: string) => void) => { cb('test'); return () => {}; };
       const descriptor = fromHandler(handler, 'click', () => {}, { passive: true });

       expect(descriptor.options).toEqual({ passive: true });
     });

     it('should clean up subscriptions when AbortSignal is triggered', () => {
       const handler = (cb: (data: string) => void) => { cb('test'); return () => {}; };
       const callback = vi.fn();
       const descriptor = fromHandler(handler, 'click', callback);

       const container = events(element);
       container.on(descriptor);

       element.click();
       expect(callback).toHaveBeenCalledWith('test');

       // Cleanup should abort the signal
       container.cleanup();

       // Click again - should not trigger callback since subscription was cleaned up
       element.click();
       expect(callback).toHaveBeenCalledTimes(1);
     });
   });

  describe('Integration Tests', () => {
    it('should combine DOM events and custom interactions', () => {
      const container = events(element);
      const clickHandler = vi.fn();
      const pressHandler = vi.fn();

      container.on([
        { type: 'click', handler: clickHandler },
        press(pressHandler)
      ]);

      element.click();

      expect(clickHandler).toHaveBeenCalledTimes(1);
      expect(pressHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle complex interaction with state', () => {
      const doubleClick = createInteraction<HTMLButtonElement, { count: number }>(
        'doubleclick',
        ({ dispatch }) => {
          let clickCount = 0;
          let timer: number | undefined;

          const handler = () => {
            clickCount++;
            if (clickCount === 1) {
              timer = window.setTimeout(() => {
                dispatch({ detail: { count: clickCount } });
                clickCount = 0;
              }, 300);
            } else if (clickCount === 2) {
              if (timer) clearTimeout(timer);
              dispatch({ detail: { count: clickCount } });
              clickCount = 0;
            }
          };

          element.addEventListener('click', handler);
          return () => element.removeEventListener('click', handler);
        }
      );

      const container = events(element);
      const doubleClickHandler = vi.fn();

      container.on(doubleClick(doubleClickHandler));

      // Single click - should not trigger immediately
      element.click();
      expect(doubleClickHandler).not.toHaveBeenCalled();

      // Second click within 300ms - should trigger double click
      element.click();
      expect(doubleClickHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'doubleclick',
          detail: { count: 2 }
        }),
        expect.any(AbortSignal)
      );
    });

    it('should support nested event containers', () => {
       const parentElement = document.createElement('div');
       const childElement = document.createElement('button');
       document.body.appendChild(parentElement);
       parentElement.appendChild(childElement);

       const parentContainer = events(parentElement);
       const childContainer = events(childElement);

       const parentHandler = vi.fn();
       const childHandler = vi.fn();

       parentContainer.on({ type: 'click', handler: parentHandler });
       childContainer.on(press(childHandler));

       childElement.click();

       expect(parentHandler).toHaveBeenCalledTimes(1);
       expect(childHandler).toHaveBeenCalledTimes(1);

       parentContainer.cleanup();
       childContainer.cleanup();
       document.body.removeChild(parentElement);
     });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle interaction factory throwing errors', () => {
      const errorInteraction = createInteraction('error', () => {
        throw new Error('Factory error');
      });

      const container = events(element);
      const handler = vi.fn();

      expect(() => {
        container.on(errorInteraction(handler));
      }).toThrow('Factory error');
    });

    it('should handle handler throwing errors gracefully', () => {
      const container = events(element);
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();

      container.on([
        { type: 'click', handler: errorHandler },
        { type: 'click', handler: normalHandler }
      ]);

      // Should not throw and should continue to next handler
      expect(() => element.click()).not.toThrow();
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(normalHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle non-element targets', () => {
      const target = new EventTarget();
      const container = events(target);
      const handler = vi.fn();

      container.on({ type: 'custom', handler });

      target.dispatchEvent(new CustomEvent('custom'));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});