'use client'

/**
 * Nexus Agent Dashboard - Main Page
 * Built following AutoborosAI Constitution standards
 * Domain: autoborosai.com.au
 *
 * Security: Input validation, type-safe, no hardcoded secrets
 * Performance: Optimized for real-time updates with WebSocket
 * Quality: TypeScript strict mode, proper error handling
 */

import { useEffect, useState } from 'react'
import { useAgentStore } from '@/stores/agent-store'
import { AgentCard } from '@/components/agents/agent-card'
import { MetricsOverview } from '@/components/dashboard/metrics-overview'
import { GlassPanel } from '@/components/ui/glass-panel'
import type { Agent, AgentStatus, AgentType } from '@/types'

export default function DashboardPage() {
  const { agents, setAgents, selectAgent } = useAgentStore()
  const [isOnline, setIsOnline] = useState(true)

  // Mock data for demonstration - will be replaced with API calls
  useEffect(() => {
    const mockAgents: Agent[] = [
      {
        id: 'agent-1',
        name: 'Research Bot Alpha',
        type: 'research' as AgentType,
        status: 'active' as AgentStatus,
        capabilities: ['web-search', 'data-analysis', 'summarization'],
        performance: {
          cpuUsage: 45,
          memoryUsage: 62,
          tasksCompleted: 156,
          successRate: 94.5,
          averageResponseTime: 2.3,
          uptime: 99.7,
          costEfficiency: 87,
          qualityScore: 92,
        },
        metadata: {
          version: '2.1.0',
          description: 'Advanced research and analysis agent',
          tags: ['research', 'analysis'],
          owner: 'system',
        },
        configuration: {
          maxConcurrentTasks: 5,
          timeout: 30000,
          retryAttempts: 3,
          priority: 'high',
        },
        createdAt: new Date('2024-01-15').toISOString(),
        updatedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
      },
      {
        id: 'agent-2',
        name: 'Development Assistant',
        type: 'development' as AgentType,
        status: 'busy' as AgentStatus,
        capabilities: ['code-generation', 'debugging', 'testing'],
        performance: {
          cpuUsage: 78,
          memoryUsage: 85,
          tasksCompleted: 89,
          successRate: 91.2,
          averageResponseTime: 3.1,
          uptime: 98.5,
          costEfficiency: 79,
          qualityScore: 88,
        },
        metadata: {
          version: '1.8.2',
          description: 'Full-stack development assistant',
          tags: ['development', 'coding'],
          owner: 'system',
        },
        configuration: {
          maxConcurrentTasks: 3,
          timeout: 60000,
          retryAttempts: 2,
          priority: 'high',
        },
        createdAt: new Date('2024-02-01').toISOString(),
        updatedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
      },
      {
        id: 'agent-3',
        name: 'Customer Service Pro',
        type: 'communication' as AgentType,
        status: 'idle' as AgentStatus,
        capabilities: ['chat', 'email', 'sentiment-analysis'],
        performance: {
          cpuUsage: 23,
          memoryUsage: 41,
          tasksCompleted: 234,
          successRate: 96.8,
          averageResponseTime: 1.8,
          uptime: 99.9,
          costEfficiency: 92,
          qualityScore: 95,
        },
        metadata: {
          version: '3.0.1',
          description: 'Customer support and communication agent',
          tags: ['support', 'communication'],
          owner: 'system',
        },
        configuration: {
          maxConcurrentTasks: 10,
          timeout: 15000,
          retryAttempts: 3,
          priority: 'medium',
        },
        createdAt: new Date('2024-01-20').toISOString(),
        updatedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
      },
    ]

    setAgents(mockAgents)
  }, [setAgents])

  // Calculate aggregate statistics
  const stats = {
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    busyAgents: agents.filter(a => a.status === 'busy').length,
    idleAgents: agents.filter(a => a.status === 'idle').length,
    offlineAgents: agents.filter(a => a.status === 'offline').length,
    totalTasks: agents.reduce((sum, a) => sum + a.performance.tasksCompleted, 0),
    averageSuccessRate: agents.length > 0
      ? agents.reduce((sum, a) => sum + a.performance.successRate, 0) / agents.length
      : 0,
    totalCost: 0, // TODO: Implement cost calculation
  }

  return (
    <div className="min-h-screen bg-background-dark p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            🤖 Nexus Agent Dashboard
          </h1>
          <p className="text-text-secondary">
            Enterprise Multi-Agent Management Platform
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-lg ${
            isOnline
              ? 'bg-success/20 border border-success/30 text-success'
              : 'bg-error/20 border border-error/30 text-error'
          }`}>
            <span className="font-bold">
              {isOnline ? '✅ System Online' : '❌ System Offline'}
            </span>
          </div>

          <div className="text-xs text-text-secondary">
            autoborosai.com.au
          </div>
        </div>
      </header>

      {/* Metrics Overview */}
      <MetricsOverview stats={stats} />

      {/* Agents Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary">Active Agents</h2>
          <div className="text-sm text-text-secondary">
            {agents.length} total • {stats.activeAgents} active • {stats.busyAgents} busy
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onSelect={selectAgent}
            />
          ))}
        </div>

        {agents.length === 0 && (
          <GlassPanel className="text-center py-12">
            <p className="text-text-secondary">
              No agents available. Add agents to get started.
            </p>
          </GlassPanel>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-surface-border text-center text-sm text-text-secondary">
        <p>
          Powered by <span className="text-primary font-bold">AutoborosAI</span> •
          Built with security-first principles •
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline ml-1"
          >
            API Documentation
          </a>
        </p>
      </footer>
    </div>
  )
}
