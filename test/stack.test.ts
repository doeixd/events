import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { createTopic, createEvent } from '../src/index';

// This test suite relies on the presence of DisposableStack.
// We can use `vi.skipIf` to only run it in compatible environments.
const hasDisposableStack = typeof DisposableStack === 'function';

describe('Internal Robustness with DisposableStack', () => {
  it.skipIf(!hasDisposableStack)('createTopic runs all unsubscribe functions even if one throws', () => {
    const unsubA = vi.fn();
    const unsubB = vi.fn().mockImplementation(() => {
      throw new Error('Unsubscribe B failed!');
    });
    const unsubC = vi.fn();

    // Mock the handlers to return our spies
    const handlerA = vi.fn().mockReturnValue(unsubA);
    const handlerB = vi.fn().mockReturnValue(unsubB);
    const handlerC = vi.fn().mockReturnValue(unsubC);

    const topic = createTopic(handlerA, handlerB, handlerC);
    const unsubscribeAll = topic(() => {});

    // Execute the cleanup. With DisposableStack, it should throw SuppressedError.
    expect(() => unsubscribeAll()).toThrow();

    // CRITICAL: Assert that all other unsubscribe functions were still called.
    // LIFO order means C is called first, then B (throws), then A.
    expect(unsubC).toHaveBeenCalledTimes(1);
    expect(unsubB).toHaveBeenCalledTimes(1);
    expect(unsubA).toHaveBeenCalledTimes(1);
  });
});

describe('Backwards-Compatible Fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals(); // Clean up global stubs after each test
  });

  it('createTopic should use array fallback when DisposableStack is not present', () => {
    // Hide native DisposableStack to force the fallback
    vi.stubGlobal('DisposableStack', undefined);

    // Spy on console.error, as our fallback logs errors
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const unsubA = vi.fn();
    const unsubB = vi.fn().mockImplementation(() => {
      throw new Error('Fallback Unsubscribe B failed!');
    });
    const unsubC = vi.fn();

    // Mock the handlers to return our spies
    const handlerA = vi.fn().mockReturnValue(unsubA);
    const handlerB = vi.fn().mockReturnValue(unsubB);
    const handlerC = vi.fn().mockReturnValue(unsubC);

    const topic = createTopic(handlerA, handlerB, handlerC);
    const unsubscribeAll = topic(() => {});

    // Execute the cleanup. We don't expect it to throw.
    unsubscribeAll();

    // CRITICAL: Assert that all other unsubscribe functions were still called.
    // LIFO order means C is called first, then B (throws), then A.
    expect(unsubC).toHaveBeenCalledTimes(1);
    expect(unsubB).toHaveBeenCalledTimes(1);
    expect(unsubA).toHaveBeenCalledTimes(1);

    // Verify that our fallback's error handling was invoked.
    expect(consoleSpy).toHaveBeenCalledWith(
      'An error occurred during unsubscription:',
      expect.any(Error)
    );
    expect(consoleSpy.mock.calls[0][1].message).toBe('Fallback Unsubscribe B failed!');

    consoleSpy.mockRestore();
  });
});