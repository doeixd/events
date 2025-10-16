import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
createEvent,
createSubject,
halt,
fromDomEvent,
dom,
subjectProperty,
subjectFromEvent,
on,
toEventDescriptor,
createTopic,
createPartition,
createAsyncSubject,
createSubjectStore,
combineLatest,
toEventDescriptor,
subjectToEventDescriptor,
DUMMY
} from '../src/index';

describe('@doeixd/events', () => {
  describe('createEvent', () => {
    it('should create event handler and emitter', () => {
      const [handler, emit] = createEvent<string>();

      expect(typeof handler).toBe('function');
      expect(typeof emit).toBe('function');
    });

    it('should emit and handle events', () => {
      const [handler, emit] = createEvent<string>();
      const mockCallback = vi.fn((data) => {
        if (typeof data === 'symbol') return; // Handle DUMMY symbol
        mockCallback.mockImplementation((data) => {
          expect(data).toBe('test message');
        });
      });

      handler(mockCallback);
      emit('test message');

      expect(mockCallback).toHaveBeenCalledTimes(2); // Called with DUMMY and actual data
    });

    it('should support typed events', () => {
      const [handler, emit] = createEvent<number>();

      handler((value) => {
        if (typeof value === 'symbol') return; // Handle DUMMY symbol
        expect(typeof value).toBe('number');
        expect(value).toBe(42);
      });

      emit(42);
    });

    it('should return unsubscribe function', () => {
      const [handler, emit] = createEvent<string>();
      const mockCallback = vi.fn((data) => {
        if (typeof data === 'symbol') return; // Handle DUMMY symbol
      });

      const unsubscribe = handler(mockCallback);
      expect(typeof unsubscribe).toBe('function');

      emit('first');
      expect(mockCallback).toHaveBeenCalledTimes(2);

      unsubscribe();
      emit('second');
      expect(mockCallback).toHaveBeenCalledTimes(2); // Should not be called again
    });
  });

  describe('Event Chaining and Transformation', () => {
    it('should transform event data', () => {
      const [onNumber, emitNumber] = createEvent<number>();
      const onMessage = onNumber((delta) => typeof delta === 'symbol' ? undefined : `Increment by ${delta}`);
      const mockCallback = vi.fn((data) => {
        if (typeof data === 'symbol') return;
        expect(data).toBe('Increment by 5');
      });

      onMessage(mockCallback);
      emitNumber(5);
    });

    it('should chain multiple transformations', () => {
      const [onNumber, emitNumber] = createEvent<number>();
      const onDoubled = onNumber((n) => typeof n === 'symbol' ? 0 : n * 2);
      const onMessage = onDoubled((n) => typeof n === 'symbol' ? '' : `Result: ${n}`);
      const mockCallback = vi.fn((data) => {
        if (typeof data === 'symbol') return;
        expect(data).toBe('Result: 6');
      });

      onMessage(mockCallback);
      emitNumber(3);
    });

    it('should handle async transformations', async () => {
      const [onValue, emitValue] = createEvent<string>();
      const onAsync = onValue(async (str) => {
        if (typeof str === 'symbol') return undefined;
        await Promise.resolve();
        return str.toUpperCase();
      });
      const mockCallback = vi.fn((data) => {
        if (typeof data === 'symbol') return;
        expect(data).toBe('HELLO');
      });

      onAsync(mockCallback);
      emitValue('hello');

      await new Promise(resolve => setTimeout(resolve, 0));
    });
  });

  describe('halt()', () => {
    it('should halt event propagation', () => {
      const [onNumber, emitNumber] = createEvent<number>();
      const onValid = onNumber((n) => typeof n === 'symbol' ? undefined : n >= 0 ? n : halt());
      const mockCallback = vi.fn((data) => {
        if (typeof data === 'symbol') return;
        expect(data).toBe(5);
      });

      onValid(mockCallback);

      emitNumber(5);
      emitNumber(-1); // Should halt
    });

    it('should be caught by halt symbol', () => {
      const [handler, emit] = createEvent<number>();
      const mockCallback = vi.fn((data) => {
        if (typeof data === 'symbol') return;
        expect(data).toBe(5);
      });

      handler((n) => {
        if (typeof n === 'symbol') return;
        if (n < 0) throw halt();
        mockCallback(n);
      });

      emit(5);
      expect(() => emit(-1)).not.toThrow();
    });
  });

  describe('createSubject', () => {
    it('should create a reactive subject', () => {
      const count = createSubject(0);
      const mockCallback = vi.fn();

      count.subscribe(mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(0);

      count(5);
      expect(mockCallback).toHaveBeenCalledWith(5);

      expect(count()).toBe(5);
    });

    it('should not emit undefined initially', () => {
      const subject = createSubject<number>();
      const mockCallback = vi.fn();

      subject.subscribe(mockCallback);
      expect(mockCallback).not.toHaveBeenCalled();

      subject(10);
      expect(mockCallback).toHaveBeenCalledWith(10);
    });

    it('should handle unsubscribe', () => {
      const subject = createSubject(0);
      const mockCallback = vi.fn();

      const unsubscribe = subject.subscribe(mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(0);

      subject(1);
      expect(mockCallback).toHaveBeenCalledWith(1);

      unsubscribe();
      subject(2);
      expect(mockCallback).toHaveBeenCalledTimes(2); // Should not be called again
    });
  });

  describe('SolidJS-style createSubject', () => {
    it('should create subject from event handlers', () => {
      const [onIncrement, emitIncrement] = createEvent<number>();
      const [onReset, emitReset] = createEvent();

      const count = createSubject(0,
        onIncrement((delta) => (current) => current + delta),
        onReset(() => 0)
      );

      emitIncrement(5);
      expect(count()).toBe(5);

      emitReset();
      expect(count()).toBe(0);
    });

    it('should support initial function', () => {
      const count = createSubject(() => 10);
      expect(count()).toBe(10);
    });
  });

  describe('createAsyncSubject', () => {
    it('should handle async initial values', async () => {
      const subject = createAsyncSubject(
        async () => {
          await Promise.resolve();
          return 'loaded';
        },
        vi.fn() // mock handler
      );

      const mockCallback = vi.fn();
      subject.subscribe(mockCallback);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockCallback).toHaveBeenCalledWith('loaded');
    });

    it('should apply updates after loading', async () => {
      const [onUpdate, emitUpdate] = createEvent<string>();

      const subject = createAsyncSubject(
        async () => 'initial',
        onUpdate((newValue) => (current) => newValue)
      );

      const mockCallback = vi.fn();
      subject.subscribe(mockCallback);

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockCallback).toHaveBeenCalledWith('initial');

      emitUpdate('updated');
      expect(subject()).toBe('updated');
    });
  });

  describe('createSubjectStore', () => {
    it('should create mutable store', () => {
      const [onIncrement, emitIncrement] = createEvent<number>();
      const store = createSubjectStore({ count: 0 },
        onIncrement((delta) => (state) => {
          state.count += delta;
        })
      );

      const mockCallback = vi.fn();
      store.subscribe(mockCallback);

      emitIncrement(5);
      expect(store().count).toBe(5);
    });
  });

  describe('createTopic', () => {
    it('should merge multiple handlers', () => {
      const [onA, emitA] = createEvent<string>();
      const [onB, emitB] = createEvent<string>();

      const topic = createTopic(
        onA((msg) => `A: ${msg}`),
        onB((msg) => `B: ${msg}`)
      );

      const mockCallback = vi.fn();
      topic(mockCallback);

      emitA('hello');
      expect(mockCallback).toHaveBeenCalledWith('A: hello');

      emitB('world');
      expect(mockCallback).toHaveBeenCalledWith('B: world');
    });
  });

  describe('createPartition', () => {
    it('should split events based on predicate', () => {
      const [onNumber, emitNumber] = createEvent<number>();
      const [onPositive, onNegative] = createPartition(onNumber, (n) => n >= 0);

      const positiveCallback = vi.fn();
      const negativeCallback = vi.fn();

      onPositive((value) => { if (value === 'dummy') return; positiveCallback(value); });
      onNegative((value) => { if (value === 'dummy') return; negativeCallback(value); });

      emitNumber(5);
      expect(positiveCallback).toHaveBeenCalledWith(5);
      expect(negativeCallback).not.toHaveBeenCalled();

      emitNumber(-3);
      expect(negativeCallback).toHaveBeenCalledWith(-3);
      expect(positiveCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('DOM utilities', () => {
    let mockElement: HTMLElement;

    beforeEach(() => {
      const listeners: { [key: string]: Function } = {};
      mockElement = {
        addEventListener: vi.fn((event, listener) => {
          listeners[event] = listener;
        }),
        removeEventListener: vi.fn((event, listener) => {
          if (listeners[event] === listener) delete listeners[event];
        }),
        dispatchEvent: vi.fn((ev) => {
          if (listeners[ev.type]) listeners[ev.type](ev);
        }),
      } as any;
    });

    it('should create DOM event handler', () => {
      const handler = fromDomEvent(mockElement, 'click');
      const mockCallback = vi.fn();

      handler(mockCallback);

      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        undefined
      );
    });

    it('should provide shortcuts', () => {
      const clickHandler = dom.click(mockElement);
      expect(typeof clickHandler).toBe('function');
    });

    it('should create reactive DOM properties', () => {
    const valueSubject = subjectProperty(mockElement as any, 'value');
    const mockCallback = vi.fn();

    valueSubject.subscribe(mockCallback);

    // Simulate DOM event
    (mockElement as any).value = 'new value';
    mockElement.dispatchEvent(new Event('input'));

    expect(valueSubject()).toBe('new value');
    });
  });

  describe('Remix Bridge', () => {
    it('should convert handler to EventDescriptor', () => {
      const [handler] = createEvent<string>();
      const descriptor = toEventDescriptor(handler, 'custom-event');

      expect(descriptor).toHaveProperty('type', 'custom-event');
      expect(descriptor).toHaveProperty('handler');
      expect(typeof descriptor.handler).toBe('function');
    });

    it('should convert subject to EventDescriptor', () => {
      const subject = createSubject('initial');
      const descriptor = subjectToEventDescriptor(subject, 'subject-event');

      expect(descriptor).toHaveProperty('type', 'subject-event');
      expect(descriptor).toHaveProperty('handler');
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety with generics', () => {
      const [stringHandler, stringEmit] = createEvent<string>();
      const [numberHandler, numberEmit] = createEvent<number>();

      // TypeScript should prevent this:
      // stringHandler((value: number) => {}); // Error
      // numberEmit('string'); // Error

      stringHandler((value) => {
        if (typeof value === 'symbol') return;
        expect(typeof value).toBe('string');
      });

      numberHandler((value) => {
        if (typeof value === 'symbol') return;
        expect(typeof value).toBe('number');
      });

      stringEmit('test');
      numberEmit(42);
    });

    it('should infer chained types correctly', () => {
    const [handler, emit] = createEvent<number>();
    const doubled = handler((n) => typeof n === 'symbol' ? 0 : n * 2);
    const stringified = doubled((n) => typeof n === 'symbol' ? '' : `Result: ${n}`);

    stringified((result) => {
    if (typeof result === 'symbol') return;
    expect(typeof result).toBe('string');
    expect(result).toBe('Result: 10');
    });

    emit(5);
    });
  });



  describe('Edge Cases', () => {
    it('should handle null and undefined values in events', () => {
      const [handler, emit] = createEvent<string | null | undefined>(null);

      let received: string | null | undefined = 'initial';

      handler((value) => {
        if (value === 'dummy') return;
        received = value;
      });

      emit(null);
      expect(received).toBe(null);

      emit('test');
      expect(received).toBe('test');
    });

    it('should handle complex objects and arrays', () => {
      const [handler, emit] = createEvent<{ data: number[]; meta: string }>();

      let received: { data: number[]; meta: string } | undefined;

      handler((value) => {
        if (typeof value === 'symbol') return;
        received = value;
      });

      const testObj = { data: [1, 2, 3], meta: 'test' };
      emit(testObj);
      expect(received).toEqual(testObj);
    });

    it('should handle large numbers and special values', () => {
      const [handler, emit] = createEvent<number>();

      let received: number | undefined;

      handler((value) => {
        if (typeof value === 'symbol') return;
        received = value;
      });

      emit(Number.MAX_SAFE_INTEGER);
      expect(received).toBe(Number.MAX_SAFE_INTEGER);

      emit(Infinity);
      expect(received).toBe(Infinity);

      emit(NaN);
      expect(isNaN(received)).toBe(true);
    });

    it('should handle subjects with complex initial values', () => {
      const initialObj = { count: 0, list: [1, 2, 3] };
      const subject = createSubject(initialObj);

      expect(subject()).toEqual(initialObj);

      subject({ count: 1, list: [4, 5, 6] });
      expect(subject()).toEqual({ count: 1, list: [4, 5, 6] });
    });

    it('should handle function initial values in subjects', () => {
      const subject = createSubject(() => ({ value: 42 }));

      expect(subject()).toEqual({ value: 42 });
    });

    it('should handle halt in complex chaining', () => {
      const [onNumber, emitNumber] = createEvent<number>();

      let callCount = 0;

      const onProcessed = onNumber((n) => {
        if (n === 'dummy') return 0;
        callCount++;
        if (n < 0) halt();
        return n * 2;
      });

      const onFinal = onProcessed((n) => {
        if (typeof n === 'symbol') return '';
        callCount++;
        return `Result: ${n}`;
      });

      let received: string | undefined;

      onFinal((value) => {
        if (value === 'dummy') return;
        received = value;
      });

      emitNumber(5);
      expect(callCount).toBe(3);
      expect(received).toBe('Result: 10');

      callCount = 0;
      received = undefined;
      emitNumber(-1);
      expect(callCount).toBe(1); // Only first handler called
      expect(received).toBeUndefined();
    });

    it('should handle unsubscribe in chained handlers', () => {
      const [onEvent, emitEvent] = createEvent<string>();

      const onTransformed = onEvent((msg) => {
        if (msg === 'dummy') return '';
        return msg.toUpperCase();
      });

      const mockCallback = vi.fn();
      const unsubscribe = onTransformed((value) => {
        if (value === 'dummy') return;
        mockCallback(value);
      });

      emitEvent('hello');
      expect(mockCallback).toHaveBeenCalledWith('HELLO');

      unsubscribe();
      emitEvent('world');
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple subscribers on subjects', () => {
      const subject = createSubject(0);

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      subject.subscribe(callback1);
      subject.subscribe(callback2);

      subject(5);
      expect(callback1).toHaveBeenCalledWith(5);
      expect(callback2).toHaveBeenCalledWith(5);
    });

    it('should handle subject dispose', () => {
      const subject = createSubject(0);

      const callback = vi.fn();
      subject.subscribe(callback);

      subject(1);
      expect(callback).toHaveBeenCalledWith(1);

      subject.dispose();
      subject(2);
      expect(callback).toHaveBeenCalledTimes(2); // No more calls after dispose
    });
  });

  describe('Integration Tests', () => {
    it('should integrate events with subjects', () => {
      const [onIncrement, emitIncrement] = createEvent<number>();
      const [onReset, emitReset] = createEvent();

      const count = createSubject(0,
        onIncrement((delta) => (current) => current + delta),
        onReset(() => 0)
      );

      expect(count()).toBe(0);

      emitIncrement(5);
      expect(count()).toBe(5);

      emitIncrement(3);
      expect(count()).toBe(8);

      emitReset();
      expect(count()).toBe(0);
    });

    it('should integrate DOM events with subjects', () => {
      const mockElement = {
        listeners: {} as any,
        addEventListener: vi.fn((event: string, listener: any) => { mockElement.listeners[event] = listener; }),
        removeEventListener: vi.fn((event: string) => { delete mockElement.listeners[event]; }),
        dispatchEvent: vi.fn((event: any) => { if (mockElement.listeners[event.type]) mockElement.listeners[event.type](event); }),
      } as any;

      const clickHandler = fromDomEvent(mockElement, 'click');
      const clickCount = createSubject(0);

      clickHandler(() => {
        clickCount(clickCount() + 1);
      });

      expect(mockElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function), undefined);

      // Simulate click
      const clickEvent = new Event('click');
      mockElement.dispatchEvent(clickEvent);

      expect(clickCount()).toBe(1);
    });

    it('should integrate with subjectProperty', () => {
      const mockElement = {
        listeners: {} as any,
        addEventListener: vi.fn((event: string, listener: any) => { mockElement.listeners[event] = listener; }),
        removeEventListener: vi.fn((event: string) => { delete mockElement.listeners[event]; }),
        dispatchEvent: vi.fn((event: any) => { if (mockElement.listeners[event.type]) mockElement.listeners[event.type](event); }),
        value: 'initial'
      } as any;

      const valueSubject = subjectProperty(mockElement, 'value');

      expect(valueSubject()).toBe('initial');

      mockElement.value = 'updated';
      mockElement.dispatchEvent(new Event('input'));

      expect(valueSubject()).toBe('updated');
    });

    it('should integrate multiple event types', () => {
      const [onAction, emitAction] = createEvent<{ type: string; payload: any }>();

      const state = createSubject({ count: 0, messages: [] as string[] },
        onAction((action) => {
          if (typeof action === 'symbol') return;
          return (current) => {
            if (action.type === 'increment') {
              return { ...current, count: current.count + action.payload };
            }
            if (action.type === 'addMessage') {
              return { ...current, messages: [...current.messages, action.payload] };
            }
            return current;
          };
        })
      );

      emitAction({ type: 'increment', payload: 5 });
      expect(state().count).toBe(5);

      emitAction({ type: 'addMessage', payload: 'Hello' });
      expect(state().messages).toEqual(['Hello']);

      emitAction({ type: 'increment', payload: 3 });
      expect(state().count).toBe(8);
      expect(state().messages).toEqual(['Hello']);
    });

    it('should integrate async subjects with events', async () => {
      const [onLoad, emitLoad] = createEvent<null>(null);

      const data = createAsyncSubject(
        async () => ({ items: [1, 2, 3] }),
        onLoad(() => ({ items: [4, 5, 6] }))
      );

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(data()).toEqual({ items: [1, 2, 3] });

      emitLoad(null);
      expect(data()).toEqual({ items: [4, 5, 6] });
    });
  });

  describe('Advanced Core Functionality', () => {
    it('should handle complex async chaining', async () => {
      const [onValue, emitValue] = createEvent<number>();

      const onAsync = onValue(async (n) => {
        if (typeof n === 'symbol') return 0;
        await Promise.resolve();
        return n * 2;
      });

      const onFinal = onAsync(async (n) => {
        if (n === 'dummy') return '';
        await Promise.resolve();
        return `Async result: ${n}`;
      });

      let received: string | undefined;

      onFinal((value) => {
        if (value === 'dummy') return;
        received = value;
      });

      emitValue(5);

      await Promise.resolve();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(received).toBe('Async result: 10');
    });

    it('should handle createTopic with multiple event types', () => {
      const [onA, emitA] = createEvent<string>();
      const [onB, emitB] = createEvent<number>();

      const topic = createTopic(
        onA((msg) => `A: ${msg}`),
        onB((num) => `B: ${num}`)
      );

      const received: string[] = [];
      topic((value) => {
        if (value === 'dummy') return;
        received.push(value);
      });

      emitA('hello');
      expect(received).toEqual(['A: hello']);

      emitB(42);
      expect(received).toEqual(['A: hello', 'B: 42']);
    });

    it('should handle createPartition correctly', () => {
      const [onNumber, emitNumber] = createEvent<number>();

      const [onPositive, onNegative] = createPartition(onNumber, (n) => {
        if (n === 'dummy') return false; // Treat dummy as negative for test
        return n >= 0;
      });

      const positiveValues: number[] = [];
      const negativeValues: number[] = [];

      onPositive((value) => {
        if (value === 'dummy') return;
        positiveValues.push(value);
      });

      onNegative((value) => {
        if (value === 'dummy') return;
        negativeValues.push(value);
      });

      emitNumber(5);
      emitNumber(-3);
      emitNumber(0);
      emitNumber(10);

      expect(positiveValues).toEqual([5, 0, 10]);
      expect(negativeValues).toEqual([-3]);
    });

    it('should handle halting in async event chains', async () => {
      const [onValue, emitValue] = createEvent<number>();

      const onAsync = onValue(async (n) => {
        await Promise.resolve();
        if (n < 0) halt();
        return n * 2;
      });

      const onFinal = onAsync((n) => `Result: ${n}`);

      let received: string | undefined;

      onFinal((value) => {
        received = value;
      });

      // Emit positive value
      emitValue(5);
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(received).toBe('Result: 10');

      // Reset
      received = undefined;

      // Emit negative value, should halt
      emitValue(-1);
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(received).toBeUndefined();
    });

    it('should handle toEventDescriptor', () => {
      const [onEvent, emitEvent] = createEvent<string>();

      const descriptor = toEventDescriptor(onEvent, 'custom-event');

      expect(descriptor).toHaveProperty('type', 'custom-event');
      expect(descriptor).toHaveProperty('handler');
      expect(typeof descriptor.handler).toBe('function');
    });

    it('should handle createSubjectStore with complex mutations', () => {
      const initialState = { users: [{ id: 1, name: 'Alice' }], settings: { theme: 'light' } };

      const store = createSubjectStore(initialState);

      const [onAddUser, emitAddUser] = createEvent<{ id: number; name: string }>();
      const [onChangeTheme, emitChangeTheme] = createEvent<string>();

      createSubjectStore(store,
        onAddUser((user) => (state) => {
          state.users.push(user);
        }),
        onChangeTheme((theme) => (state) => {
          state.settings.theme = theme;
        })
      );

      expect(store()).toEqual(initialState);

      emitAddUser({ id: 2, name: 'Bob' });
      expect(store().users).toEqual([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);

      emitChangeTheme('dark');
      expect(store().settings.theme).toBe('dark');
    });

    it('should handle combineLatest with multiple handlers', () => {
      const [onA, emitA] = createEvent<string>();
      const [onB, emitB] = createEvent<number>();
      const [onC, emitC] = createEvent<boolean>();

      const combined = combineLatest(onA, onB, onC);

      const received: [string, number, boolean][] = [];

      combined((values) => {
        if (values.some(v => v === 'dummy')) return;
        received.push(values as [string, number, boolean]);
      });

      emitA('hello');
      expect(received).toEqual([]);

      emitB(42);
      expect(received).toEqual([]);

      emitC(true);
      expect(received).toEqual([['hello', 42, true]]);

      emitA('world');
      expect(received).toEqual([['hello', 42, true], ['world', 42, true]]);
    });

    it('should handle nested subjects and events', () => {
      const parentSubject = createSubject({ child: createSubject(0) });

      const [onUpdate, emitUpdate] = createEvent<number>();

      createSubject(parentSubject,
        onUpdate((delta) => (current) => {
          current.child(current.child() + delta);
          return current;
        })
      );

      expect(parentSubject().child()).toBe(0);

      emitUpdate(5);
      expect(parentSubject().child()).toBe(5);

      emitUpdate(3);
      expect(parentSubject().child()).toBe(8);
    });

    it('should handle async operations', async () => {
      const [onValue, emitValue] = createEvent<number>();

      const onAsync = onValue(async (n) => {
        if (n === 'dummy') return;
        await Promise.resolve();
        return n * 2;
      });

      let received: number | undefined;

      onAsync((value) => {
        if (value === 'dummy') return;
        received = value;
      });

      emitValue(5);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(received).toBe(10);
    });
  });
});

// @vitest-environment jsdom
describe('DOM Utilities', () => {
  it('should handle fromDomEvent', () => {
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

  it('should handle dom.click shortcut', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    const clickHandler = dom.click(button);
    let clicked = false;

    clickHandler(() => {
      clicked = true;
    });

    button.click();
    expect(clicked).toBe(true);

    document.body.removeChild(button);
  });

  it('should handle subjectProperty', () => {
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

  it('should handle subjectFromEvent', () => {
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

  it('should handle on for multiple elements', () => {
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
});
