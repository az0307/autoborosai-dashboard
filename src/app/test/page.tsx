export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Test Page</h1>
      <p>This is a test page to verify the application is working.</p>
      <p>Current time: {new Date().toISOString()}</p>
    </div>
  )
}