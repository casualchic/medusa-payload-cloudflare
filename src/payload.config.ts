// storage-adapter-import-placeholder
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite' // database-adapter-import
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import { CloudflareContext, getCloudflareContext } from '@opennextjs/cloudflare'
import { GetPlatformProxyOptions } from 'wrangler'
import { r2Storage } from '@payloadcms/storage-r2'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Products } from './collections/Products'
import { ProductVariants } from './collections/ProductVariants'
import { ProductOptions } from './collections/ProductOptions'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// During build or test phase, skip Cloudflare context initialization
// Tests will skip the integration test that requires D1 (marked as skipped in test file)
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
const isTestEnv = process.env.NODE_ENV === 'test'

const cloudflareRemoteBindings = process.env.NODE_ENV === 'production'
const cloudflare = isBuildPhase || isTestEnv
  ? {
      // During build/test, provide minimal env with PAYLOAD_SECRET
      // DB and R2 bindings are not needed as API routes aren't invoked
      env: {
        PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
      } as Record<string, unknown>,
    }
  : process.argv.find((value) => value.match(/^(generate|migrate):?/)) || !cloudflareRemoteBindings
    ? await getCloudflareContextFromWrangler()
    : await getCloudflareContext({ async: true })

// Validate required environment variables
// Fail fast in all environments if PAYLOAD_SECRET is missing
if (!cloudflare.env?.PAYLOAD_SECRET && !process.env.PAYLOAD_SECRET) {
  throw new Error('PAYLOAD_SECRET environment variable is required')
}

const payloadSecret = cloudflare.env?.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET!

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Products, ProductVariants, ProductOptions],
  editor: lexicalEditor(),
  secret: payloadSecret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // database-adapter-config-start
  db: sqliteD1Adapter({ binding: cloudflare.env.DB }),
  // database-adapter-config-end
  plugins: [
    // storage-adapter-placeholder
    r2Storage({
      bucket: cloudflare.env.R2,
      collections: { media: true },
    }),
  ],
})

// Adapted from https://github.com/opennextjs/opennextjs-cloudflare/blob/d00b3a13e42e65aad76fba41774815726422cc39/packages/cloudflare/src/api/cloudflare-context.ts#L328C36-L328C46
function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  // In test environment, use persist mode and disable remote bindings
  const isTest = process.env.NODE_ENV === 'test'

  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(
    ({ getPlatformProxy }) =>
      getPlatformProxy({
        environment: process.env.CLOUDFLARE_ENV,
        persist: isTest ? true : undefined,
        // Force local mode in test environment by explicitly setting remoteBindings to false
        experimental: isTest ? { remoteBindings: false } : cloudflareRemoteBindings ? { remoteBindings: true } : undefined,
      } satisfies GetPlatformProxyOptions),
  )
}
