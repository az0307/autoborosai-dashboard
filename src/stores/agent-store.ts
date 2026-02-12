import { create } from 'zustand'
import type { Agent, FilterState, SortState } from '@/types'

interface AgentStore {
  agents: Agent[]
  selectedAgent: Agent | null
  filters: FilterState
  sort: SortState
  viewMode: 'grid' | 'list' | 'solar'
  isLoading: boolean
  error: string | null
  
  // Actions
  setAgents: (agents: Agent[]) => void
  addAgent: (agent: Agent) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  removeAgent: (id: string) => void
  selectAgent: (agent: Agent | null) => void
  setFilters: (filters: Partial<FilterState>) => void
  setSort: (sort: SortState) => void
  setViewMode: (mode: 'grid' | 'list' | 'solar') => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  // Initial state
  agents: [],
  selectedAgent: null,
  filters: {
    search: '',
    status: [],
    type: [],
    team: [],
    priority: [],
  },
  sort: {
    field: 'name',
    direction: 'asc',
  },
  viewMode: 'grid',
  isLoading: false,
  error: null,

  // Actions
  setAgents: (agents) => set({ agents }),
  
  addAgent: (agent) => set((state) => ({
    agents: [...state.agents, agent],
  })),
  
  updateAgent: (id, updates) => set((state) => ({
    agents: state.agents.map((agent) =>
      agent.id === id ? { ...agent, ...updates } : agent
    ),
    selectedAgent:
      state.selectedAgent?.id === id
        ? { ...state.selectedAgent, ...updates }
        : state.selectedAgent,
  })),
  
  removeAgent: (id) => set((state) => ({
    agents: state.agents.filter((agent) => agent.id !== id),
    selectedAgent:
      state.selectedAgent?.id === id ? null : state.selectedAgent,
  })),
  
  selectAgent: (agent) => set({ selectedAgent: agent }),
  
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),
  
  setSort: (sort) => set({ sort }),
  
  setViewMode: (viewMode) => set({ viewMode }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
}))