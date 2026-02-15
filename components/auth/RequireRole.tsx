"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"

import { Role } from "@/types/models"

interface RequireRoleProps {
  allowedRoles: Role[]
  children: React.ReactNode
}

/**
 * Role-based access control component
 * Redirects to /dashboard if user doesn't have required role
 */
export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const router = useRouter()
  const { user, initialized } = useAuthStore()

  useEffect(() => {
    if (!initialized) return

    if (!user || !allowedRoles.includes(user.role)) {
      router.push("/dashboard")
    }
  }, [user, allowedRoles, router, initialized])

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return null // Will redirect
  }

  return <>{children}</>
}
