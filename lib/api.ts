/**
 * API Client for ACS HRMS Backend
 * Handles authentication, error handling, and request/response processing
 */

// Use same-origin (empty) when unset so Next.js rewrites can proxy to backend; else backend URL (e.g. http://127.0.0.1:8000)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
const TOKEN_KEY = "acs_hrms_token"

type HeadersShape = HeadersInit | undefined

function normalizeHeaders(input: HeadersShape): Record<string, string> {
  if (!input) return {}

  if (input instanceof Headers) {
    const result: Record<string, string> = {}
    input.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  if (Array.isArray(input)) {
    return input.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})
  }

  return { ...input }
}

// Debug: when empty, requests are same-origin and proxied via next.config rewrites

export interface ApiError {
  detail: string
  error?: boolean
  status_code?: number
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public data: ApiError,
    message?: string
  ) {
    super(message || data.detail || "API request failed")
    this.name = "ApiClientError"
  }
}

/**
 * Get stored authentication token
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Set authentication token
 */
export function setToken(token: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * Remove authentication token
 */
export function removeToken(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Handle API response and errors
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ApiError
    try {
      errorData = await response.json()
    } catch {
      errorData = {
        detail: response.statusText || "An error occurred",
        status_code: response.status,
      }
    }

    // Handle 401 Unauthorized - clear token and redirect to login
    if (response.status === 401) {
      removeToken()
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }

    throw new ApiClientError(response.status, errorData)
  }

  // Handle empty responses
  const contentType = response.headers.get("content-type")
  if (!contentType || !contentType.includes("application/json")) {
    return {} as T
  }

  return response.json()
}

/**
 * Core API fetch wrapper
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...normalizeHeaders(options.headers),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`

  const response = await fetch(url, {
    ...options,
    headers,
  })

  return handleResponse<T>(response)
}

/**
 * API client with helper methods
 */
export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  del: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: "DELETE" }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: "DELETE" }),
}

/**
 * Fetch a report CSV endpoint (raw response for blob/text).
 * Use for download or preview; does not parse JSON.
 */
export async function fetchReportCsv(path: string): Promise<Response> {
  const token = getToken()
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`
  const headers: Record<string, string> = {}
  if (token) headers["Authorization"] = `Bearer ${token}`
  const response = await fetch(url, { method: "GET", headers })
  if (response.status === 401) {
    removeToken()
    if (typeof window !== "undefined") window.location.href = "/login"
    throw new ApiClientError(401, { detail: "Unauthorized" })
  }
  return response
}

// Export for debug panel
export { API_BASE_URL, TOKEN_KEY }
