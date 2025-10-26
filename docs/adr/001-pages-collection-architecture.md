# ADR 001: Pages Collection Architecture

## Status
**Accepted** - Implemented in PR #42

## Context

The Casual Chic 3.0 storefront needed a flexible way to create and manage custom pages beyond the standard e-commerce pages (product listings, checkout, etc.). Requirements included:

- **Flexibility**: Content creators need to build diverse page layouts without developer intervention
- **Performance**: Pages must meet Core Web Vitals targets (LCP < 2.5s)
- **SEO**: Full control over metadata and URL structure
- **Preview**: Ability to preview changes before publishing
- **Type Safety**: Full TypeScript coverage
- **Edge Compatibility**: Must work with Cloudflare Workers

## Decision

Implement a **block-based page builder** using Payload CMS 3.x with the following architecture:

### Collection Design
- Single `Pages` collection with flexible block system
- Auto-generated slugs with Unicode normalization
- Draft/published workflow with version history
- Live preview integration with Next.js

### Block System
Create 7 content blocks, each handling a specific content type:
1. **HeroBlock** - Full-screen hero sections
2. **FeaturedProductsBlock** - Product showcases
3. **TextBlock** - Rich text content
4. **ImageGalleryBlock** - Image grids/carousels
5. **CTABlock** - Call-to-action sections
6. **VideoBlock** - Video embeds
7. **TestimonialsBlock** - Customer testimonials

### Technical Stack
- **CMS**: Payload CMS 3.61.x with D1 database adapter
- **Frontend**: Next.js 16 with React Server Components
- **Rendering**: Server-side rendering with static generation fallback
- **Caching**: Multi-layer (KV edge cache → Next.js cache → D1)
- **Deployment**: Cloudflare Workers (edge runtime)

### Key Architectural Choices

#### 1. Block-Based vs Template-Based
**Choice**: Block-based composition
- **Rationale**: More flexible than fixed templates, easier to extend
- **Trade-off**: Slightly more complex UI, but better long-term maintainability

#### 2. Slug Generation Strategy
**Choice**: Auto-generate from title with fallback to UUID
- **Rationale**: User-friendly URLs by default, guaranteed uniqueness
- **Implementation**: NFKD normalization for international characters

#### 3. Caching Strategy
**Choice**: ISR (Incremental Static Regeneration) with 1-hour revalidation
- **Rationale**: Balance between freshness and performance
- **Trade-off**: Up to 1-hour delay for content updates, acceptable for marketing pages

#### 4. Preview Implementation
**Choice**: Separate preview route with draft content access
- **Rationale**: Secure preview without exposing drafts publicly
- **Implementation**: `/preview/pages/[slug]` route with authentication

#### 5. Relationship Depth
**Choice**: `maxDepth: 1` for all relationships
- **Rationale**: Prevents N+1 queries while providing essential data
- **Trade-off**: May need additional queries for deep relationships

## Consequences

### Positive
✅ **Flexibility**: Content team can create diverse page layouts
✅ **Performance**: Meets Core Web Vitals targets with edge caching
✅ **Type Safety**: 100% TypeScript coverage with generated types
✅ **SEO**: Full control over metadata and URLs
✅ **Developer Experience**: Clear patterns, comprehensive documentation
✅ **Scalability**: Blocks can be extended without modifying core collection

### Negative
⚠️ **Complexity**: 7 blocks to maintain vs simple template system
⚠️ **Learning Curve**: Content creators need training on block system
⚠️ **Database Size**: Version history can grow (mitigated with 50-version cap)

### Neutral
- Frontend components need to be implemented per block
- Cache invalidation requires webhook or manual trigger
- Preview URLs require authentication infrastructure

## Implementation Details

### Files Added
- `src/collections/Pages.ts` - Collection definition
- `src/blocks/*.ts` - 7 block definitions
- `src/lib/util/validate-url.ts` - URL validation utility
- Documentation (2,000+ lines across 5 guides)

### Performance Targets
- **LCP**: < 2.5s (achievable with edge caching)
- **CLS**: < 0.1 (fixed layouts in blocks)
- **FID**: < 100ms (minimal JavaScript)
- **TTFB**: < 600ms (edge workers)

### Security Considerations
- XSS prevention via URL protocol validation
- Admin-only access to custom CSS/JS fields
- GDPR-compliant logging with anonymization
- Domain whitelist option via `ALLOWED_REDIRECT_DOMAINS`

## Future Considerations

1. **A/B Testing**: Could add variant support to blocks
2. **Personalization**: Could add audience targeting per page
3. **Analytics**: Could add built-in page view tracking
4. **Multi-language**: Could extend with i18n support

## References

- [Payload CMS Blocks Documentation](https://payloadcms.com/docs/fields/blocks)
- [Next.js ISR Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration)
- PR #42: Implementation pull request
- PAGES_IMPLEMENTATION.md: Detailed implementation guide

## Supersedes

None (initial decision)

## Related Decisions

- Future ADR: Frontend component architecture
- Future ADR: Multi-language support strategy
