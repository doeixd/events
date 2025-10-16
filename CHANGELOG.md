# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
