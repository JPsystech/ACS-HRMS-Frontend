"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"
import { hasRoleAccess, isAdmin } from "@/lib/utils"
import { Role } from "@/types/models"

interface RoleGuardProps {
  children: React.ReactNode
  /**
   * Roles that are allowed to access this route
   * If undefined, all authenticated users can access
   */
  allowedRoles?: Role[]
  /**
   * Redirect path when access is denied
   * Defaults to "/dashboard"
   */
  redirectPath?: string
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  redirectPath = "/dashboard" 
}: RoleGuardProps) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated && user) {
      const hasAccess = hasRoleAccess(user.role, allowedRoles)
      
      if (!hasAccess) {
        // If user doesn't have access, redirect to dashboard
        router.push(redirectPath)
      }
    }
  }, [router, user, isAuthenticated, allowedRoles, redirectPath])

  // Show loading state while checking permissions
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    )
  }

  // Check if user has access
  const hasAccess = hasRoleAccess(user.role, allowedRoles)
  
  if (!hasAccess) {
    // Return null while redirecting
    return null
  }

  return <>{children}</>
}