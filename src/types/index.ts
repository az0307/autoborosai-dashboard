// Core Agent Type Definitions
export interface Agent {
  id: string
  name: string
  type: AgentType
  status: AgentStatus
  capabilities: string[]
  performance: AgentPerformance
  metadata: AgentMetadata
  configuration: AgentConfiguration
  createdAt: string
  updatedAt: string
  lastHeartbeat: string
}

export enum AgentType {
  RESEARCH = 'research',
  DEVELOPMENT = 'development',
  ANALYSIS = 'analysis',
  COMMUNICATION = 'communication',
  EXECUTIVE = 'executive',
  GOVERNANCE = 'governance',
  TRAINING = 'training',
  COORDINATION = 'coordination',
}

export enum AgentStatus {
  ACTIVE = 'active',
  IDLE = 'idle',
  BUSY = 'busy',
  OFFLINE = 'offline',
  TRAINING = 'training',
  MAINTENANCE = 'maintenance',
  ERROR = 'error',
}

export interface AgentPerformance {
  cpuUsage: number
  memoryUsage: number
  tasksCompleted: number
  successRate: number
  averageResponseTime: number
  uptime: number
  costEfficiency: number
  qualityScore: number
}

export interface AgentMetadata {
  version: string
  description: string
  owner: string
  team: string
  department: string
  tags: string[]
  certifications: string[]
  complianceFrameworks: string[]
}

export interface AgentConfiguration {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  tools: string[]
  permissions: string[]
  rateLimits: RateLimit
}

export interface RateLimit {
  requestsPerMinute: number
  tokensPerHour: number
  maxConcurrency: number
}

// Task Management Types
export interface Task {
  id: string
  title: string
  description: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  assignedAgentId?: string
  createdAt: string
  updatedAt: string
  deadline?: string
  estimatedCost?: number
  actualCost?: number
  dependencies: string[]
  tags: string[]
  requirements: TaskRequirements
  result?: TaskResult
}

export enum TaskType {
  RESEARCH = 'research',
  DEVELOPMENT = 'development',
  ANALYSIS = 'analysis',
  CONTENT_CREATION = 'content_creation',
  COMMUNICATION = 'communication',
  COORDINATION = 'coordination',
  TRAINING = 'training',
  GOVERNANCE = 'governance',
}

export enum TaskStatus {
  BACKLOG = 'backlog',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface TaskRequirements {
  capabilities: string[]
  minExperience: number
  maxCost?: number
  deadline?: string
  complianceFrameworks: string[]
  securityClearance: string
}

export interface TaskResult {
  success: boolean
  output: any
  error?: string
  executionTime: number
  tokensUsed: number
  cost: number
  quality: QualityMetrics
}

export interface QualityMetrics {
  accuracy: number
  completeness: number
  relevance: number
  coherence: number
}

// Orchestration Types
export interface OrchestrationEvent {
  id: string
  type: OrchestrationEventType
  source: string
  target?: string
  payload: any
  timestamp: string
  metadata: any
}

export enum OrchestrationEventType {
  AGENT_STATUS_CHANGE = 'agent_status_change',
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  CONFLICT_DETECTED = 'conflict_detected',
  CONFLICT_RESOLVED = 'conflict_resolved',
  COMMUNICATION_ESTABLISHED = 'communication_established',
  RESOURCE_ALLOCATED = 'resource_allocated',
  RESOURCE_RELEASED = 'resource_released',
}

export interface OrchestrationPattern {
  id: string
  name: string
  type: PatternType
  configuration: any
  status: PatternStatus
  participants: string[]
  createdAt: string
  updatedAt: string
}

export enum PatternType {
  ORCHESTRATOR_WORKER = 'orchestrator_worker',
  HIERARCHICAL = 'hierarchical',
  BLACKBOARD = 'blackboard',
  MARKET_BASED = 'market_based',
  PEER_TO_PEER = 'peer_to_peer',
}

export enum PatternStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CONFIGURING = 'configuring',
  ERROR = 'error',
}

// Governance Types
export interface Policy {
  id: string
  name: string
  description: string
  type: PolicyType
  status: PolicyStatus
  rules: PolicyRule[]
  scope: PolicyScope
  createdAt: string
  updatedAt: string
  version: string
}

export enum PolicyType {
  ACCESS_CONTROL = 'access_control',
  DATA_PROTECTION = 'data_protection',
  COMPLIANCE = 'compliance',
  SECURITY = 'security',
  ETHICAL = 'ethical',
  OPERATIONAL = 'operational',
}

export enum PolicyStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export interface PolicyRule {
  id: string
  condition: string
  action: string
  exceptions: string[]
  severity: RuleSeverity
}

export enum RuleSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface PolicyScope {
  agents: string[]
  teams: string[]
  departments: string[]
  agentTypes: AgentType[]
  taskTypes: TaskType[]
}

export interface AuditEntry {
  id: string
  timestamp: string
  actor: string
  action: string
  resource: string
  details: any
  outcome: AuditOutcome
  ipAddress: string
  userAgent: string
  complianceFramework?: string
}

export enum AuditOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  WARNING = 'warning',
}

export interface Conflict {
  id: string
  type: ConflictType
  severity: ConflictSeverity
  description: string
  participants: string[]
  detectionTimestamp: string
  resolutionTimestamp?: string
  resolution?: ConflictResolution
  status: ConflictStatus
  metadata: any
}

export enum ConflictType {
  RESOURCE = 'resource',
  GOAL = 'goal',
  POLICY = 'policy',
  SEMANTIC = 'semantic',
  COMMUNICATION = 'communication',
  TIMING = 'timing',
}

export enum ConflictSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ConflictStatus {
  DETECTED = 'detected',
  RESOLVING = 'resolving',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
}

export interface ConflictResolution {
  strategy: string
  outcome: string
  resolvedBy: string
  timestamp: string
  details: any
}

// Analytics Types
export interface AnalyticsMetrics {
  timestamp: string
  totalAgents: number
  activeAgents: number
  totalTasks: number
  completedTasks: number
  failedTasks: number
  averageCompletionTime: number
  totalCost: number
  averageQualityScore: number
  uptime: number
  errorRate: number
}

export interface PerformanceMetrics {
  agentId: string
  timestamp: string
  cpuUsage: number
  memoryUsage: number
  responseTime: number
  successRate: number
  throughput: number
  errorRate: number
  costPerTask: number
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  score: number
  components: ComponentHealth[]
  alerts: Alert[]
  lastUpdated: string
}

export interface ComponentHealth {
  name: string
  status: 'healthy' | 'warning' | 'critical'
  metrics: any
  lastCheck: string
}

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  timestamp: string
  acknowledged: boolean
  resolved: boolean
  metadata: any
}

export enum AlertType {
  PERFORMANCE = 'performance',
  AVAILABILITY = 'availability',
  SECURITY = 'security',
  COMPLIANCE = 'compliance',
  COST = 'cost',
  ERROR = 'error',
}

export enum AlertSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
  id?: string
  roomId?: string
}

export interface AgentStatusUpdate extends WebSocketMessage {
  type: 'agent_status_update'
  agentId: string
  status: AgentStatus
  performance: AgentPerformance
}

export interface TaskUpdate extends WebSocketMessage {
  type: 'task_update'
  taskId: string
  status: TaskStatus
  assignedAgentId?: string
  progress?: number
}

export interface SystemAlert extends WebSocketMessage {
  type: 'system_alert'
  alert: Alert
}

export interface ConflictNotification extends WebSocketMessage {
  type: 'conflict_notification'
  conflict: Conflict
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: PaginationInfo
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// Form Types
export interface CreateAgentForm {
  name: string
  type: AgentType
  description: string
  capabilities: string[]
  model: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  tools: string[]
  permissions: string[]
}

export interface CreateTaskForm {
  title: string
  description: string
  type: TaskType
  priority: TaskPriority
  requirements: TaskRequirements
  deadline?: string
  tags: string[]
}

export interface FilterState {
  search: string
  status: string[]
  type: string[]
  team: string[]
  priority: string[]
}

export interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>