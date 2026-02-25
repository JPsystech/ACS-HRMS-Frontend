"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"

export function MustChangeGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { mustChangePassword, initialized, initialize } = useAuthStore()

  useEffect(() => {
    if (!initialized) {
      initialize()
    }
  }, [initialized, initialize])

  useEffect(() => {
    if (!initialized) return
    if (mustChangePassword && pathname !== "/change-password") {
      router.replace("/change-password")
    }
  }, [mustChangePassword, pathname, router, initialized])

  return <>{children}</>
}
