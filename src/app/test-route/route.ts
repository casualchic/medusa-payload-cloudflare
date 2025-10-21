export const GET = async (request: Request) => {
  return Response.json({
    message: 'Test route working!',
    timestamp: new Date().toISOString(),
  })
}
