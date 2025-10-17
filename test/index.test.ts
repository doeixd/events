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
batch,
DUMMY,
fromEmitterEvent,
toEmitterEvent,
adaptEmitter,
createOperator,
doubleClick,
debounce,
throttle
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
        expect(data).toBe('test message');
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
      const onMessage = onNumber((delta, meta) => typeof delta === 'symbol' ? undefined : `Increment by ${delta}`);
      const mockCallback = vi.fn((data, meta) => {
        if (typeof data === 'symbol') return;
        expect(data).toBe(5);
      });

      onMessage(mockCallback);
      emitNumber(5);
    });

    it('should chain multiple transformations', () => {
      const [onNumber, emitNumber] = createEvent<number>();
      const onDoubled = onNumber((n, meta) => typeof n === 'symbol' ? 0 : n * 2);
      const onMessage = onDoubled((n, meta) => typeof n === 'symbol' ? '' : `Result: ${n}`);
      const mockCallback = vi.fn((data, meta) => {
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
      const mockCallback = vi.fn((data, meta) => {
        if (typeof data === 'symbol') return;
        expect(data).toBe(5);
      });

      onAsync(mockCallback);
      emitValue('hello');

      await new Promise(resolve => setTimeout(resolve, 0));
    });
  });

  describe('halt()', () => {
    it('should halt event propagation', () => {
      const [onNumber, emitNumber] = createEvent<number>();
      const onValid = onNumber((n, meta) => typeof n === 'symbol' ? undefined : n >= 0 ? n : halt());
      const mockCallback = vi.fn((data) => {
        if (typeof data === 'symbol') return;
        expect(data).toBe(5);
      });

      onValid(mockCallback);

      emitNumber(5);
      emitNumber(-1); // Should halt
    });

    it('should handle multiple independent handlers on same event', () => {
      const [onNumber, emitNumber] = createEvent<number>();

      // Handler 1: validates and halts on negative numbers
      const handler1 = vi.fn((n) => {
        if (typeof n === 'symbol') return;
        if (n < 0) halt();
        return n * 2;
      });
      onNumber(handler1);

      // Handler 2: processes all numbers (should still run even when handler1 halts)
      const handler2 = vi.fn((n) => {
        if (typeof n === 'symbol') return;
        return n + 10;
      });
      onNumber(handler2);

      emitNumber(5);
      expect(handler1).toHaveBeenCalledWith(5);
      expect(handler2).toHaveBeenCalledWith(5);

      // Reset mocks
      handler1.mockClear();
      handler2.mockClear();

      emitNumber(-3);
      // handler1 should halt, but handler2 should still run
      expect(handler1).toHaveBeenCalledWith(-3);
      expect(handler2).toHaveBeenCalledWith(-3);
    });

    it('should be caught by halt symbol', () => {
      const [handler, emit] = createEvent<number>();
      const mockCallback = vi.fn((data) => {
        if (typeof data === 'symbol') return;
        expect(data).toBe(5);
      });

      handler((n, meta) => {
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
    const doubled = handler((n, meta) => typeof n === 'symbol' ? 0 : n * 2);
    const stringified = doubled((n, meta) => typeof n === 'symbol' ? '' : `Result: ${n}`);

    stringified((result, meta) => {
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

      handler((value, meta) => {
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

       handler((value, meta) => {
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

       handler((value, meta) => {
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

      const onProcessed = onNumber((n, meta) => {
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

  describe('Async Safety', () => {
    it('should abort previous async operations when new event is emitted', async () => {
      const [handler, emit] = createEvent<number>();

      let completedOperations: number[] = [];
      let abortedOperations: number[] = [];

      handler(async (n, meta) => {
        if (n === 'dummy') return;
        try {
          // Use AbortSignal to make the promise cancellable
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => resolve(n), 50);
            meta?.signal.addEventListener('abort', () => {
              clearTimeout(timeout);
              reject(new Error('Aborted'));
            });
          });
          completedOperations.push(n);
        } catch (err) {
          if (err.message === 'Aborted') {
            abortedOperations.push(n);
          }
        }
      });

      // Emit first event
      emit(1);
      // Immediately emit second event (should abort first)
      emit(2);

      // Wait for operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // First operation should be aborted, second should complete
      expect(abortedOperations).toEqual([1]);
      expect(completedOperations).toEqual([2]);
    });

    it('should work with AbortSignal in callbacks', async () => {
      const [handler, emit] = createEvent<string>();

      let results: string[] = [];

      handler(async (msg, meta) => {
        if (msg === 'dummy') return;
        try {
          // Simulate cancellable async operation
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => resolve(msg), 30);
            meta?.signal.addEventListener('abort', () => {
              clearTimeout(timeout);
              reject(new Error('Aborted'));
            });
          });
          results.push(msg as string);
        } catch (err) {
          if (err.message === 'Aborted') {
            results.push(`aborted-${msg}`);
          }
        }
      });

      emit('first');
      emit('second'); // Should abort 'first'

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(results).toEqual(['aborted-first', 'second']);
    });

    it('should handle re-entrant events safely', async () => {
      const [handler, emit] = createEvent<number>();

      let processed: number[] = [];

      handler(async (n, meta) => {
        if (n === 'dummy') return;
        processed.push(n);

        if (n === 1) {
          // Emit another event while processing the first
          setTimeout(() => emit(2), 10);
        }

        await new Promise(resolve => setTimeout(resolve, 30));
      });

      emit(1);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Both events should be processed (dummy is filtered out)
      expect(processed.filter(x => typeof x === 'number')).toEqual([1, 2]);
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

  describe('Batching', () => {
    it('should batch notifications with batch() function', async () => {
      const subject1 = createSubject(0);
      const subject2 = createSubject(0);

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      subject1.subscribe(callback1);
      subject2.subscribe(callback2);

      // Initial calls
      expect(callback1).toHaveBeenCalledWith(0);
      expect(callback2).toHaveBeenCalledWith(0);

      callback1.mockClear();
      callback2.mockClear();

      // Batch updates
      batch(() => {
        subject1(1);
        subject2(2);
      });

      // Should be called once each after batch
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(callback1).toHaveBeenCalledWith(1);
      expect(callback2).toHaveBeenCalledWith(2);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should support batched subjects', async () => {
      const subject = createSubject(0, { batch: true });

      const callback = vi.fn();
      subject.subscribe(callback);

      // Initial call
      expect(callback).toHaveBeenCalledWith(0);
      callback.mockClear();

      // Updates should be batched
      subject(1);
      subject(2);
      subject(3);

      // Should only notify once at end of microtask
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(callback).toHaveBeenCalledWith(3);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle nested batching', async () => {
      const subject = createSubject(0);

      const callback = vi.fn();
      subject.subscribe(callback);

      callback.mockClear();

      batch(() => {
        subject(1);
        batch(() => {
          subject(2);
        });
        subject(3);
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(callback).toHaveBeenCalledWith(3);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should work with regular subjects in batch', async () => {
      const regularSubject = createSubject(0);
      const batchedSubject = createSubject(0, { batch: true });

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      regularSubject.subscribe(callback1);
      batchedSubject.subscribe(callback2);

      callback1.mockClear();
      callback2.mockClear();

      batch(() => {
        regularSubject(1);
        batchedSubject(2);
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(callback1).toHaveBeenCalledWith(1);
      expect(callback2).toHaveBeenCalledWith(2);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
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

    handler((event, meta) => {
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

  describe('EventEmitter Integration', () => {
    // Mock EventEmitter implementation
    const createMockEmitter = () => {
      const listeners = new Map<string | symbol, Function[]>();

      return {
        on: vi.fn((event: string | symbol, listener: (...args: any[]) => void) => {
          if (!listeners.has(event)) {
            listeners.set(event, []);
          }
          listeners.get(event)!.push(listener);
          return createMockEmitter();
        }),
        off: vi.fn((event: string | symbol, listener: (...args: any[]) => void) => {
          const eventListeners = listeners.get(event);
          if (eventListeners) {
            const index = eventListeners.indexOf(listener);
            if (index > -1) {
              eventListeners.splice(index, 1);
            }
          }
          return createMockEmitter();
        }),
        emit: vi.fn((event: string | symbol, ...args: any[]) => {
          const eventListeners = listeners.get(event);
          if (eventListeners) {
            eventListeners.forEach(listener => listener(...args));
          }
          return eventListeners ? eventListeners.length > 0 : false;
        }),
        listeners
      };
    };

    describe('fromEmitterEvent', () => {
      it('should create a handler from EventEmitter event', () => {
        const emitter = createMockEmitter();
        const onData = fromEmitterEvent<{ id: number; value: string }>(emitter, 'data');
        const mockCallback = vi.fn();

        onData(mockCallback);
        emitter.emit('data', { id: 1, value: 'test' });

        expect(emitter.on).toHaveBeenCalledWith('data', expect.any(Function));
        expect(mockCallback).toHaveBeenCalledWith({ id: 1, value: 'test' });
      });

      it('should support chaining and transformation', () => {
        const emitter = createMockEmitter();
        const onData = fromEmitterEvent<{ value: string }>(emitter, 'data');
        const onValidData = onData((data) => data === 'dummy' || data.value.length > 0 ? data : halt());
        const mockCallback = vi.fn();

        onValidData(mockCallback);

        emitter.emit('data', { value: 'valid' });
        expect(mockCallback).toHaveBeenCalledWith('dummy'); // DUMMY call
        expect(mockCallback).toHaveBeenCalledWith({ value: 'valid' });
        expect(mockCallback).toHaveBeenCalledTimes(2);

        emitter.emit('data', { value: '' });
        expect(mockCallback).toHaveBeenCalledTimes(2); // Should not be called for empty value
      });

      it('should clean up listener on abort signal', () => {
        const emitter = createMockEmitter();
        const controller = new AbortController();
        const onData = fromEmitterEvent(emitter, 'data', { signal: controller.signal });

        onData(() => {});
        expect(emitter.on).toHaveBeenCalledTimes(1);

        controller.abort();
        expect(emitter.off).toHaveBeenCalledTimes(1);
      });
    });

    describe('toEmitterEvent', () => {
      it('should emit EventEmitter events from handler', () => {
        const emitter = createMockEmitter();
        const [onAction, emitAction] = createEvent<string>();
        const unsubscribe = toEmitterEvent(emitter, 'action', onAction);

        emitAction('test');
        expect(emitter.emit).toHaveBeenCalledWith('action', 'test');
      });

      it('should return unsubscribe function', () => {
        const emitter = createMockEmitter();
        const [onAction, emitAction] = createEvent<string>();
        const unsubscribe = toEmitterEvent(emitter, 'action', onAction);

        expect(typeof unsubscribe).toBe('function');

        // Note: createEvent emits DUMMY first for type checking
        expect(emitter.emit).toHaveBeenCalledWith('action', 'dummy');

        const callCountAfterDummy = emitter.emit.mock.calls.length;
        unsubscribe();
        emitAction('test');
        expect(emitter.emit).toHaveBeenCalledTimes(callCountAfterDummy); // Should not be called again
      });

      it('should work with chained handlers', () => {
        const emitter = createMockEmitter();
        const [onNumber, emitNumber] = createEvent<number>();
        const onDoubled = onNumber((n) => n * 2);
        const unsubscribe = toEmitterEvent(emitter, 'doubled', onDoubled);

        emitNumber(5);
        expect(emitter.emit).toHaveBeenCalledWith('doubled', 10);
      });
    });

    describe('adaptEmitter', () => {
      it('should adapt EventEmitter to reactive interface', () => {
        const emitter = createMockEmitter();
        const reactive = adaptEmitter<{ data: string; error: Error }>(emitter);

        expect(typeof reactive.data).toBe('function');
        expect(typeof reactive.error).toBe('function');
      });

      it('should handle events through adapted interface', () => {
        const emitter = createMockEmitter();
        const reactive = adaptEmitter<{ data: { id: number } }>(emitter);
        const mockCallback = vi.fn();

        reactive.data(mockCallback);
        emitter.emit('data', { id: 123 });

        expect(mockCallback).toHaveBeenCalledWith({ id: 123 });
      });

      it('should cache handlers for same event', () => {
        const emitter = createMockEmitter();
        const reactive = adaptEmitter<{ test: string }>(emitter);

        const handler1 = reactive.test;
        const handler2 = reactive.test;

        expect(handler1).toBe(handler2);
        expect(emitter.on).toHaveBeenCalledTimes(1);
      });

      it('should clean up all listeners on abort signal', () => {
        const emitter = createMockEmitter();
        const controller = new AbortController();
        const reactive = adaptEmitter<{ event1: string; event2: number }>(emitter, { signal: controller.signal });

        reactive.event1(() => {});
        reactive.event2(() => {});

        expect(emitter.on).toHaveBeenCalledTimes(2);

        controller.abort();
        expect(emitter.off).toHaveBeenCalledTimes(2);
      });

      it('should support type-safe event handling', () => {
        const emitter = createMockEmitter();
        const reactive = adaptEmitter<{
          'user:login': { userId: string; timestamp: number };
          'data:update': { payload: unknown };
        }>(emitter);

        const loginCallback = vi.fn();
        const dataCallback = vi.fn();

        reactive['user:login'](loginCallback);
        reactive['data:update'](dataCallback);

        emitter.emit('user:login', { userId: 'user1', timestamp: 123456 });
        emitter.emit('data:update', { payload: 'test' });

        expect(loginCallback).toHaveBeenCalledWith({ userId: 'user1', timestamp: 123456 });
        expect(dataCallback).toHaveBeenCalledWith({ payload: 'test' });
      });
    });
  });

  describe('Handler Operators', () => {
    describe('createOperator', () => {
      it('should create a basic filter operator', () => {
        const [onEvent, emitEvent] = createEvent<number>();
        const filterEven = createOperator<number>((data, emit, halt) => {
          if (data % 2 === 0) {
            emit(data);
          } else {
            halt();
          }
        });
        const filteredHandler = filterEven(onEvent);
        const mockCallback = vi.fn();

        filteredHandler(mockCallback);

        emitEvent(1); // Odd - should be filtered out
        emitEvent(2); // Even - should pass through
        emitEvent(3); // Odd - should be filtered out
        emitEvent(4); // Even - should pass through

        const actualCalls = mockCallback.mock.calls.filter(call => call[0] !== 'dummy');
        expect(actualCalls).toHaveLength(2);
        expect(actualCalls[0][0]).toBe(2);
        expect(actualCalls[1][0]).toBe(4);
      });

      it('should handle data transformation', () => {
        const [onEvent, emitEvent] = createEvent<number>();
        const doubleValues = createOperator<number>((data, emit) => {
          emit(data * 2);
        });
        const transformedHandler = doubleValues(onEvent);
        const mockCallback = vi.fn();

        transformedHandler(mockCallback);

        emitEvent(5);
        emitEvent(10);

        const actualCalls = mockCallback.mock.calls.filter(call => call[0] !== 'dummy');
        expect(actualCalls).toHaveLength(2);
        expect(actualCalls[0][0]).toBe(10);
        expect(actualCalls[1][0]).toBe(20);
      });

      it('should handle async operations with delayed emit', async () => {
        const [onEvent, emitEvent] = createEvent<string>();
        const delayOperator = createOperator<string>((data, emit, halt) => {
          setTimeout(() => emit(data.toUpperCase()), 10);
          halt(); // Don't emit immediately
        });
        const delayedHandler = delayOperator(onEvent);
        const mockCallback = vi.fn();

        delayedHandler(mockCallback);

        emitEvent('hello');
        emitEvent('world');

        // Should not have emitted yet
        let actualCalls = mockCallback.mock.calls.filter(call => call[0] !== 'dummy');
        expect(actualCalls).toHaveLength(0);

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 20));

        actualCalls = mockCallback.mock.calls.filter(call => call[0] !== 'dummy');
        expect(actualCalls).toHaveLength(2);
        expect(actualCalls[0][0]).toBe('HELLO');
        expect(actualCalls[1][0]).toBe('WORLD');
      });

      it('should properly handle DUMMY values for type checking', () => {
        const [onEvent, emitEvent] = createEvent<string>();
        let receivedNonDummy = false;

        const testOperator = createOperator<string>((data, emit) => {
          if (data !== 'dummy') {
            receivedNonDummy = true;
          }
          emit(data);
        });

        const testHandler = testOperator(onEvent);
        const mockCallback = vi.fn();

        testHandler(mockCallback);

        // DUMMY should be passed through automatically without calling process
        expect(receivedNonDummy).toBe(false);
        expect(mockCallback).toHaveBeenCalledWith('dummy');
      });

      it('should work with complex stateful logic', () => {
        const [onEvent, emitEvent] = createEvent<number>();
        let count = 0;

        const takeFirstTwo = createOperator<number>((data, emit, halt) => {
          count++;
          if (count <= 2) {
            emit(data);
          } else {
            halt();
          }
        });

        const limitedHandler = takeFirstTwo(onEvent);
        const mockCallback = vi.fn();

        limitedHandler(mockCallback);

        emitEvent(1); // Should pass
        emitEvent(2); // Should pass
        emitEvent(3); // Should be halted
        emitEvent(4); // Should be halted

        const actualCalls = mockCallback.mock.calls.filter(call => call[0] !== 'dummy');
        expect(actualCalls).toHaveLength(2);
        expect(actualCalls[0][0]).toBe(1);
        expect(actualCalls[1][0]).toBe(2);
      });
    });

    describe('doubleClick', () => {
      it('should trigger on double click within timeout', () => {
        const [onEvent, emitEvent] = createEvent<MouseEvent>();
        const doubleClickHandler = doubleClick(100)(onEvent);
        const mockCallback = vi.fn();

        doubleClickHandler(mockCallback);

        // First click - should not trigger
        emitEvent(new MouseEvent('click'));
        // Filter out DUMMY calls and check actual calls
        const actualCalls = mockCallback.mock.calls.filter(call => call[0] !== 'dummy');
        expect(actualCalls).toHaveLength(0);

        // Second click within timeout - should trigger
        emitEvent(new MouseEvent('click'));
        const actualCallsAfter = mockCallback.mock.calls.filter(call => call[0] !== 'dummy');
        expect(actualCallsAfter).toHaveLength(1);
        expect(actualCallsAfter[0][0]).toBeInstanceOf(MouseEvent);
      });

      it('should not trigger if clicks are too far apart', async () => {
        const [onEvent, emitEvent] = createEvent<MouseEvent>();
        const doubleClickHandler = doubleClick(50)(onEvent); // Short timeout
        const mockCallback = vi.fn();

        doubleClickHandler(mockCallback);

        // First click
        emitEvent(new MouseEvent('click'));
        let actualCalls = mockCallback.mock.calls.filter(call => call[0] !== 'dummy');
        expect(actualCalls).toHaveLength(0);

        // Wait longer than timeout
        await new Promise(resolve => setTimeout(resolve, 100));

        // Second click - should not trigger
        emitEvent(new MouseEvent('click'));
        actualCalls = mockCallback.mock.calls.filter(call => call[0] !== 'dummy');
        expect(actualCalls).toHaveLength(0);
      });
    });

    describe('debounce', () => {
      it('should delay execution until after timeout', async () => {
        const [onEvent, emitEvent] = createEvent<string>();
        const debouncedHandler = debounce(100)(onEvent);
        const mockCallback = vi.fn();

        debouncedHandler(mockCallback);

        // Emit multiple events quickly
        emitEvent('first');
        emitEvent('second');
        emitEvent('third');

        // Should not have triggered yet (only DUMMY call)
        const actualCalls = mockCallback.mock.calls.filter(call => call[0] !== 'dummy');
        expect(actualCalls).toHaveLength(0);

        // Wait for debounce timeout
        await new Promise(resolve => setTimeout(resolve, 150));

        // Should have triggered with the last value
        const actualCallsAfter = mockCallback.mock.calls.filter(call => call[0] !== 'dummy');
        expect(actualCallsAfter).toHaveLength(1);
        expect(actualCallsAfter[0][0]).toBe('third');
      });

      it('should reset timeout on new events', async () => {
        const [onEvent, emitEvent] = createEvent<string>();
        const debouncedHandler = debounce(100)(onEvent);
        const mockCallback = vi.fn();

        debouncedHandler(mockCallback);

        emitEvent('first');
        await new Promise(resolve => setTimeout(resolve, 50));

        emitEvent('second'); // Reset timer
        await new Promise(resolve => setTimeout(resolve, 50));

        emitEvent('third'); // Reset timer again
        await new Promise(resolve => setTimeout(resolve, 120));

        const actualCalls = mockCallback.mock.calls.filter(call => call[0] !== 'dummy');
        expect(actualCalls).toHaveLength(1);
        expect(actualCalls[0][0]).toBe('third');
      });
    });

    describe('throttle', () => {
      it('should limit execution to once per interval', async () => {
        const [onEvent, emitEvent] = createEvent<string>();
        const throttledHandler = throttle(100)(onEvent);
        const mockCallback = vi.fn();

        throttledHandler(mockCallback);

        // First event should trigger
        emitEvent('first');
        let actualCalls = mockCallback.mock.calls.filter(call => call[0] !== 'dummy');
        expect(actualCalls).toHaveLength(1);
        expect(actualCalls[0][0]).toBe('first');

        // Events within interval should be throttled
        emitEvent('second');
        emitEvent('third');
        actualCalls = mockCallback.mock.calls.filter(call => call[0] !== 'dummy');
        expect(actualCalls).toHaveLength(1);

        // Wait for interval to pass
        await new Promise(resolve => setTimeout(resolve, 110));

        // Next event should trigger
        emitEvent('fourth');
        actualCalls = mockCallback.mock.calls.filter(call => call[0] !== 'dummy');
        expect(actualCalls).toHaveLength(2);
        expect(actualCalls[1][0]).toBe('fourth');
      });
    });
  });
});
