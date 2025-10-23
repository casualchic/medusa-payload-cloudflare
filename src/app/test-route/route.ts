export const GET = async (_request: Request) => {
  return Response.json({
    message: 'Test route working!',
    timestamp: new Date().toISOString(),
  })
}
