import { useState, useEffect } from "react"
import { api, ApiClientError } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import {
  Employee,
  LeaveRequest,
  LeaveListResponse,
  Holiday,
  DashboardStats,
  DashboardData,
} from "@/types/models"

type AttendanceListResponse = {
  items: Array<{
    id: number
    employee_id: number
    punch_date: string
    in_time?: string | null
    out_time?: string | null
  }>
  total: number
}

// Parse a YYYY-MM-DD string into a Date without timezone shifts
function parseDateOnly(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map((v) => parseInt(v, 10))
  return new Date(y, (m || 1) - 1, d || 1)
}

export function useDashboard() {
  const { user } = useAuthStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchDashboardData = async () => {
    setLoading(true)
    setError("")
    try {
      const today = new Date().toISOString().split("T")[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]

      // Fetch all data in parallel
      const [
        employeesData,
        pendingLeavesData,
        holidaysData,
        attendanceData,
      ] = await Promise.allSettled([
        api.get<Employee[]>("/api/v1/employees?limit=1000"), // Fetch all employees for accurate counts
        api.get<LeaveListResponse>("/api/v1/leaves/pending"),
        api.get<Holiday[]>("/api/v1/calendars/holidays?active_only=true"),
        api
          .get<AttendanceListResponse>(
            `/api/v1/attendance/list?from=${today}&to=${today}`
          )
          .catch(() => null), // Attendance might not be available
      ])

      // Process employees
      const employees =
        employeesData.status === "fulfilled" ? employeesData.value : []
      const totalEmployees = employees.length
      const activeEmployees = employees.filter((e) => e.active).length

      // Process pending leaves
      let pendingLeaves =
        pendingLeavesData.status === "fulfilled"
          ? pendingLeavesData.value.items?.slice(0, 10) || []
          : []
      
      // Enrich pending leaves with employee names
      if (pendingLeaves.length > 0 && employees.length > 0) {
        pendingLeaves = pendingLeaves.map((leave) => {
          const emp = employees.find((e) => e.id === leave.employee_id)
          return {
            ...leave,
            employee: emp
              ? {
                  id: emp.id,
                  emp_code: emp.emp_code,
                  name: emp.name,
                }
              : undefined,
          }
        })
      }
      
      const pendingLeavesCount =
        pendingLeavesData.status === "fulfilled"
          ? pendingLeavesData.value.total || 0
          : 0

      // Process holidays
      const holidays =
        holidaysData.status === "fulfilled" ? holidaysData.value : []
      const todayDate = new Date()
      todayDate.setHours(0, 0, 0, 0) // Local \"today\" (IST for most users)
      const currentYear = todayDate.getFullYear()
      const currentMonth = todayDate.getMonth()

      const startOfMonth = new Date(currentYear, currentMonth, 1)
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0)

      const activeHolidays = holidays.filter((h) => h.active)

      const thisMonthHolidays = activeHolidays
        .filter((h) => {
          const hd = parseDateOnly(h.date)
          hd.setHours(0, 0, 0, 0)
          return (
            hd >= todayDate &&
            hd.getFullYear() === currentYear &&
            hd.getMonth() === currentMonth &&
            hd >= startOfMonth &&
            hd <= endOfMonth
          )
        })
        .sort((a, b) => parseDateOnly(a.date).getTime() - parseDateOnly(b.date).getTime())

      const nextHolidays = activeHolidays
        .filter((h) => {
          const hd = parseDateOnly(h.date)
          hd.setHours(0, 0, 0, 0)
          return hd > endOfMonth
        })
        .sort((a, b) => parseDateOnly(a.date).getTime() - parseDateOnly(b.date).getTime())
        .slice(0, 5)

      // Temporary debug log

      // Process attendance
      let todayAttendanceCount = 0
      if (attendanceData.status === "fulfilled" && attendanceData.value) {
        todayAttendanceCount = attendanceData.value.total || 0
      }

      const stats: DashboardStats = {
        totalEmployees,
        activeEmployees,
        pendingLeavesCount,
        todayAttendanceCount,
        thisMonthHolidaysCount: thisMonthHolidays.length,
      }

      setData({
        stats,
        pendingLeaves,
        thisMonthHolidays,
        nextHolidays,
      })
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.data.detail || "Failed to fetch dashboard data")
      } else {
        setError("An unexpected error occurred")
      }
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refetch: fetchDashboardData }
}
