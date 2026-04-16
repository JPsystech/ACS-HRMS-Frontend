"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Mail, RefreshCw } from "lucide-react"

import { RequireRole } from "@/components/auth/RequireRole"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { PageContainer } from "@/components/ui/page-container"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiClientError } from "@/lib/api"
import { formatDateTimeIST } from "@/lib/format-attendance"
import { listPayrollDepartments, getPayrollReminderLogsForEmployee } from "@/services/payroll"
import { useAuthStore } from "@/store/auth-store"
import { PayrollEmailLog } from "@/types/payroll"

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

export default function PayrollReminderEmployeeLogsPage() {
  const router = useRouter()
  const params = useParams<{ employeeId: string }>()
  const employeeId = Number(params.employeeId)
  const { user } = useAuthStore()

  const [logs, setLogs] = useState<PayrollEmailLog[]>([])
  const [departmentMap, setDepartmentMap] = useState<Map<number, string>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await getPayrollReminderLogsForEmployee(employeeId)
      setLogs(response)
    } catch (error) {
      setLogs([])
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    if (user && (user.role === "HR" || user.role === "ADMIN")) {
      fetchDepartments()
      fetchLogs()
    }
  }, [fetchDepartments, fetchLogs, user])

  const title = useMemo(() => {
    const first = logs[0]
    if (!first) return `Employee #${employeeId} Reminder History`
    const label = first.employee_name && first.employee_code ? `${first.employee_name} (${first.employee_code})` : first.employee_name || first.employee_code
    return label ? `${label} Reminder History` : `Employee #${employeeId} Reminder History`
  }, [employeeId, logs])

  return (
    <RequireRole allowedRoles={["HR", "ADMIN"]}>
      <PageContainer
        title={title}
        description="Full payroll reminder email log history for this employee."
        action={
          <Button variant="outline" onClick={() => router.push("/admin/payroll/reminders")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Logs
          </Button>
        }
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>History</CardTitle>
            <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : errorMessage ? (
              <EmptyState
                icon={Mail}
                title="Unable to load employee history"
                description={errorMessage}
                action={{ label: "Retry", onClick: fetchLogs }}
              />
            ) : logs.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No logs yet"
                description="No reminder emails have been sent for this employee."
                action={{ label: "Refresh", onClick: fetchLogs }}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Email Sent To</TableHead>
                      <TableHead>Payroll Month</TableHead>
                      <TableHead>Payroll Year</TableHead>
                      <TableHead>Reminder Type</TableHead>
                      <TableHead>Send Mode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Failure Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const departmentLabel =
                        typeof log.department_id === "number"
                          ? departmentMap.get(log.department_id) ?? `Department #${log.department_id}`
                          : "—"
                      return (
                        <TableRow key={log.id}>
                          <TableCell>{departmentLabel}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {log.email_to || "—"}
                          </TableCell>
                          <TableCell>{String(log.payroll_month).padStart(2, "0")}</TableCell>
                          <TableCell>{log.payroll_year}</TableCell>
                          <TableCell>{log.reminder_type}</TableCell>
                          <TableCell>{log.send_mode}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(log.status)}>{log.status}</Badge>
                          </TableCell>
                          <TableCell>{formatDateTimeIST(log.sent_at)}</TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                            {log.failure_reason || "—"}
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

