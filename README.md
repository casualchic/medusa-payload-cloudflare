# Casual Chic Boutique - Cloudflare Storefront

A modern e-commerce storefront built with Next.js, Payload CMS, and Medusa, deployed on Cloudflare Workers. This project combines the power of Medusa's e-commerce backend with Payload CMS for content management, all running on Cloudflare's edge infrastructure.

## 🏗️ Architecture

- **Frontend**: Next.js 15 with React 19
- **CMS**: Payload CMS 3.59.1 with Cloudflare D1 database
- **E-commerce**: Medusa.js integration
- **Storage**: Cloudflare R2 for media assets
- **Database**: Cloudflare D1 (SQLite)
- **Deployment**: Cloudflare Workers with OpenNext.js

## 🚀 How to Run

### Prerequisites

- Node.js 18.20.2+ or 20.9.0+
- pnpm 9+ or 10+
- Cloudflare account with Wrangler CLI

### Local Development

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Authenticate with Cloudflare:**
   ```bash
   pnpm wrangler login
   ```

3. **Set up environment variables:**
   Create a `.env.local` file with:
   ```bash
   PAYLOAD_SECRET=your-secret-key-here
   DATABASE_URI=file:./dev.db
   NEXT_PUBLIC_SERVER_URL=http://localhost:3000
   NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
   ```

4. **Start the development server:**
   ```bash
   # Standard development
   pnpm dev
   
   # Development with local port 8000
   pnpm dev:local
   
   # Development with production environment
   pnpm dev:cloud
   ```

5. **Access the application:**
   - Storefront: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

### Production Deployment

#### Manual Deployment
```bash
CLOUDFLARE_ENV=production pnpm run deploy:app
```

#### GitHub Actions CI/CD (Recommended)
1. **Set up GitHub repository:**
   ```bash
   git remote add origin https://github.com/yourusername/cc3-storefront-cloudflare.git
   git push -u origin main
   ```

2. **Configure GitHub Secrets:**
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
     - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

3. **Automatic deployments:**
   - Push to `main` branch triggers automatic deployment
   - Pull requests trigger tests without deployment

#### Current Live URLs
- **Storefront**: https://cc3-storefront.ian-rothfuss.workers.dev/us
- **Admin Panel**: https://cc3-storefront.ian-rothfuss.workers.dev/admin
- **Medusa Backend**: https://casual-chic.medusajs.app

## 🧪 How to Test

### Run All Tests
```bash
pnpm test
```

### Run Integration Tests
```bash
pnpm test:int
```

### Run End-to-End Tests
```bash
pnpm test:e2e
```

### Run Tests with Coverage
```bash
pnpm test -- --coverage
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── (frontend)/        # Main frontend routes
│   ├── (payload)/         # Payload CMS admin
│   └── (storefront)/      # E-commerce storefront
├── collections/           # Payload CMS collections
├── lib/                   # Utility libraries
│   ├── data/             # Data fetching functions
│   ├── hooks/            # Custom React hooks
│   └── util/             # Utility functions
├── modules/              # Feature modules
│   ├── account/          # User account management
│   ├── cart/             # Shopping cart functionality
│   ├── checkout/         # Checkout process
│   ├── products/         # Product display
│   └── layout/           # Layout components
└── styles/               # Global styles
```

## 🛠️ Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm test` - Run all tests
- `pnpm deploy` - Deploy to Cloudflare
- `pnpm payload` - Access Payload CLI

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PAYLOAD_SECRET` | Secret key for Payload CMS | Yes |
| `DATABASE_URI` | Database connection string | Yes |
| `NEXT_PUBLIC_SERVER_URL` | Public server URL | Yes |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | Medusa backend URL | Yes |

### Cloudflare Configuration

The project is configured to work with:
- **D1 Database**: For Payload CMS data storage
- **R2 Storage**: For media assets and uploads
- **Workers**: For serverless deployment

## 📦 Key Features

- 🛒 **Full E-commerce**: Product catalog, cart, checkout, orders
- 👤 **User Management**: Registration, login, account management
- 📱 **Responsive Design**: Mobile-first approach
- 🎨 **Modern UI**: Built with Tailwind CSS and Radix UI
- ⚡ **Edge Performance**: Deployed on Cloudflare's global network
- 🔒 **Secure**: Built-in authentication and authorization
- 📊 **Admin Panel**: Payload CMS for content management

## ✅ Current Status

**🎉 FULLY FUNCTIONAL DEPLOYMENT**
- ✅ **Storefront**: Working with Medusa integration
- ✅ **Admin Panel**: Payload CMS fully functional
- ✅ **Database**: D1 SQLite database connected
- ✅ **Storage**: R2 bucket for media assets
- ✅ **Environment**: Properly configured for production

## 🔑 Key Learnings

### Critical Discovery: Publishable Keys vs Secrets
- **❌ WRONG**: Treating publishable keys as Cloudflare secrets
- **✅ CORRECT**: Configure as regular environment variables in `wrangler.jsonc`
- **Why**: Publishable keys are meant to be public and accessible to client-side code

### Environment Variable Access
- Required `nodejs_compat_populate_process_env` flag in Cloudflare Workers
- Temporary solution: Hardcoded publishable keys in data files
- Next step: Investigate proper runtime environment variable access

### Database Binding Configuration
- Database binding names must match between `wrangler.jsonc` and `payload.config.ts`
- Current: `"DB"` binding for D1 database

📖 **See [DEPLOYMENT_LEARNINGS.md](./DEPLOYMENT_LEARNINGS.md) for comprehensive documentation**

## 🚀 Deployment

This project is optimized for Cloudflare Workers deployment:

1. **Cost Effective**: ~$5/month vs $40-60/month on other platforms
2. **Global Performance**: Edge deployment worldwide
3. **Automatic Scaling**: Serverless architecture
4. **Integrated Services**: D1, R2, and Workers in one platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests to ensure everything works
5. Submit a pull request

## 📄 License

This project is proprietary software owned by Casual Chic Commerce LLC.

## 🆘 Support

For support and questions:
- Check the [deployment guide](./DEPLOYMENT_STEPS.md)
- Review Cloudflare Workers documentation
- Contact the development team

---

Built with ❤️ by Ian Rothfuss and Casual Chic Commerce LLC
