# Development Guide

This document covers the complete development workflow for the @doeixd/events monorepo, including building, testing, releasing, and CI/CD processes.

## 🏗️ Project Structure

```
@doeixd/events/
├── src/                          # Main package source
│   ├── index.ts                  # Main exports
│   ├── main.ts                   # Core event system
│   ├── events-helpers.ts         # SolidJS-style helpers
│   ├── dom.ts                    # DOM utilities
│   ├── remix-bridge.ts           # Remix integration
│   └── events-remix-types.ts     # Type definitions
├── packages/react/               # React integration package
│   ├── src/index.ts              # React hooks
│   ├── package.json              # Package config
│   └── tsconfig.json             # TypeScript config
├── test/                         # Test files
├── dist/                         # Built main package
├── .github/workflows/            # CI/CD workflows
├── package.json                  # Main package config
├── tsconfig.json                 # TypeScript config
├── pridepack.json                # Build config
└── RELEASE.md                    # Release documentation
```

## 📦 Packages

### Main Package (@doeixd/events)
- **Location**: Root directory
- **Build Tool**: Pridepack (custom bundler)
- **Output**: ESM, CommonJS, and TypeScript definitions
- **Features**: Core reactive event system, DOM utilities, Remix integration

### React Package (@doeixd/react)
- **Location**: `packages/react/`
- **Build Tool**: TypeScript compiler
- **Output**: ESM and TypeScript definitions
- **Features**: React hooks for seamless integration
- **Dependencies**: `@doeixd/events` (peer dependency)

## 🛠️ Development Commands

### Main Package
```bash
# Install dependencies
npm ci

# Build package
npm run build

# Type checking
npm run type-check

# Run tests
npm test

# Clean build artifacts
npm run clean

# Development server
npm run dev
```

### React Package
```bash
# Build React package
npm run build:react

# Type check React package
npm run type-check:react
```

### All Packages
```bash
# Build all packages
npm run build:all
```

## 🔨 Build System

### Main Package (Pridepack)
The main package uses Pridepack for building:

- **Configuration**: `pridepack.json`
- **Outputs**:
  - `dist/esm/development/` - ESM development build
  - `dist/esm/production/` - ESM production build
  - `dist/cjs/development/` - CommonJS development build
  - `dist/cjs/production/` - CommonJS production build
  - `dist/types/` - TypeScript definitions

### React Package (TypeScript)
The React package uses the TypeScript compiler directly:

- **Configuration**: `packages/react/tsconfig.json`
- **Output**: `packages/react/dist/`
- **Features**: ESM build with TypeScript definitions

## 🧪 Testing

### Test Framework
- **Tool**: Vitest
- **Configuration**: Inline in `package.json`
- **Coverage**: Not currently configured
- **Environment**: Node.js with JSDOM for DOM tests

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure
- **Location**: `test/index.test.ts`
- **Coverage**: Core functionality, DOM utilities, React integration
- **58 tests** covering all major features

## 📋 Versioning & Releases

### Versioning Strategy
- **Standard**: [Semantic Versioning](https://semver.org/)
- **Automation**: [standard-version](https://github.com/conventional-changelog/standard-version)
- **Commits**: [Conventional Commits](https://conventionalcommits.org/)

### Release Process

#### Automated Release
```bash
# Create release commit and tag
npm run release

# Push changes and trigger CI
git push --follow-tags origin master
```

#### Manual Release
```bash
# Update version
npm version <major|minor|patch>

# Build packages
npm run build:all

# Publish packages
npm publish
cd packages/react && npm publish
```

### Commit Types
- `fix:` - Bug fixes (patch release)
- `feat:` - New features (minor release)
- `BREAKING CHANGE:` - Breaking changes (major release)
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Maintenance changes

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow
**File**: `.github/workflows/npm-publish.yml`

**Triggers**: Push to tags matching `v*` (e.g., `v1.2.3`)

**Jobs**:
1. **Setup**: Node.js 16, checkout with full history
2. **Build**: Build all packages
3. **Publish**: Publish both packages to npm
4. **Release**: Create GitHub release with changelog
5. **Assets**: Upload build artifacts to release

### Required Secrets
- `NPM_TOKEN`: npm publishing token
- `GITHUB_TOKEN`: GitHub API token (automatic)

### Workflow Steps
1. **Checkout**: Full git history for changelog generation
2. **Setup Node.js**: Version 16 with npm registry
3. **Install**: `npm ci` for dependencies
4. **Build**: `npm run build:all` (main + React packages)
5. **Find Files**: Locate built assets for upload
6. **Publish Main**: `npm publish` for @doeixd/events
7. **Publish React**: `npm publish` in packages/react/
8. **Changelog**: Extract changelog entry for version
9. **GitHub Release**: Create release with changelog
10. **Upload Assets**: CJS, ESM, and TypeScript files

## 📦 Packaging

### Main Package
- **Format**: Dual ESM/CommonJS with TypeScript definitions
- **Entry Points**:
  - `main`: CommonJS production build
  - `module`: ESM production build
  - `types`: TypeScript definitions
- **Exports**: Modern export map with development/production variants
- **Files**: `dist/` directory with all build outputs

### React Package
- **Format**: ESM with TypeScript definitions
- **Entry Points**:
  - `main`: Built JavaScript file
  - `types`: TypeScript definitions
- **Dependencies**: `@doeixd/events` as peer dependency
- **Files**: `dist/` directory

### Package Registry
- **Registry**: npm (https://registry.npmjs.org)
- **Access**: Public packages
- **Publishing**: Automated via CI/CD

## 🔧 Configuration Files

### package.json
```json
{
  "name": "@doeixd/events",
  "version": "0.0.6",
  "scripts": {
    "build": "pridepack build",
    "build:all": "npm run build && npm run build:react",
    "build:react": "cd packages/react && npm ci && npm run build",
    "test": "vitest --run",
    "release": "standard-version && git push --follow-tags origin master"
  },
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "development": {
        "require": "./dist/cjs/development/index.js",
        "import": "./dist/esm/development/index.js"
      },
      "require": "./dist/cjs/production/index.js",
      "import": "./dist/esm/production/index.js"
    }
  }
}
```

### pridepack.json
```json
{
  "target": "es2018"
}
```

### tsconfig.json (Main)
The root `tsconfig.json` includes `"esnext.disposable"` in the `"lib"` array to provide **type-level support** for the `DisposableStack` API. The library uses this for type safety and automatically provides a **runtime fallback** for environments where it's not available.

```json
{
  "extends": "@tsconfig/node16/tsconfig.json",
  "compilerOptions": {
    "outDir": "dist/types",
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### packages/react/tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "react-jsx",
    "types": ["react"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 🐛 Troubleshooting

### Build Issues
```bash
# Clean and rebuild
npm run clean && npm run build:all

# Check TypeScript errors
npm run type-check
npm run type-check:react

# Verify package builds
ls -la dist/
ls -la packages/react/dist/
```

### Test Issues
```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Debug specific test
npm test -- --grep "test name"
```

### Release Issues
```bash
# Check git status
git status

# Verify tags
git tag --list

# Check changelog format
head -20 CHANGELOG.md
```

### CI/CD Issues
- Check GitHub Actions logs
- Verify secrets are configured
- Ensure npm token has publish permissions
- Check package.json versions match

## 📚 Additional Resources

- [RELEASE.md](RELEASE.md) - Detailed release process
- [README.md](README.md) - Package documentation
- [Conventional Commits](https://conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Pridepack Documentation](https://github.com/sst/pridepack)