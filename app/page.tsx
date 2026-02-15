"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"
import { isAuthenticated } from "@/lib/auth"

export default function HomePage() {
  const router = useRouter()
  const { initialize } = useAuthStore()

  useEffect(() => {
    initialize()
    if (isAuthenticated()) {
      router.push("/dashboard")
    } else {
      router.push("/login")
    }
  }, [router, initialize])

  return null
}
