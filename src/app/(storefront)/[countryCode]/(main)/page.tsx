import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: "Medusa Next.js Starter Template",
  description:
    "A performant frontend ecommerce starter template with Next.js 15 and Medusa.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  try {
    const region = await getRegion(countryCode)

    if (!region) {
      return (
        <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-200px)] px-4">
          <h1 className="text-2xl font-semibold">Region Not Available</h1>
          <p className="text-ui-fg-subtle text-center max-w-md">
            The region for {countryCode.toUpperCase()} could not be loaded. Please check your Medusa backend configuration.
          </p>
        </div>
      )
    }

    const { collections } = await listCollections({
      fields: "id, handle, title",
    })

    if (!collections || collections.length === 0) {
      return (
        <>
          <Hero />
          <div className="py-12">
            <div className="flex flex-col gap-4 items-center justify-center px-4">
              <p className="text-ui-fg-subtle">No collections available at the moment.</p>
            </div>
          </div>
        </>
      )
    }

    return (
      <>
        <Hero />
        <div className="py-12">
          <ul className="flex flex-col gap-x-6">
            <FeaturedProducts collections={collections} region={region} />
          </ul>
        </div>
      </>
    )
  } catch (error) {
    console.error("Error loading home page:", error)
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-200px)] px-4">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-ui-fg-subtle text-center max-w-md">
          Unable to load the storefront. Please check your Medusa backend connection.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="text-xs bg-ui-bg-subtle p-4 rounded-lg mt-4 overflow-auto max-w-2xl">
            {error instanceof Error ? error.message : String(error)}
          </pre>
        )}
      </div>
    )
  }
}
