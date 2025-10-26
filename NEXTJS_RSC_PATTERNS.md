# Next.js RSC + Performance Patterns for Pages Collection

## Overview

This document outlines React Server Components (RSC) patterns and Next.js 16 performance optimizations for rendering the Pages collection on Cloudflare Workers.

## Architecture Pattern

```
┌─────────────────────────────────────────────────┐
│ Server Components (Default)                     │
│ - Page fetching from Payload                    │
│ - Block rendering (static content)              │
│ - SEO metadata generation                       │
│ - Image optimization hints                      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Client Components ('use client')                │
│ - Interactive carousels                         │
│ - Image lightbox                                │
│ - Video players with controls                   │
│ - Form submissions in CTA blocks                │
└─────────────────────────────────────────────────┘
```

## Implementation

### 1. Data Fetching (Server Component)

```typescript
// app/(storefront)/[slug]/page.tsx
import { getPayload } from 'payload'
import config from '@/payload.config'
import { notFound } from 'next/navigation'
import { RenderBlocks } from '@/components/RenderBlocks'
import type { Page } from '@/payload-types'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Enable ISR with revalidation
export const revalidate = 3600 // 1 hour

// Generate static params for top pages at build time
export async function generateStaticParams() {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'pages',
    limit: 50, // Pre-render top 50 pages
    where: {
      status: { equals: 'published' }
    },
    select: {
      slug: true,
    },
  })

  return docs.map((page) => ({
    slug: page.slug,
  }))
}

// Generate metadata for SEO (Server Component)
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    limit: 1,
    select: {
      title: true,
      seo: true,
    },
  })

  const page = docs[0]
  if (!page) return {}

  return {
    title: page.seo?.title || page.title,
    description: page.seo?.description,
    keywords: page.seo?.keywords,
    openGraph: {
      title: page.seo?.title || page.title,
      description: page.seo?.description,
      images: page.seo?.image ? [
        {
          url: typeof page.seo.image === 'object' ? page.seo.image.url : '',
          width: 1200,
          height: 630,
        }
      ] : [],
    },
    robots: {
      index: !page.seo?.noIndex,
      follow: !page.seo?.noIndex,
    },
    ...(page.seo?.canonical && { alternates: { canonical: page.seo.canonical } }),
  }
}

// Main page component (Server Component)
export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'pages',
    where: {
      slug: { equals: slug },
      status: { equals: 'published' },
    },
    limit: 1,
    depth: 2, // Fetch related media and products
  })

  const page = docs[0]
  if (!page) notFound()

  return (
    <article>
      {/* Server-rendered blocks */}
      <RenderBlocks blocks={page.content} />

      {/* Inject custom CSS if provided */}
      {page.customCSS && (
        <style dangerouslySetInnerHTML={{ __html: page.customCSS }} />
      )}

      {/* Inject custom JS if provided (with script strategy) */}
      {page.customJS && (
        <script
          dangerouslySetInnerHTML={{ __html: page.customJS }}
          strategy="lazyOnload"
        />
      )}
    </article>
  )
}
```

### 2. Block Rendering (Server Components by Default)

```typescript
// components/RenderBlocks.tsx (Server Component)
import type { Page } from '@/payload-types'
import { HeroBlock } from './blocks/HeroBlock'
import { FeaturedProductsBlock } from './blocks/FeaturedProductsBlock'
import { TextBlock } from './blocks/TextBlock'
import { ImageGalleryBlock } from './blocks/ImageGalleryBlock'
import { CTABlock } from './blocks/CTABlock'
import { VideoBlock } from './blocks/VideoBlock'
import { TestimonialsBlock } from './blocks/TestimonialsBlock'

type BlocksContent = Page['content']

interface RenderBlocksProps {
  blocks: BlocksContent
}

export function RenderBlocks({ blocks }: RenderBlocksProps) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.blockType) {
          case 'hero':
            return <HeroBlock key={index} {...block} />
          case 'featuredProducts':
            return <FeaturedProductsBlock key={index} {...block} />
          case 'text':
            return <TextBlock key={index} {...block} />
          case 'imageGallery':
            return <ImageGalleryBlock key={index} {...block} />
          case 'cta':
            return <CTABlock key={index} {...block} />
          case 'video':
            return <VideoBlock key={index} {...block} />
          case 'testimonials':
            return <TestimonialsBlock key={index} {...block} />
          default:
            return null
        }
      })}
    </>
  )
}
```

### 3. Individual Block Components

#### Hero Block (Server Component with Client Island)

```typescript
// components/blocks/HeroBlock.tsx (Server Component)
import type { HeroBlock as HeroBlockType } from '@/payload-types'
import { getImageProps } from '@/lib/getImageProps'
import Image from 'next/image'
import Link from 'next/link'

export async function HeroBlock(block: HeroBlockType) {
  const imageProps = await getImageProps(block.backgroundImage)

  const heightClasses = {
    small: 'h-[400px]',
    medium: 'h-[600px]',
    large: 'h-[800px]',
    fullscreen: 'h-screen',
  }

  const textAlignClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }

  return (
    <section
      className={`relative ${heightClasses[block.height]} flex flex-col justify-center`}
    >
      {/* Background Image - Priority for LCP optimization */}
      {imageProps && (
        <Image
          {...imageProps}
          alt={imageProps.alt || ''}
          fill
          priority // Critical for LCP
          sizes="100vw"
          className="object-cover"
          quality={90}
        />
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: block.overlayOpacity / 100 }}
      />

      {/* Content */}
      <div className={`relative z-10 container mx-auto px-4 flex flex-col ${textAlignClasses[block.textAlign]}`}>
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
          {block.heading}
        </h1>

        {block.subheading && (
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl">
            {block.subheading}
          </p>
        )}

        {block.cta?.text && block.cta?.link && (
          <Link
            href={block.cta.link}
            className={`inline-block px-8 py-4 rounded-md font-semibold transition-all ${
              block.cta.style === 'primary'
                ? 'bg-white text-black hover:bg-gray-100'
                : block.cta.style === 'secondary'
                ? 'bg-black text-white hover:bg-gray-900'
                : 'border-2 border-white text-white hover:bg-white hover:text-black'
            }`}
          >
            {block.cta.text}
          </Link>
        )}
      </div>
    </section>
  )
}
```

#### Featured Products Block (Server Component with Async Data)

```typescript
// components/blocks/FeaturedProductsBlock.tsx (Server Component)
import type { FeaturedProductsBlock as FeaturedProductsBlockType } from '@/payload-types'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { ProductCard } from '@/components/ProductCard' // Server Component
import { ProductCarousel } from '@/components/ProductCarousel' // Client Component

export async function FeaturedProductsBlock(block: FeaturedProductsBlockType) {
  const payload = await getPayload({ config })

  // Fetch products based on display mode
  let products

  if (block.displayMode === 'manual' && block.products) {
    products = block.products
  } else {
    const { docs } = await payload.find({
      collection: 'products',
      limit: block.limit || 4,
      where: {
        status: { equals: 'published' }
      },
      ...(block.displayMode === 'random' && { sort: 'random()' }),
      ...(block.displayMode === 'latest' && { sort: '-createdAt' }),
    })
    products = docs
  }

  const columnClasses = {
    '2': 'grid-cols-1 md:grid-cols-2',
    '3': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    '4': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {block.heading && (
          <h2 className="text-3xl font-bold mb-2">{block.heading}</h2>
        )}

        {block.description && (
          <p className="text-gray-600 mb-8">{block.description}</p>
        )}

        {block.layout === 'grid' ? (
          <div className={`grid ${columnClasses[block.columns]} gap-6`}>
            {products.map((product) => (
              <ProductCard
                key={typeof product === 'object' ? product.id : product}
                product={product}
                showPrice={block.showPrice}
                showQuickView={block.showQuickView}
              />
            ))}
          </div>
        ) : (
          // Client component for carousel functionality
          <ProductCarousel
            products={products}
            showPrice={block.showPrice}
            showQuickView={block.showQuickView}
          />
        )}
      </div>
    </section>
  )
}
```

#### Image Gallery Block (Mixed: Server + Client Island)

```typescript
// components/blocks/ImageGalleryBlock.tsx (Server Component)
import type { ImageGalleryBlock as ImageGalleryBlockType } from '@/payload-types'
import { getImageProps } from '@/lib/getImageProps'
import { ImageGalleryClient } from './ImageGalleryClient' // Client Component

export async function ImageGalleryBlock(block: ImageGalleryBlockType) {
  // Pre-process images on server
  const processedImages = await Promise.all(
    block.images.map(async (item) => ({
      ...await getImageProps(item.image),
      caption: item.caption,
    }))
  )

  if (block.layout === 'carousel' || block.enableLightbox) {
    // Interactive features need client component
    return (
      <ImageGalleryClient
        images={processedImages}
        heading={block.heading}
        layout={block.layout}
        columns={block.columns}
        aspectRatio={block.aspectRatio}
        enableLightbox={block.enableLightbox}
        gap={block.gap}
      />
    )
  }

  // Static grid can be server-rendered
  const columnClasses = {
    '2': 'grid-cols-2',
    '3': 'grid-cols-2 md:grid-cols-3',
    '4': 'grid-cols-2 md:grid-cols-4',
  }

  const gapClasses = {
    none: 'gap-0',
    small: 'gap-2',
    normal: 'gap-4',
    large: 'gap-8',
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        {block.heading && (
          <h2 className="text-3xl font-bold mb-8">{block.heading}</h2>
        )}

        <div className={`grid ${columnClasses[block.columns]} ${gapClasses[block.gap]}`}>
          {processedImages.map((image, index) => (
            <div key={index}>
              <Image
                {...image}
                alt={image.alt || ''}
                loading={index < 4 ? 'eager' : 'lazy'} // Eager load first 4
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              {image.caption && (
                <p className="text-sm text-gray-600 mt-2">{image.caption}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

```typescript
// components/blocks/ImageGalleryClient.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Lightbox } from '@/components/Lightbox'

interface ImageGalleryClientProps {
  images: any[]
  heading?: string
  layout: string
  columns?: string
  aspectRatio?: string
  enableLightbox?: boolean
  gap?: string
}

export function ImageGalleryClient({
  images,
  heading,
  enableLightbox,
  ...props
}: ImageGalleryClientProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  return (
    <>
      <section className="py-16">
        {/* Gallery rendering */}
        <div className="container mx-auto px-4">
          {heading && <h2 className="text-3xl font-bold mb-8">{heading}</h2>}

          <div className="grid grid-cols-3 gap-4">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => enableLightbox && setLightboxIndex(index)}
                className={enableLightbox ? 'cursor-pointer hover:opacity-90' : ''}
              >
                <Image {...image} alt={image.alt || ''} />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox (client-only) */}
      {enableLightbox && lightboxIndex !== null && (
        <Lightbox
          images={images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
```

### 4. Performance Optimizations

#### Image Optimization Helper

```typescript
// lib/getImageProps.ts (Server-side)
import type { Media } from '@/payload-types'

export async function getImageProps(
  media: number | Media | null | undefined
): Promise<{ src: string; alt: string; width: number; height: number } | null> {
  if (!media) return null

  // If it's already populated
  if (typeof media === 'object') {
    return {
      src: media.url || '',
      alt: media.alt || '',
      width: media.width || 1200,
      height: media.height || 630,
    }
  }

  // If it's just an ID, fetch it
  const payload = await getPayload({ config })
  const mediaDoc = await payload.findByID({
    collection: 'media',
    id: media,
  })

  return {
    src: mediaDoc.url || '',
    alt: mediaDoc.alt || '',
    width: mediaDoc.width || 1200,
    height: mediaDoc.height || 630,
  }
}
```

#### Streaming with Suspense

```typescript
// app/(storefront)/[slug]/page.tsx
import { Suspense } from 'react'
import { Skeleton } from '@/components/Skeleton'

export default async function Page({ params }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  )
}

async function PageContent({ params }: PageProps) {
  const page = await fetchPage(params.slug)
  return <RenderBlocks blocks={page.content} />
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-96 bg-gray-200" />
      <div className="container mx-auto px-4 space-y-4">
        <div className="h-8 bg-gray-200 w-3/4" />
        <div className="h-4 bg-gray-200 w-full" />
        <div className="h-4 bg-gray-200 w-5/6" />
      </div>
    </div>
  )
}
```

### 5. Caching Strategy

```typescript
// lib/pageCache.ts
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const getCachedPage = unstable_cache(
  async (slug: string) => {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'pages',
      where: {
        slug: { equals: slug },
        status: { equals: 'published' }
      },
      limit: 1,
      depth: 2,
    })
    return docs[0]
  },
  ['page-by-slug'],
  {
    revalidate: 3600, // 1 hour
    tags: ['pages'],
  }
)

// Revalidate on-demand when page is updated
// In Payload hook:
// await revalidateTag('pages')
```

### 6. Draft Preview (Client-side)

```typescript
// app/api/preview/route.ts
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const slug = searchParams.get('slug')

  // Validate secret token
  if (secret !== process.env.PREVIEW_SECRET || !slug) {
    return new Response('Invalid token', { status: 401 })
  }

  // Enable draft mode
  const draft = await draftMode()
  draft.enable()

  // Redirect to the path
  redirect(`/${slug}`)
}
```

```typescript
// app/(storefront)/[slug]/page.tsx (with draft support)
import { draftMode } from 'next/headers'

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const { isEnabled: isDraft } = await draftMode()

  const page = await fetchPage(slug, isDraft)

  return (
    <>
      {isDraft && <DraftModeBanner />}
      <RenderBlocks blocks={page.content} />
    </>
  )
}
```

## Performance Checklist

### Core Web Vitals Optimization

- ✅ **LCP (Largest Contentful Paint)**
  - Hero images use `priority` prop
  - Above-fold images eager-loaded
  - Proper `sizes` attribute on all images
  - R2 CDN for fast image delivery

- ✅ **CLS (Cumulative Layout Shift)**
  - All images have `width` and `height`
  - Skeleton loaders maintain layout
  - Aspect ratio containers for media

- ✅ **FID/INP (First Input Delay / Interaction to Next Paint)**
  - Minimal client JavaScript by default
  - Progressive enhancement pattern
  - Code splitting for interactive blocks

### Next.js 16 Features

- ✅ **React Server Components** (default)
- ✅ **Streaming with Suspense**
- ✅ **Partial Prerendering** (when stable)
- ✅ **Server Actions** (for forms in CTA blocks)
- ✅ **Metadata API** (for SEO)
- ✅ **Image Optimization** (Next.js Image)
- ✅ **Route Handlers** (for preview)

### Cloudflare Workers Optimizations

- ✅ **Edge Rendering** (all RSC)
- ✅ **R2 for Media** (fast CDN delivery)
- ✅ **D1 for Data** (low latency reads)
- ✅ **KV for Cache** (optional for page cache)
- ✅ **Smart Placement** (automatic)

## Bundle Size Impact

| Component Type | JavaScript Sent | Notes |
|----------------|----------------|-------|
| Server Components | 0 KB | HeroBlock, TextBlock, etc. |
| Client Islands | 2-5 KB | Carousel, Lightbox |
| Shared Runtime | ~80 KB | React, Next.js (shared) |

**Total for basic page**: ~80-90 KB JS (mostly framework)
**Total for interactive page**: ~100-110 KB JS

## Monitoring

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
```

## Summary

This architecture achieves:
- ✅ **Server-first rendering** for optimal performance
- ✅ **Client islands** only where needed (interactivity)
- ✅ **Streaming** with Suspense for progressive loading
- ✅ **ISR** with 1-hour revalidation
- ✅ **Static generation** for top 50 pages
- ✅ **Image optimization** with Next.js Image + R2
- ✅ **SEO optimization** with Metadata API
- ✅ **Draft previews** with next/draft-mode
- ✅ **Edge deployment** on Cloudflare Workers

**Expected performance**: LCP < 2.5s, CLS < 0.1, FID < 100ms on 3G
