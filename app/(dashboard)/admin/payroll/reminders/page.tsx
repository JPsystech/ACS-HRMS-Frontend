"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Mail, RefreshCw, Send, ListChecks, Users } from "lucide-react"

import { RequireRole } from "@/components/auth/RequireRole"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { PageContainer } from "@/components/ui/page-container"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { formatDateTimeIST } from "@/lib/format-attendance"
import {
  getPayrollReminderPreview,
  listPayrollDepartments,
  listPayrollReminderLogs,
  sendPayrollReminderNow,
} from "@/services/payroll"
import { useAuthStore } from "@/store/auth-store"
import { PayrollEmailLog, PayrollReminderPreview } from "@/types/payroll"
import { ApiClientError } from "@/lib/api"

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const detail = error.data?.detail || error.message || "Something went wrong."
    return `HTTP ${error.status}: ${detail}`
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return "Something went wrong."
}

function getStatusVariant(status: PayrollEmailLog["status"]): "default" | "secondary" | "destructive" {
  if (status === "sent") return "default"
  if (status === "failed") return "destructive"
  return "secondary"
}

export default function PayrollReminderAdminPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()

  const [preview, setPreview] = useState<PayrollReminderPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(true)

  const [logs, setLogs] = useState<PayrollEmailLog[]>([])
  const [logsError, setLogsError] = useState<string | null>(null)
  const [logsLoading, setLogsLoading] = useState(true)
  const [departmentMap, setDepartmentMap] = useState<Map<number, string>>(new Map())

  const [filters, setFilters] = useState<{
    month: string
    year: string
    status: string
    search: string
  }>(() => {
    const now = new Date()
    return {
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
      status: "all",
      search: "",
    }
  })
  const [appliedFilters, setAppliedFilters] = useState<{
    month: string
    year: string
    status: string
    search: string
  }>(() => {
    const now = new Date()
    return {
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
      status: "all",
      search: "",
    }
  })
  const [pagination, setPagination] = useState<{ limit: number; offset: number }>({
    limit: 50,
    offset: 0,
  })

  const [sending, setSending] = useState(false)

  const fetchPreview = useCallback(async () => {
    setPreviewLoading(true)
    setPreviewError(null)

    try {
      const response = await getPayrollReminderPreview()
      setPreview(response)
    } catch (error) {
      setPreview(null)
      setPreviewError(getErrorMessage(error))
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true)
    setLogsError(null)

    try {
      const month =
        appliedFilters.month === "all" ? undefined : Number(appliedFilters.month)
      const year = appliedFilters.year.trim() ? Number(appliedFilters.year) : undefined
      const status =
        appliedFilters.status === "all"
          ? undefined
          : (appliedFilters.status as PayrollEmailLog["status"])
      const search = appliedFilters.search.trim() || undefined

      const response = await listPayrollReminderLogs({
        month: typeof month === "number" && Number.isFinite(month) ? month : undefined,
        year: typeof year === "number" && Number.isFinite(year) ? year : undefined,
        status,
        search,
        limit: pagination.limit,
        offset: pagination.offset,
      })
      setLogs(response)
    } catch (error) {
      setLogs([])
      setLogsError(getErrorMessage(error))
    } finally {
      setLogsLoading(false)
    }
  }, [
    appliedFilters.month,
    appliedFilters.search,
    appliedFilters.status,
    appliedFilters.year,
    pagination.limit,
    pagination.offset,
  ])

  const fetchDepartments = useCallback(async () => {
    try {
      const departments = await listPayrollDepartments()
      const nextMap = new Map<number, string>()
      departments.forEach((dept) => {
        nextMap.set(dept.id, dept.name)
      })
      setDepartmentMap(nextMap)
    } catch {
      setDepartmentMap(new Map())
    }
  }, [])

  useEffect(() => {
    if (user && (user.role === "HR" || user.role === "ADMIN")) {
      fetchPreview()
      fetchDepartments()
    }
  }, [fetchDepartments, fetchLogs, fetchPreview, user])

  useEffect(() => {
    if (user && (user.role === "HR" || user.role === "ADMIN")) {
      fetchLogs()
    }
  }, [appliedFilters, fetchLogs, pagination.limit, pagination.offset, user])

  const handleSendNow = useCallback(async () => {
    setSending(true)
    try {
      const response = await sendPayrollReminderNow({
        month: preview?.month,
        year: preview?.year,
      })

      const sentCount = response.filter((item) => item.status === "sent").length
      const failedCount = response.filter((item) => item.status === "failed").length
      const skippedCount = response.filter((item) => item.status === "skipped").length

      toast({
        title: response.length ? "Reminder send completed" : "No employees matched",
        description: response.length
          ? `Sent: ${sentCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`
          : "No employees matched for the selected window/target.",
      })
      await Promise.all([fetchPreview(), fetchLogs()])
    } catch (error) {
      toast({
        title: "Unable to send reminder email",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }, [fetchLogs, fetchPreview, preview?.month, preview?.year, toast])

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters(filters)
    setPagination((prev) => ({ ...prev, offset: 0 }))
  }, [filters])

  const handleResetFilters = useCallback(() => {
    const now = new Date()
    const next = {
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
      status: "all",
      search: "",
    }
    setFilters(next)
    setAppliedFilters(next)
    setPagination({ limit: 50, offset: 0 })
  }, [])

  const previewMeta = useMemo(() => {
    if (!preview) return null
    const now = new Date()
    const month = preview.month ?? now.getMonth() + 1
    const year = preview.year ?? now.getFullYear()
    const schedule = preview.schedule_info
    const timezone = schedule?.timezone ?? preview.timezone ?? "—"
    const sendInfo = schedule
      ? `${schedule.send_day_rule.replaceAll("_", " ")} @ ${schedule.send_time}`
      : formatDateTimeIST(preview.send_at)
    const cutoffInfo = schedule ? schedule.cutoff_time : formatDateTimeIST(preview.cutoff_at)
    const targetCount = preview.target_count ?? preview.target_employee_count ?? 0
    const lastRun = preview.last_scheduled_run ? formatDateTimeIST(preview.last_scheduled_run) : "—"
    return [
      { label: "Month", value: `${month}/${year}` },
      { label: "Timezone", value: timezone },
      { label: "Schedule", value: sendInfo || "—" },
      { label: "Cutoff Time", value: cutoffInfo || "—" },
      { label: "Target Employees", value: String(targetCount) },
      { label: "Last Scheduled Run", value: lastRun },
    ]
  }, [preview])

  const previewBodyText = useMemo(() => {
    if (!preview) return ""
    const now = new Date()
    const payrollMonth = preview.month ?? now.getMonth() + 1
    const payrollYear = preview.year ?? now.getFullYear()
    const firstEmployee = preview.employees?.[0]
    const employeeName = firstEmployee?.name ?? "Employee Name"
    const employeeCode = firstEmployee?.emp_code ?? "EMP001"
    const missingDates = (firstEmployee?.missing_dates ?? ["YYYY-MM-DD"]).join(", ")

    let text = preview.body || preview.body_template || ""
    text = text.replaceAll("{employee_name}", employeeName)
    text = text.replaceAll("{employee_code}", employeeCode)
    text = text.replace(/\{payroll_month[^}]*\}/g, String(payrollMonth).padStart(2, "0"))
    text = text.replaceAll("{payroll_year}", String(payrollYear))
    text = text.replaceAll("{missing_dates}", missingDates)
    return text
  }, [preview])

  return (
    <RequireRole allowedRoles={["HR", "ADMIN"]}>
      <PageContainer
        title="Payroll Reminders"
        description="Preview the payroll attendance correction reminder email, send it manually, and view delivery logs."
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Email Preview</CardTitle>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" disabled={previewLoading || sending}>
                <Link href="/admin/payroll/employee-email-mapping">
                  <Users className="h-4 w-4" />
                  <span className="ml-2">Employee Emails</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={fetchPreview}
                disabled={previewLoading || sending}
              >
                {previewLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>
              <Button onClick={handleSendNow} disabled={sending || previewLoading}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="ml-2">Send Now</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : previewError ? (
              <EmptyState
                icon={Mail}
                title="Unable to load preview"
                description={previewError}
                action={{ label: "Retry", onClick: fetchPreview }}
              />
            ) : !preview ? (
              <EmptyState
                icon={Mail}
                title="No preview available"
                description="Preview data is not available right now."
                action={{ label: "Retry", onClick: fetchPreview }}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {previewMeta?.map((item) => (
                    <div key={item.label} className="text-sm">
                      <div className="text-muted-foreground">{item.label}</div>
                      <div className="font-medium">{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Subject</div>
                  <div className="font-medium">{preview.subject || "—"}</div>
                </div>

                {(preview.target_count ?? preview.target_employee_count ?? 0) === 0 ? (
                  <EmptyState
                    icon={ListChecks}
                    title="No pending corrections found"
                    description="No employees matched for the current reminder window."
                  />
                ) : null}

                <div className="rounded-md border bg-background p-4">
                  <div className="whitespace-pre-wrap text-sm">{previewBodyText}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Send Logs</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleResetFilters} disabled={logsLoading}>
                Reset
              </Button>
              <Button variant="outline" onClick={fetchLogs} disabled={logsLoading}>
                {logsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Payroll Month</div>
                <Select
                  value={filters.month}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, month: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {Array.from({ length: 12 }).map((_, idx) => {
                      const value = String(idx + 1)
                      return (
                        <SelectItem key={value} value={value}>
                          {value.padStart(2, "0")}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Payroll Year</div>
                <Input
                  inputMode="numeric"
                  value={filters.year}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, year: event.target.value }))
                  }
                  placeholder="YYYY"
                />
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Status</div>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <div className="text-xs text-muted-foreground">Employee Search</div>
                <Input
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, search: event.target.value }))
                  }
                  placeholder="Search by code or name"
                />
              </div>

              <div className="flex items-end gap-2 md:col-span-5">
                <Button onClick={handleApplyFilters} disabled={logsLoading}>
                  Apply Filters
                </Button>
                <div className="ml-auto flex items-center gap-2">
                  <Select
                    value={String(pagination.limit)}
                    onValueChange={(value) =>
                      setPagination({ limit: Number(value), offset: 0 })
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                      <SelectItem value="100">100 / page</SelectItem>
                      <SelectItem value="200">200 / page</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        offset: Math.max(0, prev.offset - prev.limit),
                      }))
                    }
                    disabled={logsLoading || pagination.offset === 0}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, offset: prev.offset + prev.limit }))
                    }
                    disabled={logsLoading || logs.length < pagination.limit}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>

            {logsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : logsError ? (
              <EmptyState
                icon={Mail}
                title="Unable to load logs"
                description={logsError}
                action={{ label: "Retry", onClick: fetchLogs }}
              />
            ) : logs.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No logs yet"
                description="No reminder emails have been sent."
                action={{ label: "Refresh", onClick: fetchLogs }}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Code</TableHead>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Email Sent To</TableHead>
                      <TableHead>Payroll Month</TableHead>
                      <TableHead>Payroll Year</TableHead>
                      <TableHead>Reminder Type</TableHead>
                      <TableHead>Send Mode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Failure Reason</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const departmentLabel =
                        typeof log.department_id === "number"
                          ? departmentMap.get(log.department_id) ?? `Department #${log.department_id}`
                          : "—"
                      const detailsHref =
                        typeof log.employee_id === "number"
                          ? `/admin/payroll/reminders/${log.employee_id}`
                          : null
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">
                            {log.employee_code || "—"}
                          </TableCell>
                          <TableCell>{log.employee_name || "—"}</TableCell>
                          <TableCell>{departmentLabel}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {log.email_to || "—"}
                          </TableCell>
                          <TableCell>{String(log.payroll_month).padStart(2, "0")}</TableCell>
                          <TableCell>{log.payroll_year}</TableCell>
                          <TableCell>{log.reminder_type}</TableCell>
                          <TableCell>{log.send_mode}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(log.status)}>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDateTimeIST(log.sent_at)}</TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                            {log.failure_reason || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {detailsHref ? (
                              <Button asChild variant="outline" size="sm">
                                <Link href={detailsHref}>Details</Link>
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" disabled>
                                Details
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </RequireRole>
  )
}
