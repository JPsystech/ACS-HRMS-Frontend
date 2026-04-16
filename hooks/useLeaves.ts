import { useState, useEffect } from "react"
import { api, ApiClientError } from "@/lib/api"
import { LeaveRequest, LeaveListResponse } from "@/types/models"
import { useAuthStore } from "@/store/auth-store"

interface LeaveFilters {
  status?: string
  employee_id?: number
  leave_type?: string
  from_date?: string
  to_date?: string
}

export function useLeaves(filters: LeaveFilters = {}) {
  const { user } = useAuthStore()
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    if (user) {
      fetchLeaves()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters.status, filters.employee_id, filters.leave_type, filters.from_date, filters.to_date])

  const fetchLeaves = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      
      if (filters.from_date) params.append("from", filters.from_date)
      if (filters.to_date) params.append("to", filters.to_date)
      if (filters.employee_id) params.append("employee_id", filters.employee_id.toString())

      const queryString = params.toString()
      const endpoint = filters.status === "PENDING" 
        ? `/api/v1/leaves/pending${queryString ? `?${queryString}` : ""}`
        : `/api/v1/leaves/list${queryString ? `?${queryString}` : ""}`

      const response = await api.get<LeaveListResponse>(endpoint)
      let items = response.items || []

      // Client-side filtering for leave_type and status (if not PENDING)
      if (filters.leave_type) {
        items = items.filter((item) => item.leave_type === filters.leave_type)
      }
      if (filters.status && filters.status !== "PENDING") {
        items = items.filter((item) => item.status === filters.status)
      }

      setLeaves(items)
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.data.detail || "Failed to fetch leaves")
      } else {
        setError("An unexpected error occurred")
      }
    } finally {
      setLoading(false)
    }
  }

  return { leaves, loading, error, refetch: fetchLeaves }
}
