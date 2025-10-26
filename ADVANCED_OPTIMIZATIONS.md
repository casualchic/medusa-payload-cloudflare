# Advanced Performance Optimizations

## Database Query Optimizations

### 1. Selective Field Fetching

```typescript
// ❌ BAD: Fetches all fields including large rich text
const page = await payload.findByID({
  collection: 'pages',
  id: pageId,
})

// ✅ GOOD: Only fetch needed fields
const page = await payload.findByID({
  collection: 'pages',
  id: pageId,
  select: {
    title: true,
    slug: true,
    content: true,
    seo: {
      title: true,
      description: true,
    },
  },
})
```

### 2. Depth Control for Relationships

```typescript
// ❌ BAD: Deep nesting causes multiple queries
const page = await payload.find({
  collection: 'pages',
  depth: 5, // Too deep!
})

// ✅ GOOD: Limit depth to what you need
const page = await payload.find({
  collection: 'pages',
  depth: 2, // Media and Products only
})
```

### 3. Pagination for Large Results

```typescript
// ❌ BAD: Fetches all pages
const { docs } = await payload.find({
  collection: 'pages',
})

// ✅ GOOD: Paginate results
const { docs, totalDocs, hasNextPage } = await payload.find({
  collection: 'pages',
  limit: 10,
  page: 1,
})
```

### 4. Index-Optimized Queries

```typescript
// ✅ BEST: Uses indexed fields (slug, status)
const page = await payload.find({
  collection: 'pages',
  where: {
    slug: { equals: 'home' }, // Indexed!
    status: { equals: 'published' }, // Indexed!
  },
  limit: 1,
})

// ⚠️ SLOW: Non-indexed field scan
const pages = await payload.find({
  collection: 'pages',
  where: {
    'seo.keywords': { contains: 'fashion' }, // Not indexed
  },
})
```

## React Performance Patterns

### 1. Conditional Client Components

```typescript
// components/blocks/FeaturedProductsBlock.tsx
import { ProductGrid } from './ProductGrid' // Server Component
import { ProductCarousel } from './ProductCarousel' // Client Component

export async function FeaturedProductsBlock(block) {
  const products = await fetchProducts(block)

  // Only use client component when needed
  if (block.layout === 'carousel') {
    return <ProductCarousel products={products} />
  }

  // Default to server component
  return <ProductGrid products={products} />
}
```

### 2. Progressive Enhancement

```typescript
// components/blocks/VideoBlock.tsx
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// Lazy load video player
const VideoPlayer = dynamic(() => import('./VideoPlayer'), {
  loading: () => <VideoPlaceholder />,
  ssr: false, // Client-side only
})

export function VideoBlock({ videoId, posterImage }) {
  const [isPlaying, setIsPlaying] = useState(false)

  if (!isPlaying) {
    return (
      <button onClick={() => setIsPlaying(true)}>
        <img src={posterImage} alt="Play video" />
      </button>
    )
  }

  return <VideoPlayer videoId={videoId} autoplay />
}
```

### 3. Intersection Observer for Lazy Loading

```typescript
// components/LazyBlock.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

export function LazyBlock({ children, threshold = 0.1 }) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  return (
    <div ref={ref}>
      {isVisible ? children : <div className="h-96" />}
    </div>
  )
}

// Usage
<LazyBlock>
  <TestimonialsBlock {...block} />
</LazyBlock>
```

## Image Optimization Advanced

### 1. Responsive Images with Art Direction

```typescript
// components/ResponsiveHero.tsx
import Image from 'next/image'

export function ResponsiveHero({ desktopImage, mobileImage }) {
  return (
    <picture>
      <source
        media="(min-width: 768px)"
        srcSet={desktopImage.src}
        width={1920}
        height={1080}
      />
      <Image
        src={mobileImage.src}
        alt={mobileImage.alt}
        width={768}
        height={1024}
        priority
      />
    </picture>
  )
}
```

### 2. Blur Placeholder Generation

```typescript
// lib/getImageProps.ts
import { getPlaiceholder } from 'plaiceholder'

export async function getImagePropsWithBlur(media: Media) {
  const { base64 } = await getPlaiceholder(media.url)

  return {
    src: media.url,
    alt: media.alt,
    width: media.width,
    height: media.height,
    blurDataURL: base64,
    placeholder: 'blur' as const,
  }
}
```

### 3. Cloudflare Image Resizing

```typescript
// lib/cloudflareImage.ts
export function cloudflareImageUrl(
  url: string,
  options: {
    width?: number
    height?: number
    fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'
    quality?: number
  }
) {
  const params = new URLSearchParams()
  if (options.width) params.set('width', options.width.toString())
  if (options.height) params.set('height', options.height.toString())
  if (options.fit) params.set('fit', options.fit)
  if (options.quality) params.set('quality', options.quality.toString())

  return `/cdn-cgi/image/${params.toString()}/${url}`
}

// Usage in component
<Image
  src={cloudflareImageUrl(media.url, { width: 800, quality: 85 })}
  alt={media.alt}
  width={800}
  height={600}
/>
```

## Caching Strategies

### 1. Multi-Layer Caching

```typescript
// lib/cache/pageCache.ts
import { unstable_cache } from 'next/cache'

// Layer 1: Next.js Data Cache (in-memory)
export const getPageFromDataCache = unstable_cache(
  async (slug: string) => {
    // Layer 2: Cloudflare KV Cache (edge)
    const cached = await getFromKV(`page:${slug}`)
    if (cached) return JSON.parse(cached)

    // Layer 3: Database
    const page = await fetchPageFromDB(slug)

    // Store in KV for next request
    await putInKV(`page:${slug}`, JSON.stringify(page), {
      expirationTtl: 3600, // 1 hour
    })

    return page
  },
  ['page-by-slug'],
  {
    revalidate: 3600,
    tags: (slug) => ['pages', `page-${slug}`],
  }
)
```

### 2. Stale-While-Revalidate Pattern

```typescript
// app/(storefront)/[slug]/page.tsx
export const revalidate = 3600 // 1 hour
export const fetchCache = 'force-cache'

// Cloudflare Workers configuration
export const runtime = 'edge'

export default async function Page({ params }: PageProps) {
  const page = await getCachedPage(params.slug)

  // Return stale content immediately
  // Revalidate in background
  return <RenderBlocks blocks={page.content} />
}
```

### 3. Cache Invalidation on Update

```typescript
// src/collections/Pages.ts
import { revalidateTag } from 'next/cache'

export const Pages: CollectionConfig = {
  slug: 'pages',
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        // Revalidate Next.js cache
        if (doc.status === 'published') {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/revalidate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                secret: process.env.REVALIDATION_SECRET,
                tag: `page-${doc.slug}`,
              }),
            })
          } catch (error) {
            req.payload.logger.error('Failed to revalidate cache', error)
          }
        }
      },
    ],
  },
  // ... rest of config
}
```

```typescript
// app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { secret, tag } = await request.json()

  if (secret !== process.env.REVALIDATION_SECRET) {
    return new Response('Invalid secret', { status: 401 })
  }

  revalidateTag(tag)
  return Response.json({ revalidated: true, now: Date.now() })
}
```

## Bundle Optimization

### 1. Dynamic Imports for Heavy Blocks

```typescript
// components/RenderBlocks.tsx
import dynamic from 'next/dynamic'

// Lazy load heavy interactive blocks
const VideoBlockDynamic = dynamic(() => import('./blocks/VideoBlock'), {
  loading: () => <BlockSkeleton />,
  ssr: false,
})

const ImageGalleryClientDynamic = dynamic(
  () => import('./blocks/ImageGalleryClient'),
  {
    loading: () => <GallerySkeleton />,
    ssr: false,
  }
)

export function RenderBlocks({ blocks }: RenderBlocksProps) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.blockType) {
          case 'video':
            return <VideoBlockDynamic key={index} {...block} />
          case 'imageGallery':
            if (block.layout === 'carousel') {
              return <ImageGalleryClientDynamic key={index} {...block} />
            }
            return <ImageGalleryBlock key={index} {...block} />
          default:
            // ... other blocks
        }
      })}
    </>
  )
}
```

### 2. Tree Shaking with Barrel Exports

```typescript
// ❌ BAD: Imports entire barrel file
import { HeroBlock } from '@/blocks'

// ✅ GOOD: Direct import
import { HeroBlock } from '@/blocks/HeroBlock'

// Or configure in tsconfig.json for better tree shaking
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler"
  }
}
```

### 3. Code Splitting by Route

```typescript
// app/(storefront)/[slug]/page.tsx
export const dynamic = 'force-static' // Pre-render at build time
export const dynamicParams = true // Allow runtime params

// Only load page-specific code
const page = await import(`@/content/pages/${params.slug}`)
```

## Monitoring & Analytics

### 1. Real User Monitoring

```typescript
// components/RUM.tsx
'use client'

import { useEffect } from 'react'
import { useReportWebVitals } from 'next/web-vitals'

export function RUM() {
  useReportWebVitals((metric) => {
    // Send to analytics
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        label: metric.label,
        rating: metric.rating,
      }),
    })
  })

  return null
}

// app/layout.tsx
import { RUM } from '@/components/RUM'

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <RUM />
      </body>
    </html>
  )
}
```

### 2. Performance Budgets

```typescript
// next.config.ts
const config = {
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'TTFB', 'INP'],
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Set performance budgets
      config.performance = {
        maxAssetSize: 200000, // 200 KB
        maxEntrypointSize: 300000, // 300 KB
        hints: 'error',
      }
    }
    return config
  },
}
```

### 3. Lighthouse CI Integration

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install && npm run build
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://preview.example.com/
            https://preview.example.com/about
          uploadArtifacts: true
          budgetPath: ./budget.json
```

```json
// budget.json
{
  "performance": 95,
  "accessibility": 100,
  "best-practices": 95,
  "seo": 100,
  "first-contentful-paint": 1800,
  "largest-contentful-paint": 2500,
  "cumulative-layout-shift": 0.1,
  "total-blocking-time": 200
}
```

## Edge Computing Optimizations

### 1. Smart Placement (Cloudflare)

```typescript
// middleware.ts
import { NextResponse } from 'next/server'

export function middleware(request: Request) {
  const response = NextResponse.next()

  // Let Cloudflare choose optimal location
  response.headers.set('cf-placement', 'auto')

  return response
}
```

### 2. Geolocation-Based Content

```typescript
// app/(storefront)/[slug]/page.tsx
import { headers } from 'next/headers'

export default async function Page({ params }: PageProps) {
  const headersList = await headers()
  const country = headersList.get('cf-ipcountry') || 'US'
  const city = headersList.get('cf-ipcity')

  const page = await getPageWithGeo(params.slug, { country, city })

  return <RenderBlocks blocks={page.content} geo={{ country, city }} />
}
```

### 3. Edge KV for Hot Data

```typescript
// lib/edgeCache.ts
export async function getHotPages() {
  const env = process.env as CloudflareEnv

  // Try KV first (sub-millisecond reads)
  const cached = await env.KV?.get('hot-pages')
  if (cached) return JSON.parse(cached)

  // Fallback to D1
  const pages = await fetchHotPagesFromD1()

  // Store in KV for 5 minutes
  await env.KV?.put('hot-pages', JSON.stringify(pages), {
    expirationTtl: 300,
  })

  return pages
}
```

## Database Connection Pooling

```typescript
// lib/db/pool.ts
import { getPayload } from 'payload'
import config from '@/payload.config'

// Singleton pattern for Payload instance
let cachedPayload: Awaited<ReturnType<typeof getPayload>> | null = null

export async function getPayloadClient() {
  if (cachedPayload) return cachedPayload

  cachedPayload = await getPayload({ config })
  return cachedPayload
}

// Usage
const payload = await getPayloadClient()
const page = await payload.find({ collection: 'pages', ... })
```

## Summary

These advanced optimizations provide:

- ✅ **Query Performance**: Selective fields, depth control, indexed queries
- ✅ **React Performance**: Conditional client components, progressive enhancement
- ✅ **Image Optimization**: Art direction, blur placeholders, Cloudflare resizing
- ✅ **Caching**: Multi-layer (Next.js + KV + D1), SWR, smart invalidation
- ✅ **Bundle Size**: Dynamic imports, tree shaking, code splitting
- ✅ **Monitoring**: RUM, performance budgets, Lighthouse CI
- ✅ **Edge Computing**: Smart placement, geolocation, KV hot data

**Expected Results**:
- LCP: < 2.0s (was < 2.5s)
- CLS: < 0.05 (was < 0.1)
- FID/INP: < 50ms (was < 100ms)
- Bundle: ~70 KB (was ~90 KB)
- TTFB: < 100ms (edge caching)

**Performance Score**: 98+ on Lighthouse (mobile)
