# GitHub Workflows Tests

This directory contains comprehensive unit tests for GitHub Actions workflow files.

## Overview

The tests validate the configuration, structure, and behavior of GitHub Actions workflows to ensure:
- Correct YAML syntax
- Proper trigger configurations
- Security best practices (permissions, secrets handling)
- Optimization strategies (caching, conditional execution)
- Consistency across workflows

## Test Files

### `github-workflows.test.ts`

Comprehensive test suite covering:

#### Claude Code Review Workflow (`claude-code-review.yml`)
- **Path Filters**: Validates that the workflow only triggers on source code changes (`.ts`, `.tsx`, `.js`, `.jsx`, `.css`, `.scss`, `package.json`, `pnpm-lock.yaml`)
- **Security**: Checks minimal permissions (read-only for most, write for id-token)
- **Performance**: Validates shallow clone (`fetch-depth: 1`)
- **Configuration**: Ensures proper Claude Code Action setup with allowed tools

#### Deploy Workflow (`deploy.yml`)
- **Caching Strategy**: Validates both pnpm store and Next.js build caching
- **Build Configuration**: Ensures webpack flag, memory allocation, and proper environment variables
- **Conditional Deployment**: Verifies deployment only happens on main branch
- **Secret Fallbacks**: Checks that `PAYLOAD_SECRET` has fallback for CI/PR builds
- **PR Builds**: Validates that build step runs on PRs (changed from previous behavior)

#### Cross-Workflow Validation
- Consistent action versions
- Security best practices (no hardcoded credentials)
- Common runner configuration

## Running Tests

### Run all workflow tests:
```bash
pnpm run test:workflows
```

### Run all tests (including workflows):
```bash
pnpm run test
```

### Run workflow tests in watch mode:
```bash
pnpm exec vitest --config ./vitest.config.mts tests/workflows
```

### Run specific test suite:
```bash
pnpm exec vitest run tests/workflows/github-workflows.test.ts
```

## Test Structure

Each test follows the pattern:
1. Load workflow file content
2. Parse and validate specific sections
3. Check for expected configurations
4. Verify security and optimization patterns

## Key Changes Tested

The test suite specifically validates these optimizations made in the current branch:

### Claude Code Review Workflow
- ✅ Path filters are enabled (not commented out)
- ✅ Includes CSS/SCSS files in path filters
- ✅ Includes dependency files (package.json, pnpm-lock.yaml)

### Deploy Workflow
- ✅ Next.js build cache added
- ✅ Cache key includes source file hashing
- ✅ Build step runs on PRs (removed `if: github.ref == 'refs/heads/main'`)
- ✅ PAYLOAD_SECRET has fallback value for CI
- ✅ Explanatory comment about PR builds

## Adding New Tests

When adding tests for new workflow changes:

1. Add a descriptive test in the appropriate `describe` block
2. Use regex or string matching to validate specific YAML content
3. Check both positive cases (what should exist) and negative cases (what shouldn't exist)
4. Consider security implications
5. Validate optimization strategies

Example:
```typescript
it('should have new optimization feature', () => {
  expect(deployWorkflowContent).toContain('new-feature: enabled')
  expect(deployWorkflowContent).not.toContain('deprecated-feature')
})
```

## CI Integration

These tests run as part of the main test suite in CI:
- Validates workflow syntax before merge
- Catches configuration regressions
- Ensures security best practices are maintained

## Dependencies

Tests use:
- **Vitest**: Test runner and assertion library
- **Node.js fs**: File system operations to read workflow files
- No external YAML parsers (intentional to avoid dependencies)

## Notes

- Tests validate actual file content, not runtime behavior
- YAML parsing is simplified (doesn't handle all YAML features)
- Focus is on configuration validation, not GitHub Actions execution
- Tests are designed to fail fast if workflows are misconfigured