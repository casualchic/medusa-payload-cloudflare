export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Test Page</h1>
      <p>This is a test page to verify the storefront is working.</p>
      <p>Current time: {new Date().toISOString()}</p>
    </div>
  )
}
