"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"
import { isAuthenticated } from "@/lib/auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { initialize, isAuthenticated: authIsAuthenticated, initialized } = useAuthStore()
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!initializedRef.current && !initialized) {
      initializedRef.current = true
      initialize()
    }
    
    if (initialized && !isAuthenticated()) {
      router.push("/login")
    }
  }, [router, initialize, initialized])

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!authIsAuthenticated) {
    return null // Will redirect
  }

  return <>{children}</>
}
