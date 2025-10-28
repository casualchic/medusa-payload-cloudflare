# Meridian

**The optimal point for edge commerce**

> Production-ready Medusa + Payload CMS + Next.js 15 on Cloudflare Workers
> Run a complete e-commerce stack for **$5/month** instead of $60/month

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Payload CMS 3](https://img.shields.io/badge/Payload-3.61-blue)](https://payloadcms.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)

---

## 🎯 Why Meridian?

Just as a **meridian** represents the sun's highest point—peak performance—**Meridian Commerce** achieves the optimal balance between enterprise features and startup costs.

Meridian is the **first production-ready** implementation of Medusa.js e-commerce with Payload CMS running on Cloudflare Workers. We solved the hard problems so you don't have to:

- ✅ **Virtual filesystem** for Cloudflare Workers (no traditional file access)
- ✅ **Custom build patches** for Next.js compatibility
- ✅ **Edge runtime middleware** that actually works
- ✅ **D1 + R2 integration** with Payload CMS
- ✅ **12x cost reduction** vs Vercel/Railway

### The Problem We Solved

Traditional e-commerce stacks require Docker, VPS hosting, or expensive serverless platforms ($40-60/month minimum). Running Next.js + Payload + Medusa on Cloudflare Workers requires solving several technical challenges:

1. **No filesystem access** - Workers can't read files at runtime
2. **Import.meta.url undefined** - Breaks many Node.js modules
3. **Edge runtime limitations** - Dynamic code generation not allowed
4. **Build tool incompatibilities** - OpenNext.js needs patching for Workers

Meridian solves all of these with production-tested solutions.

---

## 💰 Cost Comparison

| Platform | Monthly Cost | Notes |
|----------|--------------|-------|
| **Cloudflare Workers** (Meridian) | **~$5** | D1 + R2 + Workers included |
| Vercel | $40-60 | Hobby limits too restrictive |
| Railway | $50-80 | Per-service pricing |
| DigitalOcean + Docker | $30-50 | Manual DevOps required |

**The Meridian advantage:** Peak performance at the optimal price point.

---

## 🏗️ Architecture

- **Frontend**: Next.js 15 with React 19 (Server Components)
- **CMS**: Payload CMS 3.61 with D1 SQLite database
- **E-commerce**: Medusa.js backend integration
- **Storage**: Cloudflare R2 for media assets
- **Database**: Cloudflare D1 (distributed SQLite)
- **Deployment**: Cloudflare Workers via OpenNext.js

### Key Technical Innovations

1. **Virtual Filesystem** (`scripts/patch-middleware-handler.cjs`)
   - Inlines all Next.js manifest files into the worker bundle
   - Intercepts `fs.readFileSync()` calls to serve from memory
   - Solves Workers' lack of traditional filesystem access

2. **Build Patches**
   - `scripts/patch-opentelemetry.cjs` - Removes telemetry (breaks in Workers)
   - `scripts/patch-middleware-tracer.cjs` - Fixes middleware bundling
   - `scripts/patch-middleware-handler.cjs` - Handles `import.meta.url` edge cases

3. **Edge-Compatible Middleware**
   - No dynamic code generation (`eval()`)
   - Simplified routing for Workers runtime
   - Compatible with Cloudflare's V8 isolates

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20.19.0+
- pnpm 9+ or 10+
- Cloudflare account (free tier works)
- Medusa backend (use [Medusa Cloud](https://medusajs.com/cloud/) or self-host)

### 1. Clone & Install

```bash
git clone https://github.com/casualchic/medusa-payload-cloudflare.git meridian
cd meridian
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Generate with: openssl rand -hex 32
PAYLOAD_SECRET=your-secret-here

# Your Medusa backend URL
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://your-medusa-backend.com
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_your-key-here

# Optional: For GDPR-compliant logging
LOG_SECRET=your-log-secret-here
```

### 3. Local Development

```bash
# Start dev server
pnpm dev

# Access at:
# - Storefront: http://localhost:3000
# - Admin Panel: http://localhost:3000/admin
```

### 4. Deploy to Cloudflare

```bash
# Authenticate
pnpm wrangler login

# Deploy (first time - creates D1 database & R2 bucket)
CLOUDFLARE_ENV=production pnpm run deploy

# Subsequent deploys
CLOUDFLARE_ENV=production pnpm run deploy:app
```

---

## 📦 What's Included

### ✅ Full E-commerce Features
- Product catalog with variants (size, color, etc.)
- Shopping cart with persistent state
- Multi-region support
- Customer accounts & order history
- Payment integration (Stripe ready)
- Responsive design (mobile-first)

### ✅ Content Management
- Payload CMS admin panel
- Flexible page builder with 7 content blocks:
  - Hero sections
  - Product showcases
  - Text content
  - Image galleries
  - CTAs
  - Video embeds
  - Testimonials
- R2-backed media library
- Version history & drafts

### ✅ Production Ready
- GitHub Actions CI/CD
- Comprehensive test suite (unit, integration, E2E)
- Security best practices
- Performance optimizations
- Monitoring setup guides

---

## 📚 Documentation

### Getting Started
- [Quick Start](#-quick-start) - Get running in 5 minutes
- [Environment Variables](docs/environment-variables.md) - Complete configuration guide
- [Deployment Guide](DEPLOYMENT_STEPS.md) - Step-by-step production deployment

### Architecture & Development
- [Pages Collection Guide](README_PAGES.md) - Flexible page builder system
- [Next.js RSC Patterns](NEXTJS_RSC_PATTERNS.md) - Server Components architecture
- [Deployment Learnings](DEPLOYMENT_LEARNINGS.md) - Key insights and solutions

### Operations
- [Monitoring Setup](docs/MONITORING_SETUP.md) - Alerts and dashboards
- [Security Enhancements](docs/SECURITY_ENHANCEMENTS.md) - Production hardening
- [Runbooks](docs/) - Operational procedures

### Advanced
- [Build Pipeline](BUILD_PIPELINE.md) - CI/CD and build optimization
- [Advanced Optimizations](ADVANCED_OPTIMIZATIONS.md) - Performance tuning
- [ADRs](docs/adr/) - Architectural decision records

---

## 🔧 Configuration

### Cloudflare Resources

Meridian automatically provisions:

- **D1 Database** - For Payload CMS data
- **R2 Bucket** - For media uploads
- **Workers** - For serverless compute

Configure in `wrangler.jsonc`:

```jsonc
{
  "name": "your-project-name",
  "compatibility_flags": [
    "nodejs_compat",
    "nodejs_compat_populate_process_env"
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "your-db-name"
    }
  ],
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "your-bucket-name"
    }
  ]
}
```

### Medusa Backend

You need a Medusa backend. Options:

1. **Medusa Cloud** (recommended for quick start)
   - Sign up at [medusajs.com/cloud](https://medusajs.com/cloud/)
   - Get publishable key from admin dashboard

2. **Self-hosted**
   - Follow [Medusa documentation](https://docs.medusajs.com/)
   - Deploy to Railway, Render, or DigitalOcean

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Individual test suites
pnpm test:unit        # Unit tests
pnpm test:int         # Integration tests
pnpm test:workflows   # GitHub Actions workflow tests
pnpm test:e2e         # End-to-end (Playwright)
```

---

## 🤝 Contributing

Contributions welcome! Meridian is open source because we believe in sharing knowledge and building together.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Commit with conventional commits (`feat:`, `fix:`, `docs:`, etc.)
6. Push and create a Pull Request

### Areas We'd Love Help With

- 🐛 Bug fixes and edge case handling
- 📝 Documentation improvements
- ✨ New Payload blocks/features
- 🎨 UI/UX enhancements
- 🔧 Cloudflare Workers optimizations
- 🌍 Internationalization

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 💼 Professional Services

Need help implementing Meridian for your business?

- **Quick Start Package** - Setup assistance and configuration
- **Custom Implementation** - Full design and integration
- **Ongoing Support** - Maintenance and updates

Contact: [Your contact info - update this]

---

## 🗺️ Roadmap

### Current (v1.0)
- ✅ Production-ready deployment
- ✅ Full e-commerce features
- ✅ Payload CMS integration
- ✅ Comprehensive documentation

### Planned (v1.1+)
- [ ] Payment provider examples (Stripe, PayPal)
- [ ] Multi-language support (i18n)
- [ ] Analytics integration guides
- [ ] More Payload blocks (FAQ, Blog, etc.)
- [ ] Storybook component library
- [ ] One-click deploy button

See [Issues](https://github.com/casualchic/medusa-payload-cloudflare/issues) for full roadmap.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

Built with ❤️ by [Ian Rothfuss](https://github.com/ianrothfuss)

---

## 🙏 Acknowledgments

Meridian builds on incredible open source projects:

- [Next.js](https://nextjs.org/) - The React framework
- [Payload CMS](https://payloadcms.com/) - Headless CMS
- [Medusa.js](https://medusajs.com/) - E-commerce engine
- [OpenNext.js](https://opennext.js.org/) - Cloudflare Workers adapter
- [Cloudflare](https://cloudflare.com/) - Edge infrastructure

---

## ⭐ Star History

If Meridian helps you build better commerce experiences, please consider starring the repo!

---

## 🔗 Links

- [Documentation](https://github.com/casualchic/medusa-payload-cloudflare/tree/main/docs)
- [Issues](https://github.com/casualchic/medusa-payload-cloudflare/issues)
- [Discussions](https://github.com/casualchic/medusa-payload-cloudflare/discussions)
- [Changelog](CHANGELOG.md)

---

**Meridian** - *The optimal point for edge commerce*

*Just as a meridian represents the sun's highest point, Meridian Commerce represents the peak of e-commerce efficiency—maximum performance at minimum cost.*
