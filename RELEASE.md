# Release Process

This document explains how to release the @doeixd/events monorepo, which contains multiple packages.

## Packages

- **@doeixd/events** (main package) - Core reactive event system
- **@doeixd/react** (React package) - React hooks for seamless integration

## Versioning Strategy

All packages share the same version number and are released together. This ensures compatibility between the main package and framework-specific integrations.

## Release Process

### Automated Release (Recommended)

1. **Create a release commit:**
   ```bash
   npm run release
   ```
   This runs `standard-version` which:
   - Analyzes commits since last release
   - Updates CHANGELOG.md
   - Bumps version in package.json
   - Creates a git tag

2. **Push the changes:**
   ```bash
   git push --follow-tags origin master
   ```

3. **GitHub Actions will automatically:**
   - Build both packages
   - Publish @doeixd/events to npm
   - Publish @doeixd/react to npm
   - Create a GitHub release with changelog
   - Upload build artifacts

### Manual Release

If you need to release manually:

1. **Update versions:**
   ```bash
   # Update main package version
   npm version <major|minor|patch>

   # Update React package version to match
   cd packages/react
   npm version <same-version>
   cd ../..
   ```

2. **Build packages:**
   ```bash
   # Build main package
   npm run build

   # Build React package
   cd packages/react
   npm ci
   npm run build
   cd ../..
   ```

3. **Publish packages:**
   ```bash
   # Publish main package
   npm publish

   # Publish React package
   cd packages/react
   npm publish
   cd ../..
   ```

4. **Create GitHub release manually if needed**

## Commit Convention

This project uses [Conventional Commits](https://conventionalcommits.org/) for automated versioning:

- `fix: ...` - Patch release
- `feat: ...` - Minor release
- `BREAKING CHANGE: ...` - Major release

## Package Dependencies

- **@doeixd/react** has `@doeixd/events` as a peer dependency
- Both packages are published independently but versioned together
- The React package builds with its own TypeScript configuration

## Troubleshooting

### Build Issues

- Ensure all dependencies are installed: `npm ci`
- Check TypeScript errors: `npm run type-check`
- For React package: `cd packages/react && npm run type-check`

### Publish Issues

- Check npm token permissions
- Ensure package names don't conflict
- Verify package.json configurations

### Version Sync Issues

- Both packages must have the same version
- Update both package.json files manually if needed
- Use `npm version` to update both packages

## CI/CD

The GitHub Actions workflow (`.github/workflows/npm-publish.yml`) handles:

1. Building both packages
2. Publishing to npm registry
3. Creating GitHub releases
4. Uploading build artifacts

The workflow triggers on version tags (`v*`) and requires:
- `NPM_TOKEN` secret for publishing
- `GITHUB_TOKEN` for creating releases