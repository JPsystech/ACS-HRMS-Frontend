"use client"

import { Loader2, RefreshCw, Users } from "lucide-react"

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
import { PayrollAttendanceSummary } from "@/types/payroll"

type AttendancePreviewTableProps = {
  items: PayrollAttendanceSummary[]
  isLoading: boolean
  errorMessage?: string | null
  onRetry: () => void
  onRowClick: (item: PayrollAttendanceSummary) => void
}

function formatDays(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function AttendancePreviewTable({
  items,
  isLoading,
  errorMessage,
  onRetry,
  onRowClick,
}: AttendancePreviewTableProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Attendance Preview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review payroll-ready attendance totals before payroll processing.
          </p>
        </div>
        <Button variant="outline" onClick={onRetry} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Retry
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No attendance previews found"
            description="Try changing the month, year, or department filter and run the preview again."
            action={{ label: "Retry", onClick: onRetry }}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Present Days</TableHead>
                  <TableHead>Half Days</TableHead>
                  <TableHead>Absent Days</TableHead>
                  <TableHead>Weekly Off Days</TableHead>
                  <TableHead>Paid Leave Days</TableHead>
                  <TableHead>Unpaid Leave Days</TableHead>
                  <TableHead>Miss Punch Days</TableHead>
                  <TableHead>Late Count</TableHead>
                  <TableHead>Payable Days</TableHead>
                  <TableHead>LWP Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.employee_id}
                    className="cursor-pointer"
                    onClick={() => onRowClick(item)}
                  >
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div>{item.employee_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.employee_code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDays(item.present_days)}</TableCell>
                    <TableCell>{formatDays(item.half_days)}</TableCell>
                    <TableCell>{formatDays(item.absent_days)}</TableCell>
                    <TableCell>{formatDays(item.weekly_off_days)}</TableCell>
                    <TableCell>{formatDays(item.paid_leave_days)}</TableCell>
                    <TableCell>{formatDays(item.unpaid_leave_days)}</TableCell>
                    <TableCell>{formatDays(item.miss_punch_days)}</TableCell>
                    <TableCell>{formatDays(item.late_count)}</TableCell>
                    <TableCell>{formatDays(item.payable_days)}</TableCell>
                    <TableCell>{formatDays(item.lwp_days)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
