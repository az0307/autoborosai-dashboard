'use client'

import { motion } from 'framer-motion'
import type { Agent } from '@/types'
import { 
  getAgentStatusColor, 
  getPerformanceColor, 
  formatTimeAgo,
  calculatePercentage
} from '@/lib/utils'

interface AgentCardProps {
  agent: Agent
  onSelect: (agent: Agent) => void
  onEdit?: (agent: Agent) => void
  onDelete?: (agent: Agent) => void
}

export function AgentCard({ agent, onSelect, onEdit, onDelete }: AgentCardProps) {
  const statusColors = getAgentStatusColor(agent.status)
  const performanceColor = getPerformanceColor(agent.performance.successRate)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-card hover:glass-card-hover p-6 rounded-xl cursor-pointer"
      onClick={() => onSelect(agent)}
      layoutId={`agent-card-${agent.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-neon">
              <span className="material-symbols-outlined text-xl">smart_toy</span>
            </div>
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${statusColors.split(' ')[0]} animate-pulse`}></div>
          </div>
          <div>
            <h3 className="font-bold text-white mb-1 group-hover:text-primary transition-colors">
              {agent.name}
            </h3>
            <p className="text-sm text-text-secondary capitalize">{agent.type}</p>
          </div>
        </div>
        
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(agent); }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(agent); }}
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="space-y-3 mb-4">
        <div className="w-full bg-surface-dark rounded-full h-2 overflow-hidden">
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${agent.performance.cpuUsage}%`,
              backgroundColor: agent.performance.cpuUsage >= 90 ? 'rgb(16, 185, 129)' : 
                          agent.performance.cpuUsage >= 75 ? 'rgb(245, 158, 11)' : 
                          'rgb(239, 68, 68)'
            }}
          ></div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Memory</span>
          <span className={`text-xs font-bold ${getPerformanceColor(agent.performance.memoryUsage)}`}>
            {agent.performance.memoryUsage}%
          </span>
        </div>
        <div className="w-full bg-surface-dark rounded-full h-2 overflow-hidden">
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${agent.performance.memoryUsage}%`,
              backgroundColor: agent.performance.memoryUsage >= 90 ? 'rgb(16, 185, 129)' : 
                          agent.performance.memoryUsage >= 75 ? 'rgb(245, 158, 11)' : 
                          'rgb(239, 68, 68)'
            }}
          ></div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Success Rate</span>
          <span className={`text-xs font-bold ${performanceColor}`}>
            {agent.performance.successRate}%
          </span>
        </div>
        <div className="w-full bg-surface-dark rounded-full h-2 overflow-hidden">
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${agent.performance.successRate}%`,
              backgroundColor: agent.performance.successRate >= 90 ? 'rgb(16, 185, 129)' : 
                          agent.performance.successRate >= 75 ? 'rgb(245, 158, 11)' : 
                          'rgb(239, 68, 68)'
            }}
          ></div>
        </div>
        <div className="w-full bg-surface-dark rounded-full h-2 overflow-hidden">
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${agent.performance.cpuUsage}%`,
              backgroundColor: getPerformanceColor(agent.performance.cpuUsage).replace('text-', 'rgba(var(--tw-colors-primary), 0.8)')
            }}
          ></div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Memory</span>
          <span className={`text-xs font-bold ${getPerformanceColor(agent.performance.memoryUsage)}`}>
            {agent.performance.memoryUsage}%
          </span>
        </div>
        <div className="w-full bg-surface-dark rounded-full h-2 overflow-hidden">
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${agent.performance.memoryUsage}%`,
              backgroundColor: getPerformanceColor(agent.performance.memoryUsage).replace('text-', 'rgba(var(--tw-colors-primary), 0.8)')
            }}
          ></div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Success Rate</span>
          <span className={`text-xs font-bold ${performanceColor}`}>
            {agent.performance.successRate}%
          </span>
        </div>
        <div className="w-full bg-surface-dark rounded-full h-2 overflow-hidden">
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${agent.performance.successRate}%`,
              backgroundColor: agent.performance.successRate >= 90 ? 'rgba(16, 185, 129, 0.8)' : 
                          agent.performance.successRate >= 75 ? 'rgba(245, 158, 11, 0.8)' : 
                          'rgba(239, 68, 68, 0.8)'
            }}
          ></div>
        </div>
      </div>

      {/* Capabilities */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {agent.capabilities.slice(0, 3).map((capability, index) => (
            <span
              key={index}
              className="px-2 py-1 rounded-lg bg-surface-dark border border-surface-border text-xs font-medium text-text-secondary"
            >
              {capability}
            </span>
          ))}
          {agent.capabilities.length > 3 && (
            <span className="px-2 py-1 rounded-lg bg-surface-dark border border-surface-border text-xs font-medium text-text-secondary">
              +{agent.capabilities.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{agent.performance.tasksCompleted}</p>
          <p className="text-xs text-text-secondary">Tasks Done</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{agent.performance.costEfficiency}%</p>
          <p className="text-xs text-text-secondary">Cost Efficiency</p>
        </div>
      </div>

      {/* Last Activity */}
      <div className="pt-4 border-t border-surface-border">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>Last active</span>
          <span>{formatTimeAgo(agent.lastHeartbeat)}</span>
        </div>
      </div>
    </motion.div>
  )
}