'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassPanelProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'card' | 'hover'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  border?: boolean
  glow?: boolean
}

export function GlassPanel({
  children,
  className,
  variant = 'default',
  size = 'md',
  padding = 'md',
  border = true,
  glow = false
}: GlassPanelProps) {
  const baseClasses = 'relative overflow-hidden backdrop-blur-xl'
  
  const variants = {
    default: 'bg-glass-surface border border-glass-border shadow-2xl',
    card: 'bg-glass-surface border border-glass-border shadow-glass-card rounded-xl',
    hover: 'glass-card-hover rounded-xl',
  }
  
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }
  
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  }
  
  const glowEffect = glow ? 'shadow-neon' : ''
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        baseClasses,
        variants[variant],
        size && sizes[size],
        padding && paddings[padding],
        glowEffect,
        className
      )}
    >
      {/* Glass morphism overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Animated border for hover variant */}
      {variant === 'hover' && (
        <div className="absolute inset-0 rounded-xl p-[1px]">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 animate-gradient"></div>
        </div>
      )}
    </motion.div>
  )
}