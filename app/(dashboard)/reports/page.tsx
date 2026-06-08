"use client"

import React, { useEffect, useState, useCallback } from "react"
import { api, ApiClientError, fetchReportCsv } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { PageContainer } from "@/components/ui/page-container"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2,
  FileDown,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  TimerReset,
  Database,
  Users,
  BarChart3,
  Eye,
  Table2,
  RotateCcw,
  Filter,
  Download,
  FileText,
  BadgeCheck
} from "lucide-react"

type EmployeeOption = { id: number; emp_code: string; name: string }
type DepartmentOption = { id: number; name: string }

// Format helpers for IST conversion in preview table
function ensureIsoHasTZ(s: string): string {
  if (!s) return s
  const hasOffset = /[+-]\d{2}:\d{2}$/.test(s) || s.endsWith("Z")
  return hasOffset ? s : `${s}Z`
}
function formatIstDateTime(iso: string): string {
  if (!iso) return "-"
  const d = new Date(ensureIsoHasTZ(iso))
  if (isNaN(d.getTime())) return "-"
  const fmt = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
  return fmt.format(d).replace(",", "")
}
function formatIstTime(iso: string): string {
  if (!iso) return "-"
  const d = new Date(ensureIsoHasTZ(iso))
  if (isNaN(d.getTime())) return "-"
  const fmt = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
  return fmt.format(d)
}

function toYYYYMMDD(d: Date): string {
  return d.toLocaleDateString("en-CA")
}

function defaultFrom(): string {
  const d = new Date()
  return toYYYYMMDD(new Date(d.getFullYear(), d.getMonth(), 1))
}

function defaultTo(): string {
  return toYYYYMMDD(new Date())
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && String(v) !== "all") sp.set(k, String(v))
  })
  const q = sp.toString()
  return q ? `?${q}` : ""
}

function parseCsv(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  return lines.map((line) => {
    const row: string[] = []
    let cell = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        inQuotes = !inQuotes
      } else if (c === "," && !inQuotes) {
        row.push(cell.trim())
        cell = ""
      } else {
        cell += c
      }
    }
    row.push(cell.trim())
    return row
  })
}

function escapeCsvCell(cell: string): string {
  const s = cell ?? ""
  const needsQuotes = /[",\r\n]/.test(s)
  const escaped = s.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(escapeCsvCell).join(",")).join("\n") + "\n"
}

function formatCsvTimesForPreview(reportType: "attendance" | "leaves" | "compoff", parsed: string[][]): string[][] {
  if (parsed.length <= 1) return parsed
  if (reportType === "leaves") return parsed

  const headers = parsed[0] ?? []
  const inIdx = headers.findIndex((h) => h.toLowerCase() === "in_time")
  const outIdx = headers.findIndex((h) => h.toLowerCase() === "out_time")
  const punchDateIdx = headers.findIndex((h) => h.toLowerCase() === "punch_date")
  const withDate = punchDateIdx === -1

  const rows = parsed.slice(1).map((row) => {
    const next = [...row]
    if (inIdx >= 0 && inIdx < next.length) {
      next[inIdx] = withDate ? formatIstDateTime(next[inIdx]) : formatIstTime(next[inIdx])
    }
    if (outIdx >= 0 && outIdx < next.length) {
      next[outIdx] = next[outIdx]
        ? withDate
          ? formatIstDateTime(next[outIdx])
          : formatIstTime(next[outIdx])
        : "-"
    }
    return next
  })

  return [headers, ...rows]
}

const LEAVE_STATUSES = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "CANCELLED_BY_COMPANY", label: "Cancelled by Company" },
  { value: "REVOKED", label: "Revoked" },
]

const PREVIEW_ROWS = 20

export default function ReportsPage() {
  const { toast } = useToast()
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [departments, setDepartments] = useState<DepartmentOption[]>([])

  const [attendanceFrom, setAttendanceFrom] = useState(defaultFrom())
  const [attendanceTo, setAttendanceTo] = useState(defaultTo())
  const [attendanceEmployeeId, setAttendanceEmployeeId] = useState<string>("all")
  const [attendanceDepartmentId, setAttendanceDepartmentId] = useState<string>("all")
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceError, setAttendanceError] = useState<string | null>(null)

  const [leavesFrom, setLeavesFrom] = useState(defaultFrom())
  const [leavesTo, setLeavesTo] = useState(defaultTo())
  const [leavesEmployeeId, setLeavesEmployeeId] = useState<string>("all")
  const [leavesDepartmentId, setLeavesDepartmentId] = useState<string>("all")
  const [leavesStatus, setLeavesStatus] = useState<string>("all")
  const [leavesAllTime, setLeavesAllTime] = useState(false)
  const [leavesLoading, setLeavesLoading] = useState(false)
  const [leavesError, setLeavesError] = useState<string | null>(null)

  const [compoffFrom, setCompoffFrom] = useState(defaultFrom())
  const [compoffTo, setCompoffTo] = useState(defaultTo())
  const [compoffEmployeeId, setCompoffEmployeeId] = useState<string>("all")
  const [compoffLoading, setCompoffLoading] = useState(false)
  const [compoffError, setCompoffError] = useState<string | null>(null)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTitle, setPreviewTitle] = useState("")
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewDownloadFilename, setPreviewDownloadFilename] = useState("")
  const [previewDownloadUrl, setPreviewDownloadUrl] = useState("")
  const [previewReportType, setPreviewReportType] = useState<"attendance" | "leaves" | "compoff" | null>(null)

  useEffect(() => {
    api.get<{ id: number; emp_code: string; name: string }[]>("/api/v1/employees").then((r) => {
      setEmployees(Array.isArray(r) ? r : [])
    }).catch(() => {})
    api.get<{ id: number; name: string }[]>("/api/v1/departments").then((r) => {
      setDepartments(Array.isArray(r) ? r : [])
    }).catch(() => {})
  }, [])

  const triggerDownload = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const downloadCsvWithOptionalTimeFormatting = useCallback(
    async (reportType: "attendance" | "leaves" | "compoff", url: string, filename: string) => {
      const res = await fetchReportCsv(url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new ApiClientError(res.status, err as { detail: string })
      }

      const text = await res.text()
      // For attendance/compoff: export the same IST-formatted times as in preview.
      const parsed = parseCsv(text)
      const formatted = formatCsvTimesForPreview(reportType, parsed)
      const outText = reportType === "leaves" ? text : toCsv(formatted)
      const blob = new Blob([outText], { type: "text/csv;charset=utf-8" })
      triggerDownload(blob, filename)

      // Keep existing "no data" behavior
      if (outText.trim().split(/\r?\n/).filter(Boolean).length <= 1) {
        toast({ title: "No data for selected period", variant: "destructive" })
      } else {
        toast({ title: "Downloaded successfully" })
      }
    },
    [toast, triggerDownload]
  )

  const handleDownload = useCallback(
    async (
      reportType: "attendance" | "leaves" | "compoff",
      from: string,
      to: string,
      extraParams: Record<string, string | number | undefined>,
      setLoading: (v: boolean) => void,
      setError: (v: string | null) => void
    ) => {
      const base = "/api/v1/reports/" + (reportType === "attendance" ? "attendance.csv" : reportType === "leaves" ? "leaves.csv" : "compoff.csv")
      const params = { from, to, ...extraParams }
      const q = buildQuery(params)
      setLoading(true)
      setError(null)
      try {
        const filename = `${reportType}_${from.replace(/-/g, "")}_to_${to.replace(/-/g, "")}.csv`
        await downloadCsvWithOptionalTimeFormatting(reportType, `${base}${q}`, filename)
      } catch (e) {
        const msg = e instanceof ApiClientError ? (typeof e.data?.detail === "string" ? e.data.detail : "Download failed") : "Download failed"
        setError(msg)
        toast({ title: "Error", description: msg, variant: "destructive" })
      } finally {
        setLoading(false)
      }
    },
    [toast, downloadCsvWithOptionalTimeFormatting]
  )

  const handlePreview = useCallback(
    async (
      reportType: "attendance" | "leaves" | "compoff",
      from: string,
      to: string,
      extraParams: Record<string, string | number | undefined>,
      setError: (v: string | null) => void
    ) => {
      const base = "/api/v1/reports/" + (reportType === "attendance" ? "attendance.csv" : reportType === "leaves" ? "leaves.csv" : "compoff.csv")
      const params = { from, to, ...extraParams }
      const q = buildQuery(params)
      const downloadUrl = `${base}${q}`
      setPreviewOpen(true)
      setPreviewTitle(
        reportType === "leaves"
          ? "Leaves (all rows)"
          : (reportType === "attendance" ? "Attendance" : "Comp-Off") + " (first " + PREVIEW_ROWS + " rows)"
      )
      setPreviewReportType(reportType)
      setPreviewRows([])
      setPreviewDownloadFilename(`${reportType}_${from.replace(/-/g, "")}_to_${to.replace(/-/g, "")}.csv`)
      setPreviewDownloadUrl(downloadUrl)
      setPreviewLoading(true)
      setError(null)
      try {
        const res = await fetchReportCsv(downloadUrl)
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }))
          throw new ApiClientError(res.status, err as { detail: string })
        }
        const text = await res.text()
        let parsed = parseCsv(text)
        if (parsed.length === 0) {
          // No header, no rows
          setPreviewRows([["No data for selected period"]])
        } else if (parsed.length === 1) {
          // Header only, no data rows – still show columns plus a friendly message row
          setPreviewRows([parsed[0], ["No data for selected period"]])
        } else {
          // Header + data rows
          if (reportType === "leaves") {
            // Show all rows for Leaves report (role-scoped by backend)
            // No time fields to reformat for leaves preview today
            setPreviewRows(parsed)
          } else {
            // For other reports (attendance/compoff), reformat known timestamp columns for readability
            const headers = parsed[0] ?? []
            const inIdx = headers.findIndex((h) => h.toLowerCase() === "in_time")
            const outIdx = headers.findIndex((h) => h.toLowerCase() === "out_time")
            const punchDateIdx = headers.findIndex((h) => h.toLowerCase() === "punch_date")
            const withDate = punchDateIdx === -1
            const rows = parsed.slice(1).map((row) => {
              const next = [...row]
              if (inIdx >= 0 && inIdx < next.length) {
                next[inIdx] = withDate ? formatIstDateTime(next[inIdx]) : formatIstTime(next[inIdx])
              }
              if (outIdx >= 0 && outIdx < next.length) {
                next[outIdx] = next[outIdx] ? (withDate ? formatIstDateTime(next[outIdx]) : formatIstTime(next[outIdx])) : "-"
              }
              return next
            })
            parsed = [headers, ...rows]
            // Show first N rows to keep preview snappy
            setPreviewRows(parsed.slice(0, PREVIEW_ROWS + 1))
          }
        }
      } catch (e) {
        const msg = e instanceof ApiClientError ? (typeof e.data?.detail === "string" ? e.data.detail : "Failed to load") : "Failed to load"
        setError(msg)
        setPreviewRows([[msg]])
      } finally {
        setPreviewLoading(false)
      }
    },
    []
  )

  const renderErrorCard = (message: string) => (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 p-4 shadow-sm mb-4">
      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
      <div>
        <h4 className="text-sm font-semibold text-red-800 dark:text-red-300">Report generation failed</h4>
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{message}</p>
      </div>
    </div>
  )

  const resetAttendanceFilters = () => {
    setAttendanceFrom(defaultFrom())
    setAttendanceTo(defaultTo())
    setAttendanceEmployeeId("all")
    setAttendanceDepartmentId("all")
  }

  const resetLeavesFilters = () => {
    setLeavesFrom(defaultFrom())
    setLeavesTo(defaultTo())
    setLeavesEmployeeId("all")
    setLeavesDepartmentId("all")
    setLeavesStatus("all")
    setLeavesAllTime(false)
  }

  const resetCompoffFilters = () => {
    setCompoffFrom(defaultFrom())
    setCompoffTo(defaultTo())
    setCompoffEmployeeId("all")
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* 1. Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-8 shadow-xl">
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
            <FileSpreadsheet className="h-72 w-72 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm shadow-sm">
                  ACS HRMS Reports
                </Badge>
                <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-indigo-200 border-none backdrop-blur-sm font-semibold shadow-sm flex items-center gap-1">
                  <Download className="h-3 w-3" /> CSV Export
                </Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Reports Control Center</h1>
              <p className="max-w-xl text-slate-300">
                Generate attendance, leave and comp-off CSV reports with filters, preview and export options.
              </p>
            </div>
            <div className="hidden md:flex flex-col gap-2 bg-slate-900/50 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-inner">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Users className="h-4 w-4 text-indigo-400" /> {employees.length} Employees Loaded
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Database className="h-4 w-4 text-emerald-400" /> {departments.length} Departments Loaded
              </div>
            </div>
          </div>
        </div>

        {/* 2. KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Attendance Reports</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">CSV</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Leave Reports</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">CSV</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                <TimerReset className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Comp-Off Reports</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">CSV</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Master Filters Loaded</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{employees.length + departments.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Attendance Report Card */}
        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shadow-sm">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Attendance Report</CardTitle>
                <CardDescription className="text-sm text-slate-500 mt-1 max-w-xl">
                  Export attendance records for the selected date range with employee and department filters.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3 py-1 text-slate-500 font-medium">
              CSV Export
            </Badge>
          </CardHeader>
          <CardContent className="p-6">
            {attendanceError && renderErrorCard(attendanceError)}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From Date</Label>
                <Input
                  type="date"
                  value={attendanceFrom}
                  onChange={(e) => setAttendanceFrom(e.target.value)}
                  disabled={attendanceLoading}
                  className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To Date</Label>
                <Input
                  type="date"
                  value={attendanceTo}
                  onChange={(e) => setAttendanceTo(e.target.value)}
                  disabled={attendanceLoading}
                  className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</Label>
                <Select value={attendanceEmployeeId} onValueChange={setAttendanceEmployeeId} disabled={attendanceLoading}>
                  <SelectTrigger className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.emp_code} – {e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</Label>
                <Select value={attendanceDepartmentId} onValueChange={setAttendanceDepartmentId} disabled={attendanceLoading}>
                  <SelectTrigger className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-2">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                onClick={() =>
                  handleDownload(
                    "attendance",
                    attendanceFrom,
                    attendanceTo,
                    {
                      employee_id: attendanceEmployeeId === "all" ? undefined : attendanceEmployeeId,
                      department_id: attendanceDepartmentId === "all" ? undefined : attendanceDepartmentId,
                    },
                    setAttendanceLoading,
                    setAttendanceError
                  )
                }
                disabled={attendanceLoading}
              >
                {attendanceLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                Download CSV
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  handlePreview(
                    "attendance",
                    attendanceFrom,
                    attendanceTo,
                    {
                      employee_id: attendanceEmployeeId === "all" ? undefined : attendanceEmployeeId,
                      department_id: attendanceDepartmentId === "all" ? undefined : attendanceDepartmentId,
                    },
                    setAttendanceError
                  )
                }
                disabled={attendanceLoading}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview First {PREVIEW_ROWS} Rows
              </Button>
              <div className="flex-1"></div>
              <Button
                variant="ghost"
                className="rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                onClick={resetAttendanceFilters}
                disabled={attendanceLoading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 4. Leaves Report Card */}
        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shadow-sm">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Leaves Report</CardTitle>
                <CardDescription className="text-sm text-slate-500 mt-1 max-w-xl">
                  Export leave requests overlapping the selected period, including LWP days for salary deduction tracking.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3 py-1 text-slate-500 font-medium">
              CSV Export
            </Badge>
          </CardHeader>
          <CardContent className="p-6">
            {leavesError && renderErrorCard(leavesError)}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 items-end">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From Date</Label>
                <Input 
                  type="date" 
                  value={leavesFrom} 
                  onChange={(e) => setLeavesFrom(e.target.value)} 
                  disabled={leavesLoading || leavesAllTime} 
                  className={`rounded-xl h-10 ${leavesAllTime ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-slate-50/50 dark:bg-slate-900/50'}`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To Date</Label>
                <Input 
                  type="date" 
                  value={leavesTo} 
                  onChange={(e) => setLeavesTo(e.target.value)} 
                  disabled={leavesLoading || leavesAllTime} 
                  className={`rounded-xl h-10 ${leavesAllTime ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-slate-50/50 dark:bg-slate-900/50'}`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</Label>
                <Select value={leavesEmployeeId} onValueChange={setLeavesEmployeeId} disabled={leavesLoading}>
                  <SelectTrigger className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.emp_code} – {e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</Label>
                <Select value={leavesDepartmentId} onValueChange={setLeavesDepartmentId} disabled={leavesLoading}>
                  <SelectTrigger className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</Label>
                <Select value={leavesStatus} onValueChange={setLeavesStatus} disabled={leavesLoading}>
                  <SelectTrigger className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {LEAVE_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 mb-6 border border-slate-100 dark:border-slate-800 flex items-center gap-3 w-max">
              <input
                id="leaves-alltime"
                type="checkbox"
                checked={leavesAllTime}
                onChange={(e) => setLeavesAllTime(e.target.checked)}
                disabled={leavesLoading}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 ml-1"
              />
              <label htmlFor="leaves-alltime" className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none mr-2 cursor-pointer">
                Export All-Time Leaves (Ignores From/To dates)
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                onClick={() =>
                  handleDownload(
                    "leaves",
                    leavesAllTime ? "2000-01-01" : leavesFrom,
                    leavesAllTime ? "2099-12-31" : leavesTo,
                    {
                      employee_id: leavesEmployeeId === "all" ? undefined : leavesEmployeeId,
                      department_id: leavesDepartmentId === "all" ? undefined : leavesDepartmentId,
                      status: leavesStatus === "all" ? undefined : leavesStatus,
                    },
                    setLeavesLoading,
                    setLeavesError
                  )
                }
                disabled={leavesLoading}
              >
                {leavesLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                Download CSV
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  handlePreview(
                    "leaves",
                    leavesAllTime ? "2000-01-01" : leavesFrom,
                    leavesAllTime ? "2099-12-31" : leavesTo,
                    {
                      employee_id: leavesEmployeeId === "all" ? undefined : leavesEmployeeId,
                      department_id: leavesDepartmentId === "all" ? undefined : leavesDepartmentId,
                      status: leavesStatus === "all" ? undefined : leavesStatus,
                    },
                    setLeavesError
                  )
                }
                disabled={leavesLoading}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview First {PREVIEW_ROWS} Rows
              </Button>
              <div className="flex-1"></div>
              <Button
                variant="ghost"
                className="rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                onClick={resetLeavesFilters}
                disabled={leavesLoading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 5. Comp-Off Report Card */}
        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shadow-sm">
                <TimerReset className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Comp-Off Report</CardTitle>
                <CardDescription className="text-sm text-slate-500 mt-1 max-w-xl">
                  Export comp-off requests for the selected date range and employee filter.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3 py-1 text-slate-500 font-medium">
              CSV Export
            </Badge>
          </CardHeader>
          <CardContent className="p-6">
            {compoffError && renderErrorCard(compoffError)}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From Date</Label>
                <Input 
                  type="date" 
                  value={compoffFrom} 
                  onChange={(e) => setCompoffFrom(e.target.value)} 
                  disabled={compoffLoading} 
                  className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To Date</Label>
                <Input 
                  type="date" 
                  value={compoffTo} 
                  onChange={(e) => setCompoffTo(e.target.value)} 
                  disabled={compoffLoading} 
                  className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</Label>
                <Select value={compoffEmployeeId} onValueChange={setCompoffEmployeeId} disabled={compoffLoading}>
                  <SelectTrigger className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.emp_code} – {e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                onClick={() =>
                  handleDownload(
                    "compoff",
                    compoffFrom,
                    compoffTo,
                    { employee_id: compoffEmployeeId === "all" ? undefined : compoffEmployeeId },
                    setCompoffLoading,
                    setCompoffError
                  )
                }
                disabled={compoffLoading}
              >
                {compoffLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                Download CSV
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  handlePreview(
                    "compoff",
                    compoffFrom,
                    compoffTo,
                    { employee_id: compoffEmployeeId === "all" ? undefined : compoffEmployeeId },
                    setCompoffError
                  )
                }
                disabled={compoffLoading}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview First {PREVIEW_ROWS} Rows
              </Button>
              <div className="flex-1"></div>
              <Button
                variant="ghost"
                className="rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                onClick={resetCompoffFilters}
                disabled={compoffLoading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[92vw] max-h-[88vh] rounded-2xl p-0 overflow-hidden flex flex-col bg-white/95 dark:bg-slate-950/95" aria-describedby={previewLoading ? undefined : "preview-dialog-desc"}>
          <DialogHeader className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 sticky top-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">{previewTitle}</DialogTitle>
                  <DialogDescription id="preview-dialog-desc" className="mt-1">
                    {previewLoading
                      ? "Loading report…"
                      : previewRows.length === 1 && previewRows[0].length === 1
                      ? "No records found for the selected filters."
                      : previewReportType === "leaves"
                      ? `All rows shown (Rows: ${Math.max(0, previewRows.length - 1)}). Use Download to get a CSV copy.`
                      : `First ${PREVIEW_ROWS} rows of the report. Use Download to get the full CSV.`}
                  </DialogDescription>
                </div>
              </div>
              {previewReportType && (
                <Badge variant="outline" className="hidden sm:flex rounded-lg px-3 py-1 bg-white dark:bg-slate-950 font-semibold shadow-sm">
                  {previewReportType.toUpperCase()} PREVIEW
                </Badge>
              )}
            </div>
          </DialogHeader>
          <div className="overflow-auto flex-1 min-h-0 bg-white/50 dark:bg-slate-950/50 p-6">
            {previewLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
                <p className="font-medium">Preparing preview...</p>
              </div>
            ) : previewRows.length === 1 && previewRows[0].length === 1 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                  <Table2 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{previewRows[0][0]}</h3>
                <p className="mt-2 text-sm text-slate-500">Try a different date range or filters.</p>
              </div>
            ) : previewRows.length > 0 ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                    <TableRow className="hover:bg-transparent">
                      {previewRows[0]?.map((h, i) => (
                        <TableHead key={i} className="whitespace-nowrap font-semibold text-slate-700 dark:text-slate-300 h-10">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const headers = previewRows[0] || []
                      const timeCols = new Set(
                        headers
                          .map((h, i) => ({ h: h.toLowerCase(), i }))
                          .filter(({ h }) => h === "in_time" || h === "out_time")
                          .map(({ i }) => i)
                      )
                      return previewRows.slice(1).map((row, ri) => (
                        <TableRow key={ri} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          {row.map((cell, ci) => {
                            const isTime = timeCols.has(ci)
                            const cls = isTime ? "whitespace-nowrap font-mono text-sm" : "whitespace-nowrap max-w-[220px] truncate text-sm"
                            return (
                              <TableCell key={ci} className={cls} title={cell}>
                                {cell || (isTime ? "-" : "")}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))
                    })()}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm sticky bottom-0">
            <p className="text-sm text-slate-500 hidden sm:block">
              {!previewLoading && previewRows.length > 0 ? "Showing preview data only. Download for full CSV." : ""}
            </p>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button variant="outline" className="rounded-xl" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
              {!previewLoading && previewRows.length > 0 && (
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                  onClick={async () => {
                    if (!previewReportType || !previewDownloadUrl) return
                    await downloadCsvWithOptionalTimeFormatting(
                      previewReportType,
                      previewDownloadUrl,
                      previewDownloadFilename
                    )
                  }}
                >
                  <FileDown className="h-4 w-4 mr-2" /> Download Full CSV
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
