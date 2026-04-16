"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarPlus, Loader2, RefreshCw } from "lucide-react"

import { RequireRole } from "@/components/auth/RequireRole"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
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
import { ApiClientError } from "@/lib/api"
import { generatePayrollRun, listPayrollRuns } from "@/services/payroll"
import { useAuthStore } from "@/store/auth-store"
import type { PayrollRun } from "@/types/payroll"

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.data?.detail || error.message || "Something went wrong."
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return "Something went wrong."
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

function StatusBadge({ status }: { status: PayrollRun["status"] }) {
  const normalized = String(status).toUpperCase()
  if (normalized === "PUBLISHED") return <Badge>Published</Badge>
  if (normalized === "LOCKED") return <Badge variant="secondary">Locked</Badge>
  return <Badge variant="outline">{status}</Badge>
}

export default function PayrollRunsPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()

  const [items, setItems] = useState<PayrollRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const now = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchRuns = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const runs = await listPayrollRuns()
      setItems(runs)
    } catch (error) {
      setItems([])
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && (user.role === "HR" || user.role === "ADMIN")) {
      fetchRuns()
    }
  }, [fetchRuns, user])

  const handleGenerateRun = useCallback(async () => {
    const m = Number(month)
    const y = Number(year)
    if (!Number.isFinite(m) || m < 1 || m > 12 || !Number.isFinite(y) || y < 2000) {
      toast({
        title: "Invalid input",
        description: "Enter a valid month (1-12) and year (>= 2000).",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      const run = await generatePayrollRun({ month: m, year: y })
      toast({
        title: "Payroll run generated",
        description: `Created run #${run.id} for ${formatMonthYear(run.month, run.year)}.`,
      })
      await fetchRuns()
    } catch (error) {
      toast({
        title: "Unable to generate payroll run",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }, [fetchRuns, month, toast, year])

  return (
    <RequireRole allowedRoles={["HR", "ADMIN"]}>
      <PageContainer
        title="Payroll Runs"
        description="Review monthly payroll runs, totals, and generate new runs."
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-md border bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Month</div>
                <Input value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Year</div>
                <Input value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleGenerateRun} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
                  Generate Run
                </Button>
                <Button variant="outline" onClick={fetchRuns} disabled={isLoading}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-md border bg-white p-6 text-sm text-muted-foreground">
              Loading payroll runs...
            </div>
          ) : null}

          {!isLoading && !items.length ? (
            <EmptyState
              icon={CalendarPlus}
              title="No payroll runs"
              description="Generate a payroll run to get started."
            />
          ) : null}

          {!isLoading && items.length ? (
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Employees</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Salary Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">
                        {formatMonthYear(run.month, run.year)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={run.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof run.total_employees === "number"
                          ? run.total_employees.toLocaleString("en-IN")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(run.total_gross_earned)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(run.total_net_payable)}
                      </TableCell>
                      <TableCell>{formatDate(run.salary_date)}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/payroll/runs/${run.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>
      </PageContainer>
    </RequireRole>
  )
}
