import { redirect } from 'next/navigation'

export default function RootPage() {
  // Redirect to the storefront with default country code
  redirect('/us')
}
