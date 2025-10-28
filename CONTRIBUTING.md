# Contributing to Meridian

First off, thank you for considering contributing to Meridian! It's people like you that make Meridian such a great tool for the community.

## 🎯 Our Philosophy

Meridian exists to solve real problems faced by developers building modern e-commerce on the edge. We value:

- **Practical solutions** over theoretical perfection
- **Clear documentation** over clever code
- **Community input** over individual preferences
- **Production readiness** over experimental features

## 🚀 Ways to Contribute

### 1. Report Bugs 🐛

Found a bug? Please [open an issue](https://github.com/casualchic/medusa-payload-cloudflare/issues/new) with:

- **Clear title** - Summarize the issue in one line
- **Environment details** - Node version, pnpm version, OS
- **Steps to reproduce** - Minimal reproduction steps
- **Expected vs actual behavior** - What should happen vs what does happen
- **Screenshots/logs** - If applicable

**Good bug report example:**
```markdown
## Build fails on middleware patch with Next.js 15.1.0

**Environment:**
- Node: 20.19.0
- pnpm: 9.12.0
- Next.js: 15.1.0
- OS: macOS Sonoma 14.5

**Steps to reproduce:**
1. Clone repo
2. Run `pnpm build`
3. See error at middleware patching step

**Error:**
[paste error log]

**Expected:**
Build should complete successfully
```

### 2. Suggest Features ✨

Have an idea? [Start a discussion](https://github.com/casualchic/medusa-payload-cloudflare/discussions/new?category=ideas) with:

- **Problem statement** - What problem does this solve?
- **Proposed solution** - How would it work?
- **Alternatives considered** - What else did you think about?
- **Impact** - Who benefits and how?

### 3. Improve Documentation 📝

Documentation is crucial! You can help by:

- Fixing typos or clarifying existing docs
- Adding examples for common use cases
- Creating tutorials or guides
- Translating documentation
- Improving code comments

**No PR is too small for documentation improvements!**

### 4. Submit Code 💻

Ready to code? Great! Follow the process below.

## 🔧 Development Setup

### Prerequisites

- Node.js 20.19.0+
- pnpm 9+ or 10+
- Git
- A Cloudflare account (for testing deployments)

### Getting Started

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork:
   git clone https://github.com/YOUR_USERNAME/medusa-payload-cloudflare.git
   cd medusa-payload-cloudflare
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

5. **Start development**
   ```bash
   pnpm dev
   ```

## 🧪 Testing

**All PRs must include tests.** We use:

- **Vitest** for unit and integration tests
- **Playwright** for E2E tests

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit        # Fast unit tests
pnpm test:int         # Integration tests
pnpm test:workflows   # GitHub Actions tests
pnpm test:e2e         # Full E2E tests

# Run tests in watch mode
pnpm test:unit --watch
```

### Writing Tests

**Unit tests** - For pure functions and utilities:
```typescript
// src/lib/util/__tests__/money.test.ts
import { formatPrice } from '../money'

describe('formatPrice', () => {
  it('formats USD correctly', () => {
    expect(formatPrice(1999, 'USD')).toBe('$19.99')
  })
})
```

**Integration tests** - For API routes and data fetching:
```typescript
// tests/integration/cart.test.ts
import { createCart } from '@/lib/data/cart'

describe('Cart API', () => {
  it('creates a cart with region', async () => {
    const cart = await createCart({ regionId: 'us' })
    expect(cart).toHaveProperty('id')
  })
})
```

**E2E tests** - For full user flows:
```typescript
// tests/e2e/checkout.spec.ts
import { test, expect } from '@playwright/test'

test('complete checkout flow', async ({ page }) => {
  await page.goto('/')
  // ... full user journey
})
```

## 📐 Code Style

We use ESLint and TypeScript. Code style is enforced automatically.

```bash
# Check for linting issues
pnpm lint

# Type check
pnpm type-check
```

### Conventions

- **Use TypeScript** - Avoid `any` types
- **Functional components** - Use React Server Components where possible
- **Descriptive names** - `getUserCart()` not `getCart()`
- **Comments for "why"** not "what" - Code should be self-documenting
- **Export from index** - Use barrel exports for clean imports

**Good:**
```typescript
/**
 * Fetches cart with automatic region detection.
 * Falls back to US region if geolocation fails.
 */
export async function getUserCart(cartId?: string): Promise<Cart> {
  // Implementation
}
```

**Bad:**
```typescript
// Get cart
export async function gc(id?: string): Promise<any> {
  // Implementation
}
```

## 📝 Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting, missing semicolons, etc.)
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `perf:` - Performance improvement
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Examples

```bash
feat(cart): add guest checkout support
fix(build): resolve virtual filesystem path on Windows
docs(readme): add Medusa Cloud setup instructions
perf(products): implement Redis caching for product lists
```

## 🔀 Pull Request Process

### Before Submitting

- [ ] Tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm type-check`)
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG.md updated (for features/fixes)

### PR Template

When you create a PR, please include:

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How did you test this?

## Screenshots (if applicable)

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
```

### Review Process

1. **Automated checks** - GitHub Actions runs tests
2. **Code review** - Maintainer reviews your code
3. **Feedback** - Address any requested changes
4. **Approval** - Once approved, we'll merge!

**Review time:** We aim to review PRs within 3-5 business days.

## 🏗️ Architecture Guidelines

### Project Structure

```
src/
├── app/              # Next.js App Router
│   ├── (frontend)/  # Customer-facing routes
│   ├── (payload)/   # CMS admin routes
│   └── (storefront)/# E-commerce routes
├── blocks/          # Payload CMS content blocks
├── collections/     # Payload CMS collections
├── lib/
│   ├── data/       # Data fetching (Server Actions)
│   ├── hooks/      # React hooks
│   └── util/       # Utility functions
├── modules/        # Feature modules (cart, checkout, etc.)
└── styles/         # Global styles
```

### Key Patterns

**1. Server Components First**
```typescript
// app/(frontend)/products/page.tsx
export default async function ProductsPage() {
  const products = await getProducts() // Server-side fetch
  return <ProductGrid products={products} />
}
```

**2. Client Components When Needed**
```typescript
// modules/cart/add-to-cart.tsx
'use client'

export function AddToCartButton({ productId }: Props) {
  const [loading, setLoading] = useState(false)
  // Interactive UI
}
```

**3. Data Layer Separation**
```typescript
// lib/data/products.ts - Server-side only
export async function getProducts() {
  // Direct API calls
}

// modules/products/product-card.tsx - Can be used anywhere
export function ProductCard({ product }: Props) {
  // Presentation only
}
```

## 🎨 Adding New Features

### New Payload Block

1. Create block definition in `src/blocks/`
2. Add to `src/blocks/index.ts`
3. Create React component in `src/modules/blocks/`
4. Add to block renderer
5. Write tests
6. Document in README_PAGES.md

### New API Route

1. Create route in `src/app/api/`
2. Use proper error handling
3. Add rate limiting if needed
4. Write integration tests
5. Document in ADR if architectural

## 🐛 Debugging Tips

### Local Development

```bash
# Clear Next.js cache
rm -rf .next .open-next

# Rebuild from scratch
pnpm devsafe

# Check environment variables
node -e "console.log(process.env)"
```

### Cloudflare Workers

```bash
# Preview locally with wrangler
pnpm preview:local

# Check build output
ls -la .open-next/

# View worker logs
wrangler tail
```

## 💡 Need Help?

- **Documentation** - Check existing docs first
- **Discussions** - Ask questions in [GitHub Discussions](https://github.com/casualchic/medusa-payload-cloudflare/discussions)
- **Discord** - Join Medusa/Payload communities
- **Issues** - Search existing issues

## 🙏 Recognition

Contributors are recognized in:

- GitHub contributors page
- Release notes (for significant contributions)
- README acknowledgments (for major features)

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for making Meridian better!** 🎉

Every contribution, no matter how small, helps the community build better e-commerce experiences on the edge.
