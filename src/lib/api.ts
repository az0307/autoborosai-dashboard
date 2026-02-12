import { API_BASE_URL, API_TIMEOUT, API_ENDPOINTS } from './constants'
import type { ApiResponse } from '@/types'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  timeout?: number
  signal?: AbortSignal
}

export class ApiClient {
  private baseUrl: string
  private defaultTimeout: number
  private defaultHeaders: Record<string, string>

  constructor(baseUrl?: string, defaultTimeout?: number) {
    this.baseUrl = baseUrl || API_BASE_URL
    this.defaultTimeout = defaultTimeout || API_TIMEOUT
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      signal
    } = options

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const config: RequestInit = {
      method,
      headers: { ...this.defaultHeaders, ...headers },
      signal: signal || controller.signal,
    }

    if (body && method !== 'GET') {
      if (typeof body === 'object') {
        config.body = JSON.stringify(body)
      } else {
        config.body = body
      }
    }

    try {
      const url = `${this.baseUrl}${endpoint}`
      const response = await fetch(url, config)
      clearTimeout(timeoutId)

      // Handle HTTP errors
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorJson.error || errorMessage
        } catch {
          // Use default error message if JSON parsing fails
        }

        return {
          success: false,
          error: errorMessage,
        }
      }

      // Handle successful responses
      const contentType = response.headers.get('content-type')
      let data: any

      if (contentType?.includes('application/json')) {
        try {
          data = await response.json()
        } catch {
          data = null
        }
      } else {
        data = await response.text()
      }

      return {
        success: true,
        data,
      }
    } catch (error) {
      clearTimeout(timeoutId)

      let errorMessage = 'Network error occurred'
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timeout'
        } else {
          errorMessage = error.message
        }
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body })
  }

  async put<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body })
  }

  async patch<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body })
  }

  async delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  // File upload
  async upload<T>(endpoint: string, file: File, options?: Omit<RequestOptions, 'method' | 'headers' | 'body'>): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData - browser sets it with boundary
      },
    })
  }

  // Batch requests
  async batch<T>(requests: Array<{ endpoint: string; options?: RequestOptions }>): Promise<ApiResponse<T>[]> {
    const promises = requests.map(({ endpoint, options }) => this.request<T>(endpoint, options))
    
    try {
      const results = await Promise.all(promises)
      return {
        success: true,
        data: results,
      }
    } catch (error) {
      return {
        success: false,
        error: 'Batch request failed',
      }
    }
  }

  // Request with retry
  async withRetry<T>(
    endpoint: string,
    options: RequestOptions = {},
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<ApiResponse<T>> {
    let lastError: ApiResponse<T>

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.request<T>(endpoint, options)
        
        // Don't retry on client errors (4xx)
        if (result.success || (result.error && result.error.includes('HTTP 4'))) {
          return result
        }

        lastError = result
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
        }
      } catch (error) {
        lastError = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
        }
      }
    }

    return lastError!
  }

  // Set authentication token
  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  // Remove authentication token
  removeAuthToken() {
    delete this.defaultHeaders['Authorization']
  }

  // Set default headers
  setDefaultHeaders(headers: Record<string, string>) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers }
  }

  // Get current headers
  getHeaders(): Record<string, string> {
    return { ...this.defaultHeaders }
  }
}

// Create default API client instance
export const apiClient = new ApiClient()

// Named API methods for convenience
export const api = {
  // Agent methods
  getAgents: () => apiClient.get(API_ENDPOINTS.AGENTS),
  getAgent: (id: string) => apiClient.get(API_ENDPOINTS.AGENT(id)),
  createAgent: (data: any) => apiClient.post(API_ENDPOINTS.AGENTS, data),
  updateAgent: (id: string, data: any) => apiClient.put(API_ENDPOINTS.AGENT(id), data),
  deleteAgent: (id: string) => apiClient.delete(API_ENDPOINTS.AGENT(id)),
  updateAgentStatus: (id: string, status: string) => 
    apiClient.patch(API_ENDPOINTS.AGENT_STATUS(id), { status }),
  getAgentPerformance: (id: string) => 
    apiClient.get(API_ENDPOINTS.AGENT_PERFORMANCE(id)),
  
  // Task methods
  getTasks: () => apiClient.get(API_ENDPOINTS.TASKS),
  getTask: (id: string) => apiClient.get(API_ENDPOINTS.TASK(id)),
  createTask: (data: any) => apiClient.post(API_ENDPOINTS.TASKS, data),
  updateTask: (id: string, data: any) => apiClient.put(API_ENDPOINTS.TASK(id), data),
  deleteTask: (id: string) => apiClient.delete(API_ENDPOINTS.TASK(id)),
  assignTask: (id: string, agentId: string) => 
    apiClient.post(API_ENDPOINTS.TASK_ASSIGN(id), { agentId }),
  completeTask: (id: string, result: any) => 
    apiClient.post(API_ENDPOINTS.TASK_COMPLETE(id), { result }),
  
  // Orchestration methods
  getPatterns: () => apiClient.get(API_ENDPOINTS.PATTERNS),
  createPattern: (data: any) => apiClient.post(API_ENDPOINTS.PATTERNS, data),
  getConflicts: () => apiClient.get(API_ENDPOINTS.CONFLICTS),
  
  // Governance methods
  getPolicies: () => apiClient.get(API_ENDPOINTS.POLICIES),
  getAuditLogs: () => apiClient.get(API_ENDPOINTS.AUDIT),
  getComplianceStatus: () => apiClient.get(API_ENDPOINTS.COMPLIANCE),
  
  // Analytics methods
  getAnalytics: () => apiClient.get(API_ENDPOINTS.ANALYTICS),
  getMetrics: () => apiClient.get(API_ENDPOINTS.METRICS),
  getHealthStatus: () => apiClient.get(API_ENDPOINTS.HEALTH),
  getAlerts: () => apiClient.get(API_ENDPOINTS.ALERTS),
}

export default apiClient