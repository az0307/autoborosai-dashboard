import { NextResponse } from 'next/server'

// This endpoint is build-time static data, NOT a live API health check.
// Static export cannot serve a request-time Next.js API.
export const dynamic = 'force-static'

export async function GET() {
  return NextResponse.json({
    message: 'Static dashboard build artifact',
    status: 'static',
    liveHealthVerified: false,
  })
}
