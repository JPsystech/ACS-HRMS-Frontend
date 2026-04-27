"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"

import { RequireRole } from "@/components/auth/RequireRole"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageContainer } from "@/components/ui/page-container"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { ApiClientError, API_BASE_URL, getToken, removeToken } from "@/lib/api"
import {
  generatePayslipsForPayrollRun,
  getPayrollRunById,
  getPayrollRunSalaryBankExportUrl,
  lockPayrollRun,
  unlockPayrollRun,
  publishPayrollRun,
} from "@/services/payroll"
import { useAuthStore } from "@/store/auth-store"
import { PayrollRunDetail } from "@/types/payroll"

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.data?.detail || error.message || "Unable to generate payslips."
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return "Unable to generate payslips."
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

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function formatMonthYear(month: number, year: number): string {
  const date = new Date(year, Math.max(0, month - 1), 1)
  if (Number.isNaN(date.getTime())) return `${month}/${year}`
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(
    date
  )
}

function formatDate(value?: string | null): string {
  if (!value) return "—"
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(dt)
}

function formatMoney(value: unknown): string {
  if (value === null || value === undefined) return "—"
  const num = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(num)) return String(value)
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StatusBadge({ status }: { status: PayrollRunDetail["status"] }) {
  const normalized = String(status).toUpperCase()
  if (normalized === "PUBLISHED") return <Badge>Published</Badge>
  if (normalized === "LOCKED") return <Badge variant="secondary">Locked</Badge>
  return <Badge variant="outline">{status}</Badge>
}

export default function PayrollRunDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  const runId = Number(params.id)
  const { toast } = useToast()
  const { user } = useAuthStore()
  const isAdmin = user?.role === "ADMIN"

  const [run, setRun] = useState<PayrollRunDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null)

  const [isLocking, setIsLocking] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateErrorMessage, setGenerateErrorMessage] = useState<string | null>(
    null
  )

  const normalizedStatus = useMemo(() => {
    return run ? String(run.status).toUpperCase() : ""
  }, [run])

  const canLock = useMemo(() => normalizedStatus === "DRAFT", [normalizedStatus])
  const canPublish = useMemo(
    () => normalizedStatus === "LOCKED",
    [normalizedStatus]
  )
  const canGenerate = useMemo(() => {
    return normalizedStatus === "PUBLISHED"
  }, [normalizedStatus])

  const fetchRun = useCallback(async () => {
    setIsLoading(true)
    setLoadErrorMessage(null)
    try {
      const detail = await getPayrollRunById(runId)
      setRun(detail)
    } catch (error) {
      setLoadErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [runId])

  useEffect(() => {
    if (Number.isFinite(runId) && runId > 0) {
      fetchRun()
    } else {
      setIsLoading(false)
      setLoadErrorMessage("Invalid payroll run id.")
    }
  }, [fetchRun, runId])

  const handleGenerate = async (sendEmail: boolean) => {
    setIsGenerating(true)
    setGenerateErrorMessage(null)

    try {
      const result = await generatePayslipsForPayrollRun(runId, { sendEmail })
      const failedCount = Array.isArray(result.failed)
        ? result.failed.length
        : Number(result.failed ?? 0)
      const emailSent = Number(result.email_sent ?? 0)
      const emailSkipped = Number(result.email_skipped ?? 0)
      const emailFailed = Number(result.email_failed ?? 0)
      toast({
        title: "Payslips generated",
        description:
          sendEmail && (emailSent || emailSkipped || emailFailed)
            ? `Generated ${result.generated}, skipped ${result.skipped}, failed ${failedCount}. Email sent ${emailSent}, skipped ${emailSkipped}, failed ${emailFailed}.`
            : `Generated ${result.generated}, skipped ${result.skipped}, failed ${failedCount}.`,
      })
    } catch (error) {
      const message = getErrorMessage(error)
      setGenerateErrorMessage(message)
      toast({
        title: "Unable to generate payslips",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleLock = async () => {
    setIsLocking(true)
    try {
      await lockPayrollRun(runId)
      toast({
        title: "Payroll run locked",
        description: "Payroll run is locked. Publish it to enable payslip generation.",
      })
      await fetchRun()
    } catch (error) {
      const message = getErrorMessage(error)
      toast({
        title: "Unable to lock payroll run",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsLocking(false)
    }
  }

  const handleUnlock = async () => {
    setIsLocking(true)
    try {
      await unlockPayrollRun(runId)
      toast({
        title: "Payroll run unlocked",
        description: "Payroll run moved back to draft.",
      })
      await fetchRun()
    } catch (error) {
      const message = getErrorMessage(error)
      toast({
        title: "Unable to unlock payroll run",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsLocking(false)
    }
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    try {
      await publishPayrollRun(runId)
      toast({
        title: "Payroll run published",
        description: "Payroll run is published. You can now generate payslips.",
      })
      await fetchRun()
    } catch (error) {
      const message = getErrorMessage(error)
      toast({
        title: "Unable to publish payroll run",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleExportSalary = async () => {
    if (!run) return
    try {
      const endpoint = await getPayrollRunSalaryBankExportUrl(run.id)
      const filename = `payroll_salary_export_${run.year}_${String(run.month).padStart(2, "0")}.xlsx`
      await downloadWithAuth(endpoint, filename)
      toast({
        title: "Export started",
        description: "Salary excel download started.",
      })
    } catch (error) {
      toast({
        title: "Unable to export",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    }
  }

  const title = run
    ? `Payroll Run #${run.id} • ${formatMonthYear(run.month, run.year)}`
    : `Payroll Run #${params.id}`

  return (
    <RequireRole allowedRoles={["HR", "ADMIN"]}>
      <PageContainer
        title={title}
        description="Generate payslips only after the payroll run is published."
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {run ? <StatusBadge status={run.status} /> : null}
              {isLoading ? (
                <Badge variant="outline">Loading</Badge>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline">
                <Link href="/admin/payroll/payslips">View Payslips</Link>
              </Button>

              <Button
                variant="outline"
                onClick={handleExportSalary}
                disabled={isLoading || !run}
              >
                Export Salary Excel
              </Button>

              {isAdmin ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={!canLock || isLocking || isLoading}>
                      {isLocking ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Lock
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Lock payroll run?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Locking prevents edits to payroll items. After lock, publish to enable payslip
                        generation.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isLocking}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={handleLock} disabled={isLocking}>
                        {isLocking ? "Locking..." : "Lock"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}

              {isAdmin && normalizedStatus === "LOCKED" ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={isLocking || isLoading}>
                      {isLocking ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Unlock
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unlock payroll run?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will move the payroll run back to draft and allow edits.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isLocking}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={handleUnlock} disabled={isLocking}>
                        {isLocking ? "Unlocking..." : "Unlock"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={!canPublish || isPublishing || isLoading}>
                    {isPublishing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Publish
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Publish payroll run?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Publishing finalizes the payroll run. After publish, you can generate payslips.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPublishing}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handlePublish}
                      disabled={isPublishing}
                    >
                      {isPublishing ? "Publishing..." : "Publish"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={!canGenerate || isGenerating || isLoading}>
                    {isGenerating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Generate Payslips
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Generate payslips?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will generate payslips for all employees in this published payroll run.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isGenerating}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleGenerate(false)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? "Generating..." : "Generate"}
                    </AlertDialogAction>
                    <AlertDialogAction
                      onClick={() => handleGenerate(true)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? "Generating..." : "Generate + Email"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {loadErrorMessage ? (
            <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
              <div>{loadErrorMessage}</div>
              <Button variant="outline" onClick={fetchRun}>
                Retry
              </Button>
            </div>
          ) : null}

          {run && !canGenerate ? (
            <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
              Payslips can be generated only after publish. Current status:{" "}
              <span className="font-medium">{run.status}</span>
            </div>
          ) : null}

          {generateErrorMessage ? (
            <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
              <div>{generateErrorMessage}</div>
              <Button
                variant="outline"
                onClick={() => handleGenerate(false)}
                disabled={isGenerating || !canGenerate}
              >
                Retry generation
              </Button>
            </div>
          ) : null}

          {run ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Run Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-muted-foreground">Month</div>
                      <div className="font-medium">
                        {formatMonthYear(run.month, run.year)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Status</div>
                      <div className="font-medium">{String(run.status)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Salary Date</div>
                      <div className="font-medium">{formatDate(run.salary_date)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Payslip Date</div>
                      <div className="font-medium">{formatDate(run.payslip_date)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Employees</div>
                      <div className="font-medium">
                        {typeof run.total_employees === "number"
                          ? run.total_employees.toLocaleString("en-IN")
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Divisor Days</div>
                      <div className="font-medium">
                        {typeof run.divisor_days === "number" ? run.divisor_days : "—"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Totals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-muted-foreground">Gross Earned</div>
                      <div className="font-medium">{formatMoney(run.total_gross_earned)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Total Deductions</div>
                      <div className="font-medium">{formatMoney(run.total_deductions)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Net Payable</div>
                      <div className="font-medium">{formatMoney(run.total_net_payable)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Generated At</div>
                      <div className="font-medium">{formatDate(run.generated_at)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {run?.items && run.items.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Draft Details (Employees)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Emp</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Payable Days</TableHead>
                        <TableHead className="text-right">Earned Gross</TableHead>
                        <TableHead className="text-right">Deductions</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                        <TableHead className="text-right">Payslip</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {run.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.employee_code}</TableCell>
                          <TableCell>{item.employee_name}</TableCell>
                          <TableCell className="text-right">
                            {String(item.payable_days ?? "—")}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoney(item.earned_gross_salary)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoney(item.total_deductions)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoney(item.net_payable)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!run}
                              onClick={async () => {
                                if (!run) return
                                const y = run.year
                                const m = run.month
                                const endpoint = `/api/v1/payroll/payslip/${item.employee_id}?month=${y}-${pad2(m)}`
                                const filename = `payslip_${item.employee_code}_${pad2(m)}_${y}.pdf`
                                await downloadWithAuth(endpoint, filename)
                              }}
                            >
                              Download
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : run && !isLoading ? (
            <Card>
              <CardHeader>
                <CardTitle>Draft Details (Employees)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                No payroll items found for this run.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </PageContainer>
    </RequireRole>
  )
}
