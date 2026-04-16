"use client"

import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"
import { PayrollAttendanceDailyBreakdown } from "@/types/payroll"
import { CalendarDays } from "lucide-react"

type AttendanceDailyBreakdownProps = {
  items: PayrollAttendanceDailyBreakdown[]
  isLoading: boolean
}

function formatTime(value: string | null): string {
  if (!value) return "—"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed)
}

function formatWorkedHours(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

function getStatusBadgeClass(status: PayrollAttendanceDailyBreakdown["status"]): string {
  switch (status) {
    case "MISS_PUNCH":
      return "border-red-200 bg-red-100 text-red-700 hover:bg-red-100"
    case "PAID_LEAVE":
    case "UNPAID_LEAVE":
      return "border-blue-200 bg-blue-100 text-blue-700 hover:bg-blue-100"
    case "WEEKLY_OFF":
      return "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100"
    case "HALF_DAY":
      return "border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-100"
    case "ABSENT":
      return "border-rose-200 bg-rose-100 text-rose-700 hover:bg-rose-100"
    default:
      return "border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
  }
}

function formatStatus(status: PayrollAttendanceDailyBreakdown["status"]): string {
  return status.replaceAll("_", " ")
}

export function AttendanceStatusBadge({
  status,
}: {
  status: PayrollAttendanceDailyBreakdown["status"]
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", getStatusBadgeClass(status))}>
      {formatStatus(status)}
    </Badge>
  )
}

export function LateBadge() {
  return (
    <Badge
      variant="outline"
      className="border-yellow-200 bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
    >
      Late
    </Badge>
  )
}

export function AttendanceDailyBreakdown({
  items,
  isLoading,
}: AttendanceDailyBreakdownProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>Daily Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No daily breakdown available"
            description="Run the preview for a valid payroll month to see day-wise attendance."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>In Time</TableHead>
                  <TableHead>Out Time</TableHead>
                  <TableHead>Worked Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.work_date}>
                    <TableCell className="font-medium">
                      {format(new Date(item.work_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>{formatTime(item.punch_in_at)}</TableCell>
                    <TableCell>{formatTime(item.punch_out_at)}</TableCell>
                    <TableCell>{formatWorkedHours(item.worked_minutes)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <AttendanceStatusBadge status={item.status} />
                        {item.is_late ? <LateBadge /> : null}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">
                      {item.notes || "—"}
                    </TableCell>
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
