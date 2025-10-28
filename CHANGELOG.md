# Changelog

All notable changes to Meridian will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-27

### 🎉 Initial Open Source Release

Meridian is now open source! This is the first production-ready implementation of Medusa + Payload CMS + Next.js 15 on Cloudflare Workers.

### ✨ Features

#### Core Platform
- **Next.js 15** with React 19 Server Components
- **Payload CMS 3.61** with full admin panel
- **Medusa.js** e-commerce integration
- **Cloudflare Workers** deployment via OpenNext.js
- **Cloudflare D1** SQLite database
- **Cloudflare R2** object storage

#### E-commerce Features
- Product catalog with variants (size, color, material)
- Shopping cart with persistent state
- Multi-region support (US, EU, etc.)
- Customer account management
- Order history and tracking
- Stripe payment integration (ready)
- Responsive mobile-first design

#### Content Management
- Flexible page builder with 7 content blocks:
  - Hero sections with CTAs
  - Featured product showcases
  - Rich text content
  - Image galleries
  - Call-to-action blocks
  - Video embeds
  - Testimonials
- Media library with R2 storage
- Draft and publish workflow
- Version history

#### Technical Innovations
- **Virtual filesystem implementation** for Cloudflare Workers
  - Inlines Next.js manifest files into worker bundle
  - Intercepts `fs.readFileSync()` to serve from memory
  - Solves Workers' lack of traditional filesystem access
- **Custom build patches**:
  - OpenTelemetry removal (incompatible with Workers)
  - Middleware tracer compatibility fixes
  - `import.meta.url` edge case handling
- **Edge-compatible middleware** without dynamic code generation
- **Optimized bundling** for Cloudflare's V8 isolates

#### Developer Experience
- Comprehensive test suite (unit, integration, E2E)
- GitHub Actions CI/CD pipeline
- Local development with hot reload
- TypeScript throughout
- ESLint and Prettier configured
- Detailed documentation and guides

### 📚 Documentation

- Complete README with quick start guide
- Architecture decision records (ADRs)
- Deployment guide with step-by-step instructions
- Deployment learnings and troubleshooting
- Pages collection implementation guide
- Next.js RSC patterns documentation
- Build pipeline documentation
- Advanced optimizations guide
- Security enhancements guide
- Monitoring and runbooks

### 🔧 Infrastructure

- Automated deployments via GitHub Actions
- D1 database migrations
- R2 bucket configuration
- Environment-based deployments (staging, production)
- Secret management best practices

### 🎯 Cost Optimization

- **~$5/month** total hosting cost on Cloudflare
- 12x cheaper than traditional platforms (Vercel, Railway)
- Automatic global edge deployment
- Pay-per-use pricing model

---

## Future Releases

See [GitHub Issues](https://github.com/casualchic/medusa-payload-cloudflare/issues) for planned features.

### Planned for v1.1

- Payment provider examples (Stripe, PayPal complete guides)
- Multi-language support (i18n)
- Analytics integration examples
- Additional Payload blocks (FAQ, Blog, Reviews)
- Storybook component library
- One-click deploy button

### Under Consideration

- Product reviews and ratings
- Wishlist functionality
- Advanced product filtering
- Email templates (order confirmation, shipping updates)
- Admin dashboard analytics
- Product search with Algolia/Meilisearch
- SEO optimizations and sitemap generation

---

[1.0.0]: https://github.com/casualchic/medusa-payload-cloudflare/releases/tag/v1.0.0
