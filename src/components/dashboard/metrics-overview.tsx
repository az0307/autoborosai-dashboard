'use client'

import { motion } from 'framer-motion'

interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
  }
  icon?: string
  color?: string
  description?: string
}

export function MetricCard({ title, value, change, icon, color = 'primary', description }: MetricCardProps) {
  const changeColor = change?.type === 'increase' ? 'text-success' : 'text-error'
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="glass-card p-6 rounded-xl"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {description && (
            <p className="text-xs text-text-secondary mt-1">{description}</p>
          )}
        </div>
        
        {icon && (
          <div className={`w-12 h-12 rounded-lg bg-${color}/10 flex items-center justify-center text-${color}`}>
            <span className="material-symbols-outlined text-2xl">{icon}</span>
          </div>
        )}
      </div>
      
      {change && (
        <div className="mt-4 flex items-center gap-2">
          <span className={`text-sm font-medium ${changeColor}`}>
            {change.type === 'increase' ? '↑' : '↓'} {Math.abs(change.value)}%
          </span>
          <span className="text-xs text-text-secondary">from last period</span>
        </div>
      )}
    </motion.div>
  )
}

interface MetricsOverviewProps {
  stats: {
    totalAgents: number
    activeAgents: number
    busyAgents: number
    idleAgents: number
    offlineAgents: number
    totalTasks: number
    averageSuccessRate: number
    totalCost: number
  }
}

export function MetricsOverview({ stats }: MetricsOverviewProps) {
  const metrics = [
    {
      title: 'Total Agents',
      value: stats.totalAgents,
      icon: 'smart_toy',
      color: 'primary',
      description: 'Registered agents'
    },
    {
      title: 'Active Now',
      value: stats.activeAgents,
      change: { value: 12, type: 'increase' },
      icon: 'play_circle',
      color: 'success',
      description: 'Currently active'
    },
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      change: { value: 8, type: 'increase' },
      icon: 'assignment',
      color: 'info',
      description: 'Tasks completed'
    },
    {
      title: 'Success Rate',
      value: `${stats.averageSuccessRate.toFixed(1)}%`,
      change: { value: 3.2, type: 'increase' },
      icon: 'trending_up',
      color: 'warning',
      description: 'Average success rate'
    },
    {
      title: 'Total Cost',
      value: `$${stats.totalCost.toFixed(2)}`,
      change: { value: 5.1, type: 'decrease' },
      icon: 'payments',
      color: 'error',
      description: 'Operating costs'
    },
    {
      title: 'System Health',
      value: '98.5%',
      change: { value: 1.2, type: 'increase' },
      icon: 'health_and_safety',
      color: 'success',
      description: 'Overall health score'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <MetricCard {...metric} />
        </motion.div>
      ))}
    </div>
  )
}