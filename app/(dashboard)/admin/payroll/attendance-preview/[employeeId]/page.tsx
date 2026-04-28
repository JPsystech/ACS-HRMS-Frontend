"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, FileDown, Loader2, RefreshCw } from "lucide-react"

import {
  AttendanceDailyBreakdown,
  AttendanceStatusBadge,
  LateBadge,
} from "@/components/payroll/attendance-daily-breakdown"
import { RequireRole } from "@/components/auth/RequireRole"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { PageContainer } from "@/components/ui/page-container"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ApiClientError, API_BASE_URL, getToken, removeToken } from "@/lib/api"
import { getPayrollAttendanceSummary } from "@/services/payroll"
import { useAuthStore } from "@/store/auth-store"
import { PayrollAttendanceSummary } from "@/types/payroll"

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.data?.detail || error.message || "Unable to load employee attendance summary."
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return "Unable to load employee attendance summary."
}

function formatDateTime(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed)
}

async function downloadWithAuth(endpoint: string, filename: string): Promise<void> {
  const token = getToken()
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    redirect: "manual",
  })

  if (response.status === 401) {
    removeToken()
    if (typeof window !== "undefined") window.location.href = "/login"
    throw new ApiClientError(401, { detail: "Unauthorized" })
  }

  if (!response.ok) {
    let detail = response.statusText || "Download failed"
    try {
      const json = await response.json()
      if (json?.detail) detail = String(json.detail)
    } catch {
      try {
        const text = await response.text()
        if (text.trim()) detail = text.trim()
      } catch {}
    }
    throw new ApiClientError(response.status, { detail })
  }

  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = blobUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(blobUrl)
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: number | string
  highlight?: React.ReactNode
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="space-y-2 pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
        {highlight ? <div>{highlight}</div> : null}
      </CardContent>
    </Card>
  )
}

export default function PayrollAttendanceEmployeeDetailPage() {
  const params = useParams<{ employeeId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const today = useMemo(() => new Date(), [])
  const employeeId = Number(params.employeeId)
  const defaultMonth = today.getMonth() + 1
  const defaultYear = today.getFullYear()
  const initialMonth = Number(searchParams.get("month") || defaultMonth)
  const initialYear = Number(searchParams.get("year") || defaultYear)
  const department = searchParams.get("department")
  const [month, setMonth] = useState(String(initialMonth))
  const [year, setYear] = useState(String(initialYear))
  const [summary, setSummary] = useState<PayrollAttendanceSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: String(index + 1),
        label: new Intl.DateTimeFormat("en-IN", { month: "long" }).format(
          new Date(2026, index, 1)
        ),
      })),
    []
  )

  const yearOptions = useMemo(() => {
    const currentYear = today.getFullYear()
    return Array.from({ length: 5 }, (_, index) => String(currentYear - 2 + index))
  }, [today])

  const syncQuery = useCallback(
    (nextMonth: string, nextYear: string) => {
      const nextQuery = new URLSearchParams(searchParams.toString())
      nextQuery.set("month", nextMonth)
      nextQuery.set("year", nextYear)

      router.replace(
        `/admin/payroll/attendance-preview/${employeeId}?${nextQuery.toString()}`
      )
    },
    [employeeId, router, searchParams]
  )

  const fetchSummary = useCallback(
    async (selectedMonth = month, selectedYear = year) => {
      setErrorMessage(null)
      setIsLoading(true)
      setIsSubmitting(true)

      try {
        const response = await getPayrollAttendanceSummary(employeeId, {
          month: Number(selectedMonth),
          year: Number(selectedYear),
        })
        setSummary(response)
      } catch (error) {
        setSummary(null)
        setErrorMessage(getErrorMessage(error))
      } finally {
        setIsLoading(false)
        setIsSubmitting(false)
      }
    },
    [employeeId, month, year]
  )

  useEffect(() => {
    if (user && (user.role === "HR" || user.role === "ADMIN")) {
      fetchSummary(String(initialMonth), String(initialYear))
    }
  }, [fetchSummary, initialMonth, initialYear, user])

  const summaryCards = useMemo(() => {
    if (!summary) return []

    return [
      { label: "Present Days", value: summary.present_days },
      { label: "Half Days", value: summary.half_days },
      { label: "Absent Days", value: summary.absent_days },
      { label: "Weekly Off Days", value: summary.weekly_off_days },
      { label: "Paid Leave Days", value: summary.paid_leave_days },
      { label: "Unpaid Leave Days", value: summary.unpaid_leave_days },
      { label: "Miss Punch Days", value: summary.miss_punch_days },
      {
        label: "Late Count",
        value: summary.late_count,
        highlight: summary.late_count > 0 ? <LateBadge /> : null,
      },
      { label: "Payable Days", value: summary.payable_days },
      { label: "LWP Days", value: summary.lwp_days },
    ]
  }, [summary])

  return (
    <RequireRole allowedRoles={["HR", "ADMIN"]}>
      <PageContainer
        title={summary ? `${summary.employee_name} Attendance Summary` : "Attendance Summary"}
        description={
          summary
            ? `${summary.employee_code} payroll attendance preview with day-wise breakdown and cutoff details.`
            : "Review a single employee payroll attendance preview."
        }
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              disabled={!summary || isDownloading}
              onClick={async () => {
                if (!summary) return
                setIsDownloading(true)
                try {
                  const endpoint = `/api/v1/payroll/attendance-summary/${employeeId}/pdf?month=${month}&year=${year}`
                  const filename = `attendance_${summary.employee_code}_${year}-${String(month).padStart(2, "0")}.pdf`
                  await downloadWithAuth(endpoint, filename)
                } finally {
                  setIsDownloading(false)
                }
              }}
            >
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              Download PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const query = new URLSearchParams({
                  month,
                  year,
                })

                if (department) {
                  query.set("department", department)
                }

                router.push(`/admin/payroll/attendance-preview?${query.toString()}`)
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Preview
            </Button>
          </div>
        }
      >
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="employee-attendance-month">Month</Label>
                <Select
                  value={month}
                  onValueChange={(value) => {
                    setMonth(value)
                    syncQuery(value, year)
                  }}
                >
                  <SelectTrigger id="employee-attendance-month">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee-attendance-year">Year</Label>
                <Select
                  value={year}
                  onValueChange={(value) => {
                    setYear(value)
                    syncQuery(month, value)
                  }}
                >
                  <SelectTrigger id="employee-attendance-year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2 md:col-span-2">
                <Button
                  className="flex-1"
                  onClick={() => fetchSummary(month, year)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Refresh Summary
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fetchSummary(month, year)}
                  disabled={isSubmitting}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {errorMessage ? (
          <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
            <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-destructive">{errorMessage}</div>
              <Button variant="destructive" onClick={() => fetchSummary(month, year)}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 10 }, (_, index) => (
              <Card key={index} className="border-0 shadow-sm">
                <CardContent className="space-y-3 pt-6">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : summary ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {summaryCards.map((item) => (
              <SummaryCard
                key={item.label}
                label={item.label}
                value={item.value}
                highlight={item.highlight}
              />
            ))}
          </div>
        ) : null}

        {summary ? (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Cutoff and Current Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Correction cutoff</div>
                <div className="font-medium">{formatDateTime(summary.cutoff_at)}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <AttendanceStatusBadge
                  status={
                    summary.miss_punch_days > 0
                      ? "MISS_PUNCH"
                      : summary.unpaid_leave_days > 0
                        ? "UNPAID_LEAVE"
                        : "PRESENT"
                  }
                />
                {summary.late_count > 0 ? <LateBadge /> : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <AttendanceDailyBreakdown
          items={summary?.daily_breakdown ?? []}
          isLoading={isLoading}
        />
      </PageContainer>
    </RequireRole>
  )
}
