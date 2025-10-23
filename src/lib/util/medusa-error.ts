export default function medusaError(error: unknown): never {
  // Handle new Medusa SDK errors (fetch-based)
  if (error && typeof error === 'object' && 'message' in error) {
    console.error("Medusa API Error:", error.message)
    if ('stack' in error) {
      console.error("Stack:", error.stack)
    }
    throw error
  }

  // Handle legacy axios-style errors
  if (error && typeof error === 'object' && 'response' in error) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const errorObj = error as { config: { url: string; baseURL: string }; response: { data: { message?: string } | string; status: number; headers: unknown } }
    const u = new URL(errorObj.config.url, errorObj.config.baseURL)
    console.error("Resource:", u.toString())
    console.error("Response data:", errorObj.response.data)
    console.error("Status code:", errorObj.response.status)
    console.error("Headers:", errorObj.response.headers)

    // Extracting the error message from the response data
    let message: string
    if (typeof errorObj.response.data === 'object' && errorObj.response.data !== null && 'message' in errorObj.response.data) {
      // Ensure message is converted to string
      message = errorObj.response.data.message ? String(errorObj.response.data.message) : JSON.stringify(errorObj.response.data)
    } else {
      message = String(errorObj.response.data)
    }

    const formattedMessage = message
      ? message.charAt(0).toUpperCase() + message.slice(1) + "."
      : "Unknown error occurred."
    throw new Error(formattedMessage)
  } else if (error && typeof error === 'object' && 'request' in error) {
    // The request was made but no response was received
    throw new Error("No response received: " + String((error as { request: unknown }).request))
  } else {
    // Something happened in setting up the request that triggered an Error
    throw new Error("Error: " + (error && typeof error === 'object' && 'toString' in error ? String(error) : "Unknown error occurred"))
  }
}
