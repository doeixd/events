import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fromDomEvent,
  dom,
  subjectProperty,
  subjectFromEvent,
  on,
  onIntersect,
  onResize,
  trapFocus,
  events
} from '../src/index';

describe('DOM Module', () => {
  describe('fromDomEvent', () => {
    it('should create a handler for DOM events', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);

      const handler = fromDomEvent(button, 'click');
      let clicked = false;

      handler(() => {
        clicked = true;
      });

      button.click();
      expect(clicked).toBe(true);

      document.body.removeChild(button);
    });

    it('should support AddEventListenerOptions', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);

      const handler = fromDomEvent(button, 'click', { once: true } as AddEventListenerOptions);
      let clickCount = 0;

      handler(() => {
        clickCount++;
      });

      button.click();
      expect(clickCount).toBe(1);

      button.click();
      expect(clickCount).toBe(1); // Should not fire again due to once: true

      document.body.removeChild(button);
    });

    it('should handle AbortSignal cleanup', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);

      const controller = new AbortController();
      const handler = fromDomEvent(button, 'click', { signal: controller.signal });
      let clicked = false;

      handler(() => {
        clicked = true;
      });

      controller.abort();

      button.click();
      expect(clicked).toBe(false); // Should not fire after abort

      document.body.removeChild(button);
    });
  });

  describe('dom shortcuts', () => {
    it('should provide shortcuts for common events', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);

      let clicked = false;

      const clickDescriptor = dom.click(() => {
        clicked = true;
      });

      // Test that it returns the correct descriptor
      expect(clickDescriptor).toEqual({
        type: 'click',
        handler: expect.any(Function),
        options: undefined
      });

      // Test that the handler works when attached
      const container = events(button);
      container.on([clickDescriptor]);

      button.click();
      expect(clicked).toBe(true);

      container.cleanup();
      document.body.removeChild(button);
    });

    it('should support all event types', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      let inputValue = '';

      const inputDescriptor = dom.input((event) => {
        inputValue = (event.target as HTMLInputElement).value;
      });

      // Test that it returns the correct descriptor
      expect(inputDescriptor).toEqual({
        type: 'input',
        handler: expect.any(Function),
        options: undefined
      });

      // Test that the handler works when attached
      const container = events(input);
      container.on([inputDescriptor]);

      input.value = 'test';
      input.dispatchEvent(new Event('input'));

      expect(inputValue).toBe('test');

      document.body.removeChild(input);
    });
  });

  describe('subjectProperty', () => {
    it('should create reactive subject from DOM property', () => {
      const input = document.createElement('input');
      input.type = 'text';
      document.body.appendChild(input);

      const valueSubject = subjectProperty(input, 'value');

      expect(valueSubject()).toBe('');

      input.value = 'hello';
      input.dispatchEvent(new Event('input'));

      expect(valueSubject()).toBe('hello');

      document.body.removeChild(input);
    });

    it('should support custom event names', () => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      document.body.appendChild(checkbox);

      const checkedSubject = subjectProperty(checkbox, 'checked', 'change');

      expect(checkedSubject()).toBe(false);

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));

      expect(checkedSubject()).toBe(true);

      document.body.removeChild(checkbox);
    });

    it('should dispose properly', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      const valueSubject = subjectProperty(input, 'value');
      const unsubscribe = valueSubject.subscribe(() => {});

      valueSubject.dispose!();

      // Should not throw
      input.value = 'test';
      input.dispatchEvent(new Event('input'));

      document.body.removeChild(input);
    });
  });

  describe('subjectFromEvent', () => {
    it('should create subject that emits DOM events', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);

      const clickSubject = subjectFromEvent(button, 'click');

      let eventReceived: Event | undefined;

      clickSubject.subscribe((ev) => {
        eventReceived = ev;
      });

      button.click();

      expect(eventReceived).toBeInstanceOf(Event);
      expect(eventReceived?.type).toBe('click');

      document.body.removeChild(button);
    });

    it('should dispose properly', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);

      const clickSubject = subjectFromEvent(button, 'click');

      clickSubject.dispose!();

      // Should not throw
      button.click();

      document.body.removeChild(button);
    });
  });

  describe('on (multi-element handler)', () => {
    it('should attach handler to multiple elements', () => {
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      document.body.appendChild(button1);
      document.body.appendChild(button2);

      let clickCount = 0;

      on([button1, button2], 'click', () => {
        clickCount++;
      });

      button1.click();
      expect(clickCount).toBe(1);

      button2.click();
      expect(clickCount).toBe(2);

      document.body.removeChild(button1);
      document.body.removeChild(button2);
    });

    it('should attach handler to multiple event types', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      let eventTypes: string[] = [];

      on(input, ['focus', 'blur'], (event) => {
        eventTypes.push(event.type);
      });

      input.focus();
      input.blur();

      expect(eventTypes).toEqual(['focus', 'blur']);

      document.body.removeChild(input);
    });

    it('should handle NodeListOf', () => {
      const container = document.createElement('div');
      container.innerHTML = '<button></button><button></button>';
      document.body.appendChild(container);

      const buttons = container.querySelectorAll('button');
      let clickCount = 0;

      on(buttons, 'click', () => {
        clickCount++;
      });

      buttons[0].click();
      buttons[1].click();

      expect(clickCount).toBe(2);

      document.body.removeChild(container);
    });

    it('should support AddEventListenerOptions', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);

      let clickCount = 0;

      on(button, 'click', () => {
        clickCount++;
      }, { once: true });

      button.click();
      expect(clickCount).toBe(1);

      button.click();
      expect(clickCount).toBe(1); // Should not fire again

      document.body.removeChild(button);
    });
  });

  describe('onIntersect', () => {
    let mockIntersectionObserver: any;

    beforeEach(() => {
      mockIntersectionObserver = vi.fn((callback: IntersectionObserverCallback, options?: IntersectionObserverInit) => ({
        observe: vi.fn(),
        disconnect: vi.fn(),
        callback
      }));

      global.IntersectionObserver = mockIntersectionObserver;
    });

    it('should create intersection observer handler', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      const intersectHandler = onIntersect(element);
      let intersected = false;

      intersectHandler((entry) => {
        if (entry.isIntersecting) {
          intersected = true;
        }
      });

      // Simulate intersection
      const mockEntry = { isIntersecting: true };
      mockIntersectionObserver.mock.calls[0][0]([mockEntry]);

      expect(intersected).toBe(true);

      document.body.removeChild(element);
    });

    it('should support options', () => {
      const element = document.createElement('div');
      const options = { threshold: 0.5 };

      const intersectHandler = onIntersect(element, options);

      // Call the handler to trigger the observer creation
      intersectHandler(() => {});

      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        options
      );
    });

    it('should disconnect observer on unsubscribe', () => {
      const element = document.createElement('div');
      const intersectHandler = onIntersect(element);

      const unsubscribe = intersectHandler(() => {});

      unsubscribe();

      const observerInstance = mockIntersectionObserver.mock.results[0].value;
      expect(observerInstance.disconnect).toHaveBeenCalled();
    });
  });

  describe('onResize', () => {
    let mockResizeObserver: any;

    beforeEach(() => {
      mockResizeObserver = vi.fn((callback: ResizeObserverCallback, options?: ResizeObserverOptions) => ({
        observe: vi.fn(),
        disconnect: vi.fn(),
        callback
      }));

      global.ResizeObserver = mockResizeObserver;
    });

    it('should create resize observer handler', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      const resizeHandler = onResize(element);
      let resized = false;

      resizeHandler((entry) => {
        resized = true;
      });

      // Simulate resize
      const mockEntry = { contentRect: { width: 100, height: 100 } };
      mockResizeObserver.mock.calls[0][0]([mockEntry]);

      expect(resized).toBe(true);

      document.body.removeChild(element);
    });

    it('should support options', () => {
      const element = document.createElement('div');
      const options = { box: 'border-box' as const };

      const resizeHandler = onResize(element, options);

      // Call the handler to trigger the observer creation
      resizeHandler(() => {});

      expect(mockResizeObserver).toHaveBeenCalledWith(
        expect.any(Function)
      );

      // Check that observe was called with options
      const observerInstance = mockResizeObserver.mock.results[0].value;
      expect(observerInstance.observe).toHaveBeenCalledWith(element, options);
    });

    it('should disconnect observer on unsubscribe', () => {
      const element = document.createElement('div');
      const resizeHandler = onResize(element);

      const unsubscribe = resizeHandler(() => {});

      unsubscribe();

      const observerInstance = mockResizeObserver.mock.results[0].value;
      expect(observerInstance.disconnect).toHaveBeenCalled();
    });
  });

  describe('trapFocus', () => {

    it.skip('should trap focus within container', () => {
      // Skipped due to jsdom limitations with focus simulation
      const container = document.createElement('div');
      const input1 = document.createElement('input');
      const input2 = document.createElement('input');
      const input3 = document.createElement('input');

      container.appendChild(input1);
      container.appendChild(input2);
      container.appendChild(input3);
      document.body.appendChild(container);

      // Make inputs focusable
      input1.tabIndex = 0;
      input2.tabIndex = 0;
      input3.tabIndex = 0;

      const releaseFocus = trapFocus(container);

      // Verify that focus method was called on the first element
      expect(HTMLElement.prototype.focus).toHaveBeenCalledWith();

      // Simulate Tab keydown on last element - should prevent default and focus first
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');
      Object.defineProperty(tabEvent, 'target', { value: input3 });

      input3.dispatchEvent(tabEvent);
      expect(preventDefaultSpy).toHaveBeenCalled();

      // Simulate Shift+Tab on first element - should prevent default and focus last
      const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
      const preventDefaultSpy2 = vi.spyOn(shiftTabEvent, 'preventDefault');
      Object.defineProperty(shiftTabEvent, 'target', { value: input1 });

      input1.dispatchEvent(shiftTabEvent);
      expect(preventDefaultSpy2).toHaveBeenCalled();

      releaseFocus();

      document.body.removeChild(container);
    });

    it('should handle containers with no focusable elements', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const releaseFocus = trapFocus(container);

      // Should not throw and return a function
      expect(typeof releaseFocus).toBe('function');

      releaseFocus();

      document.body.removeChild(container);
    });

    it.skip('should filter out hidden elements', () => {
      // Skipped due to jsdom limitations with focus simulation
      const container = document.createElement('div');
      const visibleInput = document.createElement('input');
      const hiddenInput = document.createElement('input');

      visibleInput.tabIndex = 0;
      hiddenInput.tabIndex = 0;
      hiddenInput.style.display = 'none'; // Hidden

      container.appendChild(visibleInput);
      container.appendChild(hiddenInput);
      document.body.appendChild(container);

      trapFocus(container);

      // Verify that focus was called on the visible input (not the hidden one)
      expect(HTMLElement.prototype.focus).toHaveBeenCalledWith();

      document.body.removeChild(container);
    });
  });

  describe('Backwards Compatibility', () => {
    it('should maintain existing fromDomEvent signature', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);

      // Old signature should still work
      const handler = fromDomEvent(button, 'click', { signal: new AbortController().signal });
      expect(typeof handler).toBe('function');

      document.body.removeChild(button);
    });

    it('should provide dom shortcuts as EventDescriptor factories', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);

      // All dom shortcuts should return EventDescriptor objects when given a handler
      const clickDescriptor = dom.click(() => {});
      expect(clickDescriptor).toEqual({
        type: 'click',
        handler: expect.any(Function),
        options: undefined
      });

      const inputDescriptor = dom.input(() => {});
      expect(inputDescriptor).toEqual({
        type: 'input',
        handler: expect.any(Function),
        options: undefined
      });

      const changeDescriptor = dom.change(() => {});
      expect(changeDescriptor).toEqual({
        type: 'change',
        handler: expect.any(Function),
        options: undefined
      });
      const wheelDescriptor = dom.wheel(() => {});
      expect(wheelDescriptor).toEqual({
        type: 'wheel',
        handler: expect.any(Function),
        options: undefined
      });

      const touchstartDescriptor = dom.touchstart(() => {});
      expect(touchstartDescriptor).toEqual({
        type: 'touchstart',
        handler: expect.any(Function),
        options: undefined
      });

      document.body.removeChild(button);
    });

    it('should maintain existing on signature', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);

      const unsubscribe = on(button, 'click', () => {}, { signal: new AbortController().signal });
      expect(typeof unsubscribe).toBe('function');

      document.body.removeChild(button);
    });
  });
});

// @vitest-environment jsdom