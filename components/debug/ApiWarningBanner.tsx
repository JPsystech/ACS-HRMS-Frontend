"use client"

import { useEffect, useState } from "react"
import { API_BASE_URL } from "@/lib/api"

/**
 * Warning banner shown when API base URL is not configured
 * Only visible in development
 */
export function ApiWarningBanner() {
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL
      if (!baseURL || baseURL === "http://localhost:8000") {
        setShowWarning(true)
      }
    }
  }, [])

  if (!showWarning || process.env.NODE_ENV === "production") {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 px-4 py-2 text-sm text-center">
      <strong>Warning:</strong> API Base URL is{" "}
      {process.env.NEXT_PUBLIC_API_BASE_URL ? "set" : "not configured"}. Using:{" "}
      {API_BASE_URL}
    </div>
  )
}
