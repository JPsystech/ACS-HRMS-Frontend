"use client"

import { Download, Loader2, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Payslip } from "@/types/payroll"

type PayslipsTableProps = {
  items: Payslip[]
  isLoading: boolean
  errorMessage?: string | null
  downloadingId?: number | null
  onRefresh: () => void
  onDownload: (item: Payslip) => Promise<void> | void
}

function formatCurrency(value: string | number): string {
  const amount = Number(value)

  if (!Number.isFinite(amount)) {
    return String(value)
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatMonthYear(month: number, year: number): string {
  const date = new Date(year, Math.max(0, month - 1), 1)
  if (Number.isNaN(date.getTime())) return `${month}/${year}`

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(date)
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function StatusBadge({ status }: { status: Payslip["status"] }) {
  const normalized = String(status).toUpperCase()
  if (normalized === "GENERATED") return <Badge>Generated</Badge>
  if (normalized === "FAILED") return <Badge variant="destructive">Failed</Badge>
  return <Badge variant="outline">{status}</Badge>
}

export function PayslipsTable({
  items,
  isLoading,
  errorMessage,
  downloadingId,
  onRefresh,
  onDownload,
}: PayslipsTableProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle>Payslips</CardTitle>
            <p className="text-sm text-muted-foreground">
              Review generated payslips and download PDF files.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMessage ? (
          <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
            <div>{errorMessage}</div>
            <Button variant="outline" onClick={onRefresh}>
              Retry
            </Button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="No payslips found"
            description="Generate payslips after publishing a payroll run, then they will appear here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Employee Code</TableHead>
                <TableHead>Salary Month</TableHead>
                <TableHead>Payslip Date</TableHead>
                <TableHead className="text-right">Gross Salary</TableHead>
                <TableHead className="text-right">Total Deduction</TableHead>
                <TableHead className="text-right">Net Salary</TableHead>
                <TableHead>Generation Status</TableHead>
                <TableHead className="text-right">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.employee_name ?? `Employee #${item.employee_id}`}
                  </TableCell>
                  <TableCell>{item.employee_code ?? "—"}</TableCell>
                  <TableCell>{formatMonthYear(item.salary_month, item.salary_year)}</TableCell>
                  <TableCell>{formatDate(item.payslip_date)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.gross_salary)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.total_deduction)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.net_salary)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDownload(item)}
                      disabled={downloadingId === item.id}
                    >
                      {downloadingId === item.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

