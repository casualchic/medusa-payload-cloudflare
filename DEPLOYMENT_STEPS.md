# Cloudflare Deployment - Step by Step

## ✅ Completed So Far

1. ✅ Cloned Payload Cloudflare D1 template
2. ✅ Installed dependencies (npm install)
3. ✅ Installed Wrangler CLI globally
4. ✅ Authenticated with Cloudflare (`wrangler login`)
5. ✅ Created D1 database (database_id: ff3f3e29-01bf-4ffa-9826-3897676844b2)
6. ✅ Updated wrangler.jsonc with database_id and app name
7. ✅ Created R2 bucket (cc3-media)
8. ✅ Generated Payload secret and created .env.local
9. ✅ Added Medusa product collections (Products, ProductVariants, ProductOptions)
10. ✅ Updated payload.config.ts to register collections

## 🚀 Next Steps

### Step 8: Test Locally

```bash
cd /Users/Owner/cc3-storefront-cloudflare
wrangler d1 create cc3-payload-db
```

This will output something like:
```
[[d1_databases]]
binding = "DB"
database_name = "cc3-payload-db"
database_id = "xxxx-xxxx-xxxx-xxxx"
```

**Copy the `database_id` - we'll need it next!**

### Step 4: Update wrangler.jsonc

Edit `wrangler.jsonc` and replace the database_id:

```jsonc
{
  "name": "cc3-storefront",
  //... other config
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "cc3-payload-db",
      "database_id": "YOUR_DATABASE_ID_HERE"  // <- Paste here
    }
  ]
}
```

### Step 5: Create R2 Bucket

```bash
wrangler r2 bucket create cc3-media
```

### Step 6: Configure Environment Variables

Generate a secure Payload secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Create `.env.local`:
```bash
cat > .env.local << 'EOF'
PAYLOAD_SECRET=<paste-your-generated-secret>
DATABASE_URI=file:./dev.db
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
EOF
```

### Step 7: Add Medusa Product Collections

We need to add 3 collections for Medusa sync:
- Products
- ProductVariants
- ProductOptions

These are available in your Medusa repo at:
- `/private/tmp/payload-collections/Products.ts`
- `/private/tmp/payload-collections/ProductVariants.ts`
- `/private/tmp/payload-collections/ProductOptions.ts`

### Step 8: Test Locally

```bash
npm run dev
```

Visit:
- Frontend: http://localhost:3000
- Payload Admin: http://localhost:3000/admin

Create your first admin user and test image upload.

### Step 9: Deploy to Cloudflare

```bash
npm run build
npm run deploy
```

### Step 10: Configure Production Variables

```bash
wrangler secret put PAYLOAD_SECRET
# Paste your secret when prompted
```

### Step 11: Test in Production

Visit your deployment URL and verify everything works!

---

## Architecture

```
Cloudflare Pages + Workers
├── D1 Database (Payload CMS data)
├── R2 Storage (Product images)
└── Next.js + Payload CMS

Connected to:
└── Medusa Backend (localhost:9000 for now)
```

## Cost

- Workers Paid: $5/month (required for bundle size)
- D1: $0 (free tier)
- R2: $0 (free tier)
- **Total: $5/month**

vs Vercel: $40-60/month
**Savings: $35-55/month**

---

Ready to continue? Let's create the D1 database!
