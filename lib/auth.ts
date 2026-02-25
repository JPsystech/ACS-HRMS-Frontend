import { decodeJwt } from "jose"

export interface TokenPayload {
  sub: string // employee_id as string
  emp_code: string
  role: "EMPLOYEE" | "MANAGER" | "HR" | "MD" | "ADMIN"
  exp?: number
  iat?: number
}

export interface User {
  id: number
  emp_code: string
  role: "EMPLOYEE" | "MANAGER" | "HR" | "MD" | "ADMIN" | "VP"
  role_rank?: number
}

const TOKEN_KEY = "acs_hrms_token"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = decodeJwt<TokenPayload>(token)
    return decoded
  } catch (error) {
    console.error("Failed to decode token:", error)
    return null
  }
}

export function getCurrentUser(): User | null {
  const token = getToken()
  if (!token) return null

  const payload = decodeToken(token)
  if (!payload) return null
  
  // Extract role_rank from token payload if available
  const role_rank = (payload as any).role_rank

  return {
    id: parseInt(payload.sub, 10),
    emp_code: payload.emp_code,
    role: payload.role,
    role_rank: role_rank,
  }
}

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false

  const payload = decodeToken(token)
  if (!payload) return false

  // Check expiration
  if (payload.exp) {
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) {
      removeToken()
      return false
    }
  }

  return true
}
