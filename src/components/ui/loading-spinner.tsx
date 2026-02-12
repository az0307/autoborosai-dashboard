'use client'

import { useEffect, useState } from 'react'

export function LoadingSpinner() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark">
      <div className="relative">
        {/* Outer ring */}
        <div className="w-16 h-16 border-4 border-surface-dark rounded-full animate-spin"></div>
        
        {/* Inner ring */}
        <div className="absolute top-2 left-2 w-12 h-12 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin-slow"></div>
        
        {/* Center dot */}
        <div className="absolute top-6 left-6 w-4 h-4 bg-primary rounded-full animate-pulse"></div>
      </div>
      
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
        <p className="text-sm text-text-secondary animate-pulse">Initializing Nexus...</p>
      </div>
    </div>
  )
}