"use client"

import React, { useEffect, useState, useCallback } from "react"
import { api, ApiClientError, fetchReportCsv } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { PageContainer } from "@/components/ui/page-container"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Loader2, FileDown, FileSpreadsheet, AlertCircle } from "lucide-react"

type EmployeeOption = { id: number; emp_code: string; name: string }
type DepartmentOption = { id: number; name: string }

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

const LEAVE_STATUSES = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
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
        const res = await fetchReportCsv(`${base}${q}`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }))
          throw new ApiClientError(res.status, err as { detail: string })
        }
        const blob = await res.blob()
        const filename = `${reportType}_${from.replace(/-/g, "")}_to_${to.replace(/-/g, "")}.csv`
        triggerDownload(blob, filename)
        toast({ title: "Downloaded successfully" })
        const text = await blob.text()
        if (text.trim().split(/\r?\n/).filter(Boolean).length <= 1) {
          toast({ title: "No data for selected period", variant: "destructive" })
        }
      } catch (e) {
        const msg = e instanceof ApiClientError ? (typeof e.data?.detail === "string" ? e.data.detail : "Download failed") : "Download failed"
        setError(msg)
        toast({ title: "Error", description: msg, variant: "destructive" })
      } finally {
        setLoading(false)
      }
    },
    [toast, triggerDownload]
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
      setPreviewOpen(true)
      setPreviewTitle((reportType === "attendance" ? "Attendance" : reportType === "leaves" ? "Leaves" : "Comp-Off") + " (first " + PREVIEW_ROWS + " rows)")
      setPreviewRows([])
      setPreviewDownloadFilename(`${reportType}_${from.replace(/-/g, "")}_to_${to.replace(/-/g, "")}.csv`)
      setPreviewLoading(true)
      setError(null)
      try {
        const res = await fetchReportCsv(`${base}${q}`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }))
          throw new ApiClientError(res.status, err as { detail: string })
        }
        const text = await res.text()
        const parsed = parseCsv(text)
        if (parsed.length === 0) {
          // No header, no rows
          setPreviewRows([["No data for selected period"]])
        } else if (parsed.length === 1) {
          // Header only, no data rows – still show columns plus a friendly message row
          setPreviewRows([parsed[0], ["No data for selected period"]])
        } else {
          // Header + data rows – show up to first 20 data rows
          setPreviewRows(parsed.slice(0, PREVIEW_ROWS + 1))
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

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">View and generate reports</p>
        </div>

        {/* Attendance Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Attendance Report
            </CardTitle>
            <CardDescription>
              Export attendance records for the selected date range. Filters apply as supported by the backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {attendanceError && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {attendanceError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Input
                  type="date"
                  value={attendanceFrom}
                  onChange={(e) => setAttendanceFrom(e.target.value)}
                  disabled={attendanceLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input
                  type="date"
                  value={attendanceTo}
                  onChange={(e) => setAttendanceTo(e.target.value)}
                  disabled={attendanceLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={attendanceEmployeeId} onValueChange={setAttendanceEmployeeId} disabled={attendanceLoading}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.emp_code} – {e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={attendanceDepartmentId} onValueChange={setAttendanceDepartmentId} disabled={attendanceLoading}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
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
                {attendanceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                <span className="ml-2">Download CSV</span>
              </Button>
              <Button
                variant="secondary"
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
                Preview (first 20 rows)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Leaves Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Leaves Report
            </CardTitle>
            <CardDescription>
              Export leave requests overlapping the date range. Filters apply as supported by the backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {leavesError && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {leavesError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label>From</Label>
                <Input type="date" value={leavesFrom} onChange={(e) => setLeavesFrom(e.target.value)} disabled={leavesLoading} />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input type="date" value={leavesTo} onChange={(e) => setLeavesTo(e.target.value)} disabled={leavesLoading} />
              </div>
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={leavesEmployeeId} onValueChange={setLeavesEmployeeId} disabled={leavesLoading}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.emp_code} – {e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={leavesDepartmentId} onValueChange={setLeavesDepartmentId} disabled={leavesLoading}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={leavesStatus} onValueChange={setLeavesStatus} disabled={leavesLoading}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    {LEAVE_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  handleDownload(
                    "leaves",
                    leavesFrom,
                    leavesTo,
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
                {leavesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                <span className="ml-2">Download CSV</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  handlePreview(
                    "leaves",
                    leavesFrom,
                    leavesTo,
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
                Preview (first 20 rows)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comp-Off Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Comp-Off Report
            </CardTitle>
            <CardDescription>
              Export comp-off requests for the selected date range. Filters apply as supported by the backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {compoffError && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {compoffError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>From</Label>
                <Input type="date" value={compoffFrom} onChange={(e) => setCompoffFrom(e.target.value)} disabled={compoffLoading} />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input type="date" value={compoffTo} onChange={(e) => setCompoffTo(e.target.value)} disabled={compoffLoading} />
              </div>
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={compoffEmployeeId} onValueChange={setCompoffEmployeeId} disabled={compoffLoading}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.emp_code} – {e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
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
                {compoffLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                <span className="ml-2">Download CSV</span>
              </Button>
              <Button
                variant="secondary"
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
                Preview (first 20 rows)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[90vw] max-h-[85vh] overflow-hidden flex flex-col" aria-describedby={previewLoading ? undefined : "preview-dialog-desc"}>
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription id="preview-dialog-desc">
              {previewLoading ? "Loading report…" : previewRows.length === 1 && previewRows[0].length === 1 ? "No records found for the selected filters." : "First 20 rows of the report. Use Download to get the full CSV."}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto flex-1 min-h-0">
            {previewLoading ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading…
              </div>
            ) : previewRows.length === 1 && previewRows[0].length === 1 ? (
              <div className="py-4">
                <p className="text-muted-foreground">{previewRows[0][0]}</p>
                <p className="mt-2 text-sm text-muted-foreground">Try a different date range or filters.</p>
              </div>
            ) : previewRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewRows[0]?.map((h, i) => (
                      <TableHead key={i} className="whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.slice(1).map((row, ri) => (
                    <TableRow key={ri}>
                      {row.map((cell, ci) => (
                        <TableCell key={ci} className="whitespace-nowrap max-w-[200px] truncate" title={cell}>{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </div>
          {!previewLoading && previewRows.length > 0 && (
            <div className="flex justify-end pt-2 border-t">
              <Button
                size="sm"
                onClick={async () => {
                  const m = previewDownloadFilename.match(/^(\w+)_(\d{8})_to_(\d{8})\.csv$/)
                  if (!m) return
                  const reportType = m[1]
                  const fromStr = m[2].replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")
                  const toStr = m[3].replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")
                  const base = `/api/v1/reports/${reportType}.csv`
                  const res = await fetchReportCsv(`${base}?from=${fromStr}&to=${toStr}`)
                  if (!res.ok) return
                  const blob = await res.blob()
                  triggerDownload(blob, previewDownloadFilename)
                  toast({ title: "Downloaded successfully" })
                }}
              >
                <FileDown className="h-4 w-4 mr-1" /> Download
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
