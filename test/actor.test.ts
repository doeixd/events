import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActor, select } from '../src/actor';
import { createEvent } from '../src/index';

describe('createActor', () => {
  it('should create an actor with initial state', () => {
    const actor = createActor(
      { count: 0 },
      (context) => ({})
    );

    expect(actor()).toEqual({ count: 0 });
  });

  it('should allow state mutation through emitters', () => {
    const actor = createActor(
      { count: 0 },
      (context) => {
        const [handler, emit] = createEvent();
        handler((data) => { if (typeof data === 'symbol' || data === 'dummy') return; context.count++; });
        const [decrementHandler, decrement] = createEvent();
        decrementHandler((data) => { if (typeof data === 'symbol' || data === 'dummy') return; context.count--; });
        return { increment: emit, decrement };
      }
    );

    actor.increment();
    expect(actor()).toEqual({ count: 1 });

    actor.decrement();
    expect(actor()).toEqual({ count: 0 });
  });

  it('should notify subscribers on state changes', () => {
    const actor = createActor(
      { count: 0 },
      (context) => {
        const [handler, emit] = createEvent();
        handler((data) => { if (typeof data === 'symbol' || data === 'dummy') return; context.count++; });
        return { increment: emit };
      }
    );

    const mockCallback = vi.fn();
    actor.subscribe(mockCallback);

    // Initial call
    expect(mockCallback).toHaveBeenCalledWith({ count: 0 });
    mockCallback.mockClear();

    actor.increment();
    expect(mockCallback).toHaveBeenCalledWith({ count: 1 });
  });

  it('should handle deep object mutations reactively', () => {
    const actor = createActor(
      { user: { name: 'Alice', age: 25 } },
      (context) => {
        const [updateNameHandler, updateName] = createEvent();
        updateNameHandler((newName) => { if (typeof newName === 'symbol' || newName === 'dummy') return; context.user.name = newName as string; });
        const [incrementAgeHandler, incrementAge] = createEvent();
        incrementAgeHandler((data) => { if (typeof data === 'symbol' || data === 'dummy') return; context.user.age++; });
        return { updateName, incrementAge };
      }
    );

    const mockCallback = vi.fn();
    actor.subscribe(mockCallback);
    mockCallback.mockClear();

    actor.updateName('Bob');
    expect(mockCallback).toHaveBeenCalledWith({ user: { name: 'Bob', age: 25 } });

    actor.incrementAge();
    expect(mockCallback).toHaveBeenCalledWith({ user: { name: 'Bob', age: 26 } });
  });

  it('should handle array mutations reactively', () => {
    const actor = createActor(
      { items: [1, 2, 3] },
      (context) => {
        const [addItemHandler, addItem] = createEvent();
        addItemHandler((item) => { if (typeof item === 'symbol' || item === 'dummy') return; context.items.push(item as number); });
        const [removeItemHandler, removeItem] = createEvent();
        removeItemHandler((data) => { if (typeof data === 'symbol' || data === 'dummy') return; context.items.pop(); });
        return { addItem, removeItem };
      }
    );

    const mockCallback = vi.fn();
    actor.subscribe(mockCallback);
    mockCallback.mockClear();

    actor.addItem(4);
    expect(mockCallback).toHaveBeenCalledWith({ items: [1, 2, 3, 4] });

    actor.removeItem();
    expect(mockCallback).toHaveBeenCalledWith({ items: [1, 2, 3] });
  });

  it('should call effects function on state changes', () => {
    const effectMock = vi.fn();
    const actor = createActor(
      { count: 0 },
      (context) => {
        const [handler, emit] = createEvent();
        handler((data) => { if (typeof data === 'symbol' || data === 'dummy') return; context.count++; });
        return { increment: emit };
      },
      effectMock
    );

    actor.increment();

    expect(effectMock).toHaveBeenCalledWith({ count: 1 }, { count: 0 });
  });

  it('should provide shallow clones to effects to prevent mutation', () => {
    const effectMock = vi.fn((newContext, oldContext) => {
      // Try to mutate - should not affect actual state
      newContext.count = 999;
      oldContext.count = 888;
    });

    const actor = createActor(
      { count: 0 },
      (context) => {
        const [handler, emit] = createEvent();
        handler((data) => { if (typeof data === 'symbol' || data === 'dummy') return; context.count++; });
        return { increment: emit };
      },
      effectMock
    );

    actor.increment();

    // State should still be correct despite effect trying to mutate
    expect(actor()).toEqual({ count: 1 });
  });

  it('should handle unsubscribe from actor', () => {
    const actor = createActor(
      { count: 0 },
      (context) => {
        const [handler, emit] = createEvent();
        handler((data) => { if (typeof data === 'symbol' || data === 'dummy') return; context.count++; });
        return { increment: emit };
      }
    );

    const mockCallback = vi.fn();
    const unsubscribe = actor.subscribe(mockCallback);
    mockCallback.mockClear();

    actor.increment();
    expect(mockCallback).toHaveBeenCalledWith({ count: 1 });

    unsubscribe();
    actor.increment();
    expect(mockCallback).toHaveBeenCalledTimes(1); // Should not be called again
  });

  it('should maintain type safety', () => {
    const actor = createActor(
      { count: 0, name: 'test' },
      (context) => {
        const [setCountHandler, setCount] = createEvent();
        setCountHandler((value) => { if (typeof value === 'symbol' || value === 'dummy') return; context.count = value as number; });
        const [setNameHandler, setName] = createEvent();
        setNameHandler((value) => { if (typeof value === 'symbol' || value === 'dummy') return; context.name = value as string; });
        return { setCount, setName };
      }
    );

    // TypeScript should enforce types
    actor.setCount(42);
    actor.setName('updated');

    expect(actor()).toEqual({ count: 42, name: 'updated' });
  });

  it('should freeze the actor to prevent external mutation', () => {
    const actor = createActor(
      { count: 0 },
      (context) => {
        const [handler, emit] = createEvent();
        handler(() => context.count++);
        return { increment: emit };
      }
    );

    expect(() => {
      (actor as any).someProperty = 'test';
    }).toThrow();

    expect(() => {
      delete (actor as any).subscribe;
    }).toThrow();
  });
});

describe('select', () => {
  it('should create a derived subject from one actor', () => {
    const counterActor = createActor(
      { count: 0 },
      (context) => {
        const [handler, emit] = createEvent();
        handler((data) => { if (typeof data === 'symbol' || data === 'dummy') return; context.count++; });
        return { increment: emit };
      }
    );

    const isEven = select([counterActor], () => counterActor().count % 2 === 0);

    expect(isEven()).toBe(true);

    const mockCallback = vi.fn();
    isEven.subscribe(mockCallback);
    mockCallback.mockClear();

    counterActor.increment();
    expect(isEven()).toBe(false);
    expect(mockCallback).toHaveBeenCalledWith(false);
  });

  it('should create a derived subject from multiple actors', () => {
    const authActor = createActor(
      { isLoggedIn: false },
      (context) => {
        const [handler, emit] = createEvent();
        handler((data) => { if (typeof data === 'symbol' || data === 'dummy') return; context.isLoggedIn = true; });
        return { login: emit };
      }
    );

    const cartActor = createActor(
      { items: [] as string[] },
      (context) => {
        const [handler, emit] = createEvent();
        handler((item) => { if (typeof item === 'symbol' || item === 'dummy') return; context.items.push(item as string); });
        return { addItem: emit };
      }
    );

    const canCheckout = select(
      [authActor, cartActor],
      () => authActor().isLoggedIn && cartActor().items.length > 0
    );

    expect(canCheckout()).toBe(false);

    const mockCallback = vi.fn();
    canCheckout.subscribe(mockCallback);
    mockCallback.mockClear();

    authActor.login();
    expect(canCheckout()).toBe(false); // Still false because no items

    cartActor.addItem('item1');
    expect(canCheckout()).toBe(true);
    expect(mockCallback).toHaveBeenCalledWith(true);
  });

  it('should handle dispose to clean up subscriptions', () => {
    const actor = createActor(
      { value: 0 },
      (context) => {
        const [handler, emit] = createEvent();
        handler((v) => { if (typeof v === 'symbol' || v === 'dummy') return; context.value = v as number; });
        return { update: emit };
      }
    );

    const derived = select([actor], () => actor().value * 2);

    const mockCallback = vi.fn();
    derived.subscribe(mockCallback);
    mockCallback.mockClear();

    actor.update(5);
    expect(mockCallback).toHaveBeenCalledWith(10);

    derived.dispose?.();
    actor.update(10);
    expect(mockCallback).toHaveBeenCalledTimes(1); // Should not be called again
  });

  it('should compute initial value correctly', () => {
    const actor = createActor(
      { a: 1, b: 2 },
      (context) => ({})
    );

    const sum = select([actor], () => actor().a + actor().b);
    expect(sum()).toBe(3);
  });

  it('should handle complex projections', () => {
    const userActor = createActor(
      { profile: { name: 'Alice', age: 25 }, settings: { theme: 'light' } },
      (context) => ({})
    );

    const displayInfo = select([userActor], () => ({
      displayName: userActor().profile.name.toUpperCase(),
      isAdult: userActor().profile.age >= 18,
      theme: userActor().settings.theme,
    }));

    expect(displayInfo()).toEqual({
      displayName: 'ALICE',
      isAdult: true,
      theme: 'light',
    });
  });

  it('should work with non-actor subscribables', () => {
    // Mock a simple subscribable
    const mockSubscribable = {
      subscribe: vi.fn((callback: (value: number) => void) => {
        callback(10);
        return () => {};
      }),
    };

    const doubled = select([mockSubscribable as any], () => 10 * 2);
    expect(doubled()).toBe(20);
  });
});