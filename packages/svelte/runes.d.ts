// Type definitions for @doeixd/svelte/runes
import type { Handler, Subject } from '@doeixd/events';

/**
 * A Svelte Rune that subscribes to a `Handler` and manages its lifecycle.
 * Requires Svelte 5+.
 */
export function useEvent<T>(handler: Handler<T>, callback: (data: T) => void): void;

/**
 * A Svelte 5 Rune that subscribes to a `Subject` and returns its value
 * as a reactive `$state` variable.
 */
export function useSubjectState<T>(subject: Subject<T>): T;

declare const _default: {
  useEvent: typeof useEvent;
  useSubjectState: typeof useSubjectState;
};

export default _default;
