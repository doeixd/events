// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  events,
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

       container.on([{
         type: 'click',
         handler
       }]);

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

    it('should support stopImmediatePropagation', () => {
      const container = events(element);
      const firstHandler = vi.fn().mockImplementation((event) => {
        event.stopImmediatePropagation();
      });
      const secondHandler = vi.fn();

      container.on([
        { type: 'click', handler: firstHandler },
        { type: 'click', handler: secondHandler }
      ]);

      element.click();

      expect(firstHandler).toHaveBeenCalledTimes(1);
      expect(secondHandler).not.toHaveBeenCalled(); // Should be stopped by stopImmediatePropagation
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



  describe('press - Built-in Interaction', () => {
    it('should dispatch press event on mouse click', () => {
      const container = events(element);
      const pressHandler = vi.fn();

      container.on([
        press(pressHandler) // Attaches the interaction with handler
      ]);

      element.click();

      expect(pressHandler).toHaveBeenCalledTimes(1);
      expect(pressHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'press',
          originalEvent: expect.any(MouseEvent)
        }),
        expect.any(AbortSignal)
      );
    });

    it('should dispatch press event on Enter key', () => {
      const container = events(element);
      const pressHandler = vi.fn();

      container.on([
        press(pressHandler)
      ]);

      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(pressHandler).toHaveBeenCalledTimes(1);
      expect(pressHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'press',
          originalEvent: expect.any(KeyboardEvent)
        }),
        expect.any(AbortSignal)
      );
    });

    it('should dispatch press event on Space key', () => {
      const container = events(element);
      const pressHandler = vi.fn();

      container.on([
        press(pressHandler)
      ]);

      element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

      expect(pressHandler).toHaveBeenCalledTimes(1);
      expect(pressHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'press',
          originalEvent: expect.any(KeyboardEvent)
        }),
        expect.any(AbortSignal)
      );
    });

    it('should dispatch press event on touch end', () => {
      const container = events(element);
      const pressHandler = vi.fn();

      container.on([
        press(pressHandler)
      ]);

      element.dispatchEvent(new TouchEvent('touchend'));

      expect(pressHandler).toHaveBeenCalledTimes(1);
      expect(pressHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'press',
          originalEvent: expect.any(TouchEvent)
        }),
        expect.any(AbortSignal)
      );
    });



    it('should prevent default on space key to avoid page scroll', () => {
      const container = events(element);
      const pressHandler = vi.fn();

      container.on([
        press(pressHandler)
      ]);

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
       const [handler] = createEvent<string>();
       const callback = vi.fn();
       const descriptor = fromHandler<string>(handler, 'click', callback);

       expect(descriptor).toEqual({
         type: 'click',
         handler: expect.any(Function),
         options: undefined
       });
     });

     it('should support addEventListener options', () => {
       const [handler] = createEvent<string>();
       const descriptor = fromHandler<string>(handler, 'click', () => {}, { passive: true });

       expect(descriptor.options).toEqual({ passive: true });
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

    it('should handle custom interaction functions', () => {
      function doubleClick(handle: any): any[] {
        let clickCount = 0;
        let timer: number | undefined;

        return [{
          type: 'click',
          handler: () => {
            clickCount++;
            if (clickCount === 1) {
              timer = window.setTimeout(() => {
                handle.dispatchEvent(new CustomEvent('doubleclick', {
                  detail: { count: clickCount }
                }));
                clickCount = 0;
              }, 300);
            } else if (clickCount === 2) {
              if (timer) clearTimeout(timer);
              handle.dispatchEvent(new CustomEvent('doubleclick', {
                detail: { count: clickCount }
              }));
              clickCount = 0;
            }
          }
        }];
      }

      const container = events(element);
      const doubleClickHandler = vi.fn();

      container.on([
        doubleClick,
        { type: 'doubleclick', handler: doubleClickHandler }
      ]);

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
         childContainer.on([
           press(childHandler)
         ]);

       childElement.click();

       expect(parentHandler).toHaveBeenCalledTimes(1);
       expect(childHandler).toHaveBeenCalledTimes(1);

       parentContainer.cleanup();
       childContainer.cleanup();
       document.body.removeChild(parentElement);
     });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle interaction function throwing errors', () => {
      function errorInteraction(): any[] {
        throw new Error('Interaction error');
      }

      const container = events(element);

      expect(() => {
        container.on([errorInteraction]);
      }).toThrow('Interaction error');
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