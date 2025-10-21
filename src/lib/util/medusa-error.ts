export default function medusaError(error: any): never {
  // Handle new Medusa SDK errors (fetch-based)
  if (error.message) {
    console.error("Medusa API Error:", error.message)
    if (error.stack) {
      console.error("Stack:", error.stack)
    }
    throw error
  }
  
  // Handle legacy axios-style errors
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const u = new URL(error.config.url, error.config.baseURL)
    console.error("Resource:", u.toString())
    console.error("Response data:", error.response.data)
    console.error("Status code:", error.response.status)
    console.error("Headers:", error.response.headers)

    // Extracting the error message from the response data
    const message = error.response.data.message || error.response.data

    throw new Error(message.charAt(0).toUpperCase() + message.slice(1) + ".")
  } else if (error.request) {
    // The request was made but no response was received
    throw new Error("No response received: " + error.request)
  } else {
    // Something happened in setting up the request that triggered an Error
    throw new Error("Error: " + (error.toString() || "Unknown error occurred"))
  }
}
