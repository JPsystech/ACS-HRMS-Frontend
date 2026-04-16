import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Role } from "@/types/models"
import { API_BASE_URL } from "./api"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Role utility functions
export function isAdmin(role?: Role | null): boolean {
  return role === "ADMIN"
}

const ROLE_RANK_FALLBACK: Partial<Record<Role, number>> = {
  ADMIN: 1,
  MD: 2,
  VP: 3,
  MANAGER: 4,
  HR: 5,
  EMPLOYEE: 99,
}

export function getRoleRank(role?: Role | null, role_rank?: number | null): number {
  if (typeof role_rank === "number" && Number.isFinite(role_rank)) return role_rank
  if (!role) return 99
  return ROLE_RANK_FALLBACK[role] ?? 99
}

export function canAccessTeamModules(user?: { role: Role; role_rank?: number | null } | null): boolean {
  if (!user) return false
  const rank = getRoleRank(user.role, user.role_rank ?? null)
  return rank <= 4
}

export function canAccessTeamModulesOrHr(user?: { role: Role; role_rank?: number | null } | null): boolean {
  if (!user) return false
  if (user.role === "HR") return true
  return canAccessTeamModules(user)
}

export function hasRoleAccess(
  userRole: Role | undefined | null,
  allowedRoles: Role[] | undefined
): boolean {
  // If no roles are specified, allow access
  if (!allowedRoles) return true
  
  // If user is admin, allow access to everything
  if (isAdmin(userRole)) return true
  
  // Check if user role is in allowed roles
  return userRole ? allowedRoles.includes(userRole) : false
}

export function normalizeImageUrl(url: string | null | undefined): string {
  const base = (API_BASE_URL || "").replace(/\/+$/, "")
  if (!url) return ""
  const s = url.trim()
  if (!s) return ""
  if (s.startsWith("/")) return `${base}${s}`
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s)
      const h = u.hostname.toLowerCase()
      if (
        h.startsWith("localhost") ||
        h.startsWith("127.0.0.1") ||
        h.startsWith("192.168.") ||
        h.startsWith("10.")
      ) {
        return `${base}${u.pathname}`
      }
      if (base.startsWith("https://") && u.protocol === "http:" && h.endsWith("onrender.com")) {
        u.protocol = "https:"
        return u.toString()
      }
      return s
    } catch {
      return s
    }
  }
  return `${base}/${s.replace(/^\/+/, "")}`
}
