// test/disposable.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createSubscriptionManager } from '../src/disposable';

describe('createSubscriptionManager', () => {
  it('should call added unsubscribe functions on dispose', () => {
    const manager = createSubscriptionManager();
    const unsub1 = vi.fn();
    const unsub2 = vi.fn();

    manager.add(unsub1);
    manager.add(unsub2);

    manager.dispose();

    expect(unsub1).toHaveBeenCalledOnce();
    expect(unsub2).toHaveBeenCalledOnce();
  });

  it('should call disposers in reverse order of registration (LIFO)', () => {
    const manager = createSubscriptionManager();
    const calls: string[] = [];
    const unsub1 = () => calls.push('first');
    const unsub2 = () => calls.push('second');

    manager.add(unsub1);
    manager.add(unsub2);

    manager.dispose();

    expect(calls).toEqual(['second', 'first']);
  });

  it('should implement the Symbol.dispose method', () => {
    const manager = createSubscriptionManager();
    expect(typeof manager[Symbol.dispose]).toBe('function');

    const unsub = vi.fn();
    manager.add(unsub);
    manager[Symbol.dispose]();

    expect(unsub).toHaveBeenCalledOnce();
  });
});