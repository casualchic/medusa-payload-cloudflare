/**
 * Validates URL fields in Payload CMS
 * Accepts both absolute URLs and relative paths
 *
 * Optional security: Set ALLOWED_REDIRECT_DOMAINS env var to restrict external domains
 * Example: ALLOWED_REDIRECT_DOMAINS=example.com,trusted-site.com
 */
export function validateUrl(value: string | string[] | null | undefined): true | string {
  // Handle array values (for multi-value fields)
  if (Array.isArray(value)) {
    // Validate each URL in the array
    for (const url of value) {
      const result = validateUrl(url)
      if (result !== true) return result
    }
    return true
  }

  // Empty values are allowed (field can be optional)
  if (!value || value.trim() === '') {
    return true
  }

  const trimmedValue = value.trim()

  // Allow relative URLs (starting with /)
  if (trimmedValue.startsWith('/')) {
    return true
  }

  // Allow hash/anchor links
  if (trimmedValue.startsWith('#')) {
    return true
  }

  // Validate absolute URLs
  try {
    const url = new URL(trimmedValue)

    // Only allow http, https, and mailto protocols
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
      return 'Please use http://, https://, or mailto: protocol'
    }

    // Optional: Check domain whitelist for external links (security feature)
    // This prevents open redirect vulnerabilities in production
    const allowedDomains = process.env.ALLOWED_REDIRECT_DOMAINS?.split(',').map(d => d.trim()) || []
    if (allowedDomains.length > 0 && url.protocol !== 'mailto:' && url.hostname) {
      const isAllowed = allowedDomains.some(domain =>
        url.hostname === domain || url.hostname.endsWith(`.${domain}`)
      )
      if (!isAllowed) {
        return `Domain "${url.hostname}" is not in the allowed domains list. Contact your administrator to whitelist this domain.`
      }
    }

    return true
  } catch {
    return 'Please enter a valid URL (absolute like https://example.com or relative like /page)'
  }
}
