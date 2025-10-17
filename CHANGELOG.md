# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.0.20](https://github.com/doeixd/events/compare/v0.0.19...v0.0.20) (2025-10-17)

### [0.0.19](https://github.com/doeixd/events/compare/v0.0.18...v0.0.19) (2025-10-17)


### Features

* Complete React and SolidJS integrations with comprehensive hook suites ([0bab34c](https://github.com/doeixd/events/commit/0bab34ce8d521ee7b6def0ac221bbefe1afc8d09))

### [0.0.18](https://github.com/doeixd/events/compare/v0.0.17...v0.0.18) (2025-10-17)


### Features

* implement RxJS-style handler operators with comprehensive testing and documentation ([9a16f0d](https://github.com/doeixd/events/commit/9a16f0d1a66babd868bf50034cbf99ed30d4eaf3))

### [0.0.17](https://github.com/doeixd/events/compare/v0.0.16...v0.0.17) (2025-10-17)


### Bug Fixes

* add readme field to package.json files ([b1f8aee](https://github.com/doeixd/events/commit/b1f8aeead2eaa63a0ce3ff6380cee1e0d5bebe86))

### [0.0.16](https://github.com/doeixd/events/compare/v0.0.15...v0.0.16) (2025-10-17)


### Features

* Add comprehensive State Machines implementation and documentation ([b7eeb0b](https://github.com/doeixd/events/commit/b7eeb0bed9b41129c8d0db2ecc16b811f97dbaac))
* export state-machine, stack, and remix-bridge modules ([295f9e2](https://github.com/doeixd/events/commit/295f9e26d979ddd89414ede3917b43871ad046c1))


### Bug Fixes

* resolve TypeScript errors in state-machine.ts ([190cbaa](https://github.com/doeixd/events/commit/190cbaafffd09a5d32794639c58698ccf93441cd))

### [0.0.15](https://github.com/doeixd/events/compare/v0.0.14...v0.0.15) (2025-10-17)

### [0.0.14](https://github.com/doeixd/events/compare/v0.0.13...v0.0.14) (2025-10-17)

### [0.0.13](https://github.com/doeixd/events/compare/v0.0.12...v0.0.13) (2025-10-17)


### Features

* Add comprehensive Remix Events compatibility layer ([a11bb3c](https://github.com/doeixd/events/commit/a11bb3c600294b25e0dd055dc859f912f7c2ed70))
* Add framework integration packages and DOM utility tests ([0572cb5](https://github.com/doeixd/events/commit/0572cb59133621d7a3cc7b0e2dcae36771045036))
* add Remix Events compatibility layer ([34e2158](https://github.com/doeixd/events/commit/34e2158fcd1cd2c42ca5cfe1ff6b7579074e9794))

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
