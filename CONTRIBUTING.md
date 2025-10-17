# Contributing to @doeixd/events

Thank you for your interest in contributing to `@doeixd/events`! This document provides comprehensive guidelines for contributing to the project, including project structure, development workflow, documentation standards, and release processes.

## Table of Contents

- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Documentation Standards](#documentation-standards)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Commit Guidelines](#commit-guidelines)
- [Release Process](#release-process)
- [Framework Integration Packages](#framework-integration-packages)

---

## Project Structure

The project is organized as a monorepo with the core library and framework-specific integration packages:

```
events/
├── src/                          # Core library source code
│   ├── main.ts                   # Core primitives (createEvent, createSubject, etc.)
│   ├── dom.ts                    # DOM utilities and event handlers
│   ├── operators.ts              # Handler operators (debounce, throttle, etc.)
│   ├── actor.ts                  # Actor system implementation
│   ├── reducer.ts                # Reducer and state machine implementations
│   ├── remix-bridge.ts           # Remix Events compatibility layer
│   ├── remix-attacher.ts         # Remix events() attacher implementation
│   ├── stack.ts                  # Subscription stack management
│   └── index.ts                  # Main entry point and exports
│
├── test/                         # Test suites
│   ├── index.test.ts             # Core library tests
│   ├── dom.test.ts               # DOM utilities tests
│   ├── actor.test.ts             # Actor system tests
│   ├── reducer.test.ts           # Reducer tests
│   ├── remix.test.ts             # Remix Events compatibility tests
│   ├── stack.test.ts             # Subscription stack tests
│   └── disposeable.test.ts       # Disposable protocol tests
│
├── docs/                         # Comprehensive documentation
│   ├── primitives.md             # When to use operators, interactions, reducers, actors
│   ├── async.md                  # Async handling, cancellation, control flow
│   ├── dom.md                    # DOM utilities reference
│   ├── framework-integration.md  # Framework integration guides
│   └── positioning.md            # Architectural comparisons (RxJS, Solid, XState, Redux)
│
├── packages/                     # Framework integration packages
│   ├── react/                    # React hooks integration
│   │   ├── src/index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   ├── vue/                      # Vue composables integration
│   │   ├── src/index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   ├── svelte/                   # Svelte stores and runes integration
│   │   ├── src/index.ts
│   │   ├── src/runes.svelte.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.runes.json
│   │   └── README.md
│   └── solid/                    # SolidJS signals integration
│       ├── src/index.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── dist/                         # Build output (generated)
│   ├── cjs/                      # CommonJS builds
│   ├── esm/                      # ES Module builds
│   └── types/                    # TypeScript declarations
│
├── .github/                      # GitHub configuration
│   └── workflows/
│       └── npm-publish.yml       # Automated publishing workflow
│
├── package.json                  # Core package configuration
├── tsconfig.json                 # TypeScript configuration
├── CHANGELOG.md                  # Detailed change log
├── README.md                     # Main project documentation
└── CONTRIBUTING.md               # This file
```

---

## Development Setup

### Prerequisites

- **Node.js**: 16.x or higher
- **npm**: 7.x or higher
- **Git**: For version control

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/doeixd/events.git
   cd events
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install framework package dependencies (optional, only if working on integrations):
   ```bash
   cd packages/react && npm ci && cd ../..
   cd packages/vue && npm ci && cd ../..
   cd packages/svelte && npm ci && cd ../..
   cd packages/solid && npm ci && cd ../..
   ```

### Available Scripts

**Core Library:**
```bash
npm run build              # Build the core library
npm run type-check         # Type check the core library
npm test                   # Run all tests
npm run watch              # Watch mode for development
npm run clean              # Clean build artifacts
```

**Framework Packages:**
```bash
npm run build:all          # Build core + all framework packages
npm run build:packages     # Build all framework packages only
npm run build:react        # Build React package
npm run build:vue          # Build Vue package
npm run build:svelte       # Build Svelte package
npm run build:solid        # Build Solid package

npm run type-check:all     # Type check everything
npm run type-check:packages # Type check all framework packages
npm run type-check:react   # Type check React package
npm run type-check:vue     # Type check Vue package
npm run type-check:svelte  # Type check Svelte package
npm run type-check:solid   # Type check Solid package
```

**Release:**
```bash
npm run release            # Create versioned release and push
```

---

## Development Workflow

### 1. Before Starting Work

1. **Pull latest changes:**
   ```bash
   git pull origin master
   ```

2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Verify everything works:**
   ```bash
   npm run type-check:all
   npm test
   ```

### 2. During Development

1. **Make changes** to source files in `src/`

2. **Type check frequently:**
   ```bash
   npm run type-check
   ```

3. **Run tests frequently:**
   ```bash
   npm test
   ```

4. **Write tests** for new features in `test/`

5. **Update documentation** if adding new features:
   - Add JSDoc comments to source code
   - Update relevant docs in `docs/`
   - Update README.md if needed

### 3. Before Committing

**Pre-commit Checklist:**
- [ ] All type checks pass: `npm run type-check:all`
- [ ] All tests pass: `npm test`
- [ ] All builds succeed: `npm run build:all`
- [ ] JSDoc comments added for new public APIs
- [ ] Documentation updated in `docs/` if needed
- [ ] README.md updated if needed
- [ ] CHANGELOG.md updated with your changes

---

## Documentation Standards

### Documentation Structure

The project uses a multi-layered documentation approach:

1. **JSDoc Comments** (in source code)
   - API reference and inline documentation
   - Type information and examples

2. **README.md**
   - Quick start guide
   - Core API overview
   - Links to detailed guides

3. **Comprehensive Guides** (`docs/`)
   - **primitives.md**: Architectural patterns and mental models
   - **async.md**: Deep dive into async handling
   - **dom.md**: Complete DOM utilities reference
   - **framework-integration.md**: Framework integration guides
   - **positioning.md**: Library comparisons

4. **Package READMEs** (`packages/*/README.md`)
   - Framework-specific usage examples
   - Installation instructions
   - API reference for that package

### JSDoc Standards

All public APIs must have comprehensive JSDoc comments:

```typescript
/**
 * Creates a type-safe, chainable `Handler` from a DOM event.
 *
 * This is the foundational function for all DOM event utilities. It automatically
 * handles listener cleanup and integrates with `AbortSignal` for declarative,
 * lifecycle-managed event handling.
 *
 * @param target - The `EventTarget` to listen on (e.g., an Element, `window`, or `document`)
 * @param eventName - The name of the event
 * @param options - Standard `addEventListener` options, including `signal` for automatic cleanup
 * @returns A `Handler` stream that emits events of the correct type
 *
 * @example
 * ```typescript
 * const onWindowResize = fromDomEvent(window, 'resize');
 * onWindowResize(() => {
 *   console.log('Window was resized!');
 * });
 * ```
 *
 * @example
 * ```typescript
 * // With automatic cleanup
 * const controller = new AbortController();
 * const onClick = fromDomEvent(button, 'click', { signal: controller.signal });
 * onClick(() => console.log('Clicked'));
 * // Later: controller.abort(); // Removes listener
 * ```
 */
export function fromDomEvent<Target extends EventTarget, EventName extends string>(
  target: Target,
  eventName: EventName,
  options?: AddEventListenerOptions
): Handler<any> {
  // Implementation...
}
```

**JSDoc Requirements:**
- **Description**: Clear, concise explanation of what the function does
- **@param**: Document each parameter with type and description
- **@returns**: Document return type and what it represents
- **@example**: Provide at least one practical example
- **@throws**: Document any errors that can be thrown (if applicable)
- **@see**: Link to related functions or documentation

### Writing Documentation

When adding new features or making significant changes:

1. **Update JSDoc in source code first**
   - This is the single source of truth for API documentation

2. **Add examples to relevant docs**
   - Update `docs/primitives.md` for new patterns
   - Update `docs/dom.md` for DOM utilities
   - Update `docs/async.md` for async-related features

3. **Update README.md**
   - Add to API reference section if it's a core API
   - Update feature list if it's a major new capability
   - Add strategic links to detailed documentation

4. **Update CHANGELOG.md**
   - Document all changes in the [Unreleased] section
   - Use clear categorization (Features, Bug Fixes, Documentation, etc.)

---

## Code Standards

### TypeScript Guidelines

1. **Strict Type Safety**
   - Enable all strict TypeScript options
   - Avoid `any` except when absolutely necessary
   - Use generics for reusable, type-safe APIs

2. **Naming Conventions**
   - Use `camelCase` for variables and functions
   - Use `PascalCase` for types and interfaces
   - Use `UPPER_CASE` for constants
   - Prefix private members with `_` (if not using TypeScript private)

3. **Exports**
   - Export types alongside implementations
   - Use named exports (avoid default exports)
   - Re-export from `index.ts` for public APIs

### Code Style

1. **Formatting**
   - Use 2 spaces for indentation
   - Use single quotes for strings
   - Include trailing commas in multi-line objects/arrays
   - Maximum line length: 100 characters (flexible)

2. **Comments**
   - Use JSDoc for public APIs
   - Use inline comments sparingly for complex logic
   - Prefer self-documenting code over comments

3. **Error Handling**
   - Throw descriptive errors
   - Use custom error types when appropriate
   - Document error cases in JSDoc with `@throws`

### Module Organization

Each module should follow this structure:

```typescript
/**
 * @module module-name
 * Brief description of the module's purpose
 */

// Imports
import { ... } from './other-module';

// Type definitions
export type MyType = ...;
export interface MyInterface { ... }

// Constants
const INTERNAL_CONSTANT = ...;

// Implementation
export function publicFunction() { ... }

// Internal helpers (not exported)
function internalHelper() { ... }
```

---

## Testing

### Test Structure

Tests are organized by module:
- `test/index.test.ts` - Core library tests
- `test/dom.test.ts` - DOM utilities tests
- `test/actor.test.ts` - Actor system tests
- `test/reducer.test.ts` - Reducer tests
- `test/remix.test.ts` - Remix Events compatibility tests

### Writing Tests

1. **Test Organization**
   ```typescript
   import { describe, it, expect } from 'vitest';

   describe('Feature Name', () => {
     describe('Specific Behavior', () => {
       it('should do something specific', () => {
         // Arrange
         const input = ...;

         // Act
         const result = functionUnderTest(input);

         // Assert
         expect(result).toBe(expectedValue);
       });
     });
   });
   ```

2. **Test Coverage Requirements**
   - All new public APIs must have tests
   - Test both success and error cases
   - Test edge cases and boundary conditions
   - Aim for high coverage but prioritize meaningful tests

3. **DOM Testing**
   - Use jsdom environment (configured in package.json)
   - Clean up DOM elements after each test
   - Use `beforeEach` and `afterEach` for setup/teardown

4. **Async Testing**
   - Use `async`/`await` for async tests
   - Test cancellation with AbortSignal
   - Test promise rejection handling

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (during development)
npm run dev

# Run specific test file
npx vitest test/dom.test.ts

# Run with coverage
npx vitest --coverage
```

---

## Commit Guidelines

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no feature change or bug fix)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependencies
- `ci`: CI/CD configuration changes

**Scope (optional):**
- `dom`: DOM utilities
- `operators`: Handler operators
- `actor`: Actor system
- `reducer`: Reducer system
- `remix`: Remix Events integration
- `react`: React package
- `vue`: Vue package
- `svelte`: Svelte package
- `solid`: Solid package

**Examples:**

```
feat(dom): add onIntersect and onResize observer utilities

Added reactive wrappers around IntersectionObserver and ResizeObserver
for viewport detection and responsive layout handling.

Closes #123
```

```
fix(actor): ensure effects run after state updates

Fixed timing issue where effects were called before the internal
subject notified subscribers of state changes.
```

```
docs: add comprehensive architectural comparison guide

Added positioning.md with detailed comparisons to RxJS, SolidJS,
XState, and Redux to help developers choose the right tool.
```

### Detailed Commit Messages

For significant changes, use detailed commit messages with:

1. **Clear summary line** (50-72 characters)
2. **Blank line**
3. **Detailed description** explaining:
   - What changed
   - Why it changed
   - Any breaking changes
   - Migration guide (if needed)

**Example:**

```
feat: add framework integration packages and DOM utility tests

This commit adds first-class framework integrations for React, Vue, Svelte,
and SolidJS, along with comprehensive tests for the enhanced DOM utilities.

## Framework Integrations

### @doeixd/vue (packages/vue/)
- Vue 3 Composables for the Composition API
- `useEvent()` - Subscribe to event handlers with automatic cleanup
- `useSubject()` - Convert subjects to reactive Refs
- `useSubjectSelector()` - Subscribe to specific parts of state
- Full TypeScript support with proper Vue type integration

### @doeixd/svelte (packages/svelte/)
- Dual API support for Svelte 4 and Svelte 5
- Store-based API for Svelte 4+ compatibility
- Runes API for Svelte 5+ with fine-grained reactivity

## Testing

### DOM Utility Tests (test/dom.test.ts)
- Comprehensive test coverage for new DOM utilities
- Tests for observer utilities (onIntersect, onResize)
- Tests for focus management (trapFocus)

## Benefits

- **Automatic Lifecycle Management**: All subscriptions clean up automatically
- **Type Safety**: Full TypeScript support with proper framework type integration
- **Idiomatic APIs**: Each package uses patterns familiar to framework users
```

---

## Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):
- **MAJOR** version (x.0.0): Breaking changes
- **MINOR** version (0.x.0): New features (backwards compatible)
- **PATCH** version (0.0.x): Bug fixes (backwards compatible)

### CHANGELOG.md

The CHANGELOG.md follows the [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

## [Unreleased]

### Features
- New feature description

### Bug Fixes
- Bug fix description

### Documentation
- Documentation updates

### Breaking Changes
- Breaking change description with migration guide

## [0.0.13] - 2025-10-17

### Features
- Feature that was released
```

**CHANGELOG Categories:**
- `Features` - New functionality
- `Bug Fixes` - Bug fixes
- `Documentation` - Documentation changes
- `Breaking Changes` - Changes that break backwards compatibility
- `Deprecations` - Features marked for removal
- `Internal` - Internal changes not affecting public API
- `Performance` - Performance improvements

### Release Steps

1. **Update CHANGELOG.md**
   ```bash
   # Move [Unreleased] section to new version
   # Add release date
   ```

2. **Update version in package.json**
   ```bash
   # Use standard-version (automated)
   npm run release

   # Or manually
   npm version patch  # or minor, or major
   ```

3. **Run standard-version**
   ```bash
   npm run release
   # This will:
   # - Bump version in package.json
   # - Update CHANGELOG.md
   # - Create git tag
   # - Push to origin
   ```

4. **GitHub will automatically publish to npm**
   - The `.github/workflows/npm-publish.yml` workflow triggers on version tags
   - Builds all packages
   - Publishes to npm registry

### Pre-release Checklist

Before releasing, ensure:
- [ ] All tests pass: `npm test`
- [ ] All type checks pass: `npm run type-check:all`
- [ ] All builds succeed: `npm run build:all`
- [ ] CHANGELOG.md is updated
- [ ] Documentation is up to date
- [ ] No uncommitted changes
- [ ] All framework packages build correctly

---

## Framework Integration Packages

### Package Structure

Each framework package follows this structure:

```
packages/<framework>/
├── src/
│   └── index.ts          # Main integration code
├── dist/                 # Build output (generated)
│   ├── index.js
│   ├── index.d.ts
│   └── index.d.ts.map
├── package.json          # Package configuration
├── tsconfig.json         # TypeScript configuration
└── README.md             # Framework-specific documentation
```

### Creating a New Framework Integration

1. **Create package directory:**
   ```bash
   mkdir -p packages/<framework>/src
   cd packages/<framework>
   ```

2. **Create package.json:**
   ```json
   {
     "name": "@doeixd/<framework>",
     "version": "0.0.1",
     "description": "<Framework> integration for @doeixd/events",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "files": ["dist", "src"],
     "scripts": {
       "build": "tsc",
       "type-check": "tsc --noEmit"
     },
     "peerDependencies": {
       "@doeixd/events": "^0.0.12",
       "<framework>": "^x.x.x"
     },
     "devDependencies": {
       "@doeixd/events": "workspace:*",
       "<framework>": "^x.x.x",
       "typescript": "^5.7.2"
     }
   }
   ```

3. **Create tsconfig.json:**
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "declaration": true,
       "declarationMap": true,
       "outDir": "dist",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true
     },
     "include": ["src/**/*"]
   }
   ```

4. **Implement integration** in `src/index.ts`

5. **Add README.md** with usage examples

6. **Add build scripts** to root `package.json`:
   ```json
   {
     "scripts": {
       "build:<framework>": "cd packages/<framework> && npm ci && npm run build",
       "type-check:<framework>": "cd packages/<framework> && npm run type-check"
     }
   }
   ```

7. **Update `build:packages` and `type-check:packages` scripts** to include new package

8. **Test the integration:**
   ```bash
   npm run type-check:<framework>
   npm run build:<framework>
   ```

### Integration Guidelines

1. **Follow framework conventions**
   - Use hooks for React
   - Use composables for Vue
   - Use stores for Svelte
   - Use signals for Solid

2. **Automatic cleanup**
   - All subscriptions should clean up automatically
   - Use framework lifecycle hooks

3. **Type safety**
   - Fully type all APIs
   - Ensure proper type inference
   - Export all relevant types

4. **Documentation**
   - Provide clear usage examples
   - Document all exported functions
   - Include framework-specific best practices

---

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/doeixd/events/issues)
- **Discussions**: [GitHub Discussions](https://github.com/doeixd/events/discussions)
- **Documentation**: [docs/](./docs/)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

---

## License

By contributing to @doeixd/events, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to @doeixd/events! 🎉
