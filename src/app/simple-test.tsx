export default function SimplePage() {
  return (
    <html>
      <head>
        <title>Nexus Dashboard Test</title>
        <style>
          body { 
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #101922;
            color: #ffffff;
          }
          h1 { color: #137fec; }
        </style>
      </head>
      <body>
        <h1>🤖 Nexus Dashboard - Test Page</h1>
        <p>This is a simple test page to verify Next.js is working.</p>
        <p>Current time: {new Date().toISOString()}</p>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '20px',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h2>✅ Backend Status</h2>
          <p>API: <a href="http://localhost:8000/health" target="_blank" style={{ color: '#10b981' }}>http://localhost:8000/health</a></p>
          <p>Docs: <a href="http://localhost:8000/docs" target="_blank" style={{ color: '#10b981' }}>http://localhost:8000/docs</a></p>
        </div>
      </body>
    </html>
  )
}