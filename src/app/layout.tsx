import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

// Root layout must NOT have <html> and <body> tags when using Payload CMS
// Payload's RootLayout component provides its own <html> and <body> for /admin routes
// The storefront routes will provide their own html/body in their layout
export default function RootLayout(props: { children: React.ReactNode }) {
  return props.children
}
