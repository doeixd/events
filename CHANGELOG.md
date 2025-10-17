# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [Unreleased]

### 📚 Documentation

* **Comprehensive Documentation Suite**: Added five detailed architectural guides
  * `docs/primitives.md` - When to use operators, interactions, reducers, and actors with mental models and kitchen workflow analogies
  * `docs/async.md` - Deep dive into cancellation, control flow, disposal, batching, and the flow of asynchronous events
  * `docs/dom.md` - Complete reference for DOM utilities including observers (`onIntersect`, `onResize`), focus management (`trapFocus`), and reactive form patterns
  * `docs/framework-integration.md` - Integration guides for React, Vue, Svelte, and SolidJS with hooks, composables, stores, and runes
  * `docs/positioning.md` - Architectural comparison with RxJS, SolidJS Signals, XState, and Redux to help choose the right tool

* **README Enhancements**: Strategic documentation links added throughout
  * Added link to DOM Utilities Guide in the DOM section
  * Added link to Async Handling Guide under Remix Events and Best Practices sections
  * Added link to Primitives Guide in the Declarative APIs section
  * Added link to Positioning Guide in the Key Differences section
  * Enhanced Framework Integrations section with clearer navigation
  * Added comprehensive Documentation index section before Acknowledgments

### ✨ Features

* **Enhanced DOM Utilities Module** (`src/dom.ts`)
  * Complete rewrite with comprehensive JSDoc documentation
  * Added new mouse event shortcuts: `mouseover`, `mouseout`, `mouseenter`, `mouseleave`, `contextmenu`
  * Added keyboard event shortcut: `keypress`
  * Added form event shortcut: `reset`
  * Added focus event shortcuts: `focusin`, `focusout`
  * Added pointer event shortcuts: `pointerdown`, `pointerup`, `pointermove`, `pointerenter`, `pointerleave`
  * Added scroll event shortcut: `scroll`
  * Added new observer utilities:
    - `onIntersect()` - Reactive wrapper around IntersectionObserver for viewport detection
    - `onResize()` - Reactive wrapper around ResizeObserver for element dimension changes
  * Added focus management utility:
    - `trapFocus()` - Trap keyboard focus within a container for accessible modals and dialogs
  * All shortcuts now support full `AddEventListenerOptions` (capture, passive, once, signal)
  * Improved type safety with better TypeScript inference
  * Enhanced comments and inline documentation for better developer experience

* **Framework Integration Build System** (`package.json`)
  * Added build scripts for Vue framework integration: `build:vue`
  * Added build scripts for Svelte framework integration: `build:svelte`
  * Added build scripts for SolidJS framework integration: `build:solid`
  * Updated `build:all` to build all framework packages via new `build:packages` script
  * Added comprehensive type-checking scripts:
    - `type-check:all` - Type check core library and all framework packages
    - `type-check:packages` - Type check all framework integration packages
    - `type-check:vue`, `type-check:svelte`, `type-check:solid` - Individual package checks

### 🐛 Bug Fixes

* **DOM Event Typing**: Fixed event typing to work correctly with any EventTarget (not just Element)
* **Exports**: Re-exported `createSubject` in dom.ts for internal use

### 🔧 Internal

* **Documentation Structure**: Created `/docs` directory with modular, focused documentation
* **Type Safety**: Improved generic type constraints for better IDE support
* **Code Organization**: Better separation of concerns in DOM utilities module

### [0.0.12](https://github.com/doeixd/events/compare/v0.0.11...v0.0.12) (2025-10-17)


### Features

* add actor system and enhanced reducer with effects and state-guarded functionality ([7f29240](https://github.com/doeixd/events/commit/7f2924052b303fea3ba87cd5f016ed199234a6d1))


### Bug Fixes

* remove unused Unsubscribe import ([a5cdf2e](https://github.com/doeixd/events/commit/a5cdf2ef6bee1655d470033a4d1a23cebf13cc78))
* resolve DisposableStack type error in tests ([0579957](https://github.com/doeixd/events/commit/0579957236b90a0140d0868ab083e451d6e05420))

### [0.0.11](https://github.com/doeixd/events/compare/v0.0.10...v0.0.11) (2025-10-16)


### Features

* add handler operators (doubleClick, debounce, throttle) ([6b6792a](https://github.com/doeixd/events/commit/6b6792aa626315a81cd279009329ff993bafa848))
* **operators:** add createOperator helper for easier custom operator creation ([40085cb](https://github.com/doeixd/events/commit/40085cb92881d2b43926a2553808d5cf96d6a613))

### [0.0.10](https://github.com/doeixd/events/compare/v0.0.9...v0.0.10) (2025-10-16)


### Features

* **EventEmitter Integration**: Added seamless integration with the classic EventEmitter pattern
  * `fromEmitterEvent()` - Create reactive handlers from EventEmitter events
  * `toEmitterEvent()` - Drive EventEmitter instances with reactive logic
  * `adaptEmitter()` - Adapt entire EventEmitter to type-safe reactive interface
  * `EventEmitterLike` interface for Node.js/events compatibility
* **Handler Operators**: Added pipeable operator functions for composable event logic
  * `createOperator()` - Helper for creating custom operators
  * `doubleClick()` - Detect double-clicks within timeout
  * `debounce()` - Delay execution until after timeout
  * `throttle()` - Limit execution to once per interval
  * RxJS-style operator pattern for reusable event transformations
* **Enhanced createEvent with AbortSignal Support**:
  * Optional AbortSignal parameter for automatic cleanup
  * Meta parameter with AbortSignal for async operation safety
  * Automatic abortion of previous async operations on new emissions
* **Comprehensive Test Coverage**: Added 8 new tests for EventEmitter integration and 5 new tests for handler operators
* **Documentation Updates**: Enhanced README with EventEmitter integration examples, handler operators documentation, and improved createEvent documentation ([b45dcc9](https://github.com/doeixd/events/commit/b45dcc9411e4e81005b58f5015ab323b045da6ea))

### [0.0.9](https://github.com/doeixd/events/compare/v0.0.8...v0.0.9) (2025-10-16)

### [0.0.8](https://github.com/doeixd/events/compare/v0.0.7...v0.0.8) (2025-10-16)

### [0.0.7](https://github.com/doeixd/events/compare/v0.0.6...v0.0.7) (2025-10-16)

### [0.0.6](https://github.com/doeixd/events/compare/v0.0.5...v0.0.6) (2025-10-16)

### [0.0.5](https://github.com/doeixd/events/compare/v0.0.4...v0.0.5) (2025-10-16)

### [0.0.4](https://github.com/doeixd/events/compare/v0.0.3...v0.0.4) (2025-10-16)

### [0.0.3](https://github.com/doeixd/events/compare/v0.0.2...v0.0.3) (2025-10-16)


### Bug Fixes

* ensure NODE_AUTH_TOKEN is set in the environment and remove types_file output ([f842c4e](https://github.com/doeixd/events/commit/f842c4e84be749de111158d0c449ccf9060a41dc))

### [0.0.2](https://github.com/doeixd/events/compare/v0.0.1...v0.0.2) (2025-10-16)

### 0.0.1 (2025-10-16)
