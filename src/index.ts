/**
 * Main Entry Point for the Events Library
 *
 * Re-exports all public APIs from the core modules for convenient importing.
 *
 * @example
 * import {
 *   createEvent,
 *   createSubject,
 *   fromDomEvent,
 *   createTopic
 * } from 'events';
 */

// Core event system
export {
HaltSymbol,
halt,
createEvent,
toEventDescriptor,
subjectToEventDescriptor,
fromDomEvent,
type Emitter,
type Handler,
type Subject,
type Unsubscribe
} from './main';

import { createSubject as coreCreateSubject, type Subject } from './main';
import { createSubject as solidCreateSubject } from './events-helpers';

// Overloaded createSubject to support both core and SolidJS-style usage
export function createSubject<T>(initial?: T): Subject<T>;
export function createSubject<T>(initial: T | (() => T), ...handlers: any[]): Subject<T>;
export function createSubject<T>(initial?: T | (() => T), ...handlers: any[]): Subject<T> {
  if (handlers.length > 0 || typeof initial === 'function') {
    return solidCreateSubject(initial as any, ...handlers);
  } else {
    return coreCreateSubject(initial);
  }
}

// DOM utilities
export {
  dom,
  subjectProperty,
  subjectFromEvent,
  on
} from './dom';

// Remix bridge
export {
bridgeInteractionFactory,
fromDomHandler,
bindSubjectToDom,
emitterToEventDescriptor
} from './remix-bridge';

export {
  subjectFromEvent as subjectFromDomEvent,
  subjectProperty as subjectDomProperty
} from './dom';

// Helpers (SolidJS-style)
export {
createSubject as createSubjectSolid,
createAsyncSubject,
createSubjectStore,
createTopic,
createPartition,
combineLatest,
// Renamed originals
createSignal,
createAsyncSignal,
createStore,
mergeHandlers,
splitHandler
} from './events-helpers';

export { DUMMY } from './main';
