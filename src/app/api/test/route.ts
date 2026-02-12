import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'Hello from Nexus Agent Dashboard!',
    timestamp: new Date().toISOString(),
    status: 'ok'
  })
}