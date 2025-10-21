export const GET = async (request: Request) => {
  return Response.json({
    NODE_ENV: process.env.NODE_ENV,
    MEDUSA_BACKEND_URL: process.env.MEDUSA_BACKEND_URL,
    NEXT_PUBLIC_MEDUSA_BACKEND_URL: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
    allEnvKeys: Object.keys(process.env).filter(
      (key) => key.includes('MEDUSA') || key.includes('NODE_ENV'),
    ),
  })
}
