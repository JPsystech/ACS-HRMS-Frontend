"use client"

import { useEffect, useState } from "react"
import { api, ApiClientError } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { canAccessTeamModulesOrHr } from "@/lib/utils"
import { formatDateTimeIST } from "@/lib/format-attendance"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { format, parseISO } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/ui/page-container"
import { EmptyState } from "@/components/ui/empty-state"
import {
  AnimatedTable,
  AnimatedTableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/animated-table"
import {
  Calendar as CalendarIcon,
  FilterX,
  RotateCcw,
  FileClock,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Lock,
  User,
  BadgeCheck,
  ClipboardCheck,
  MessageSquareText,
  TimerReset,
  Loader2,
  CalendarDays
} from "lucide-react"

type Correction = {
  id: number
  employee_id: number
  employee_name?: string | null
  request_type: string
  date: string
  requested_punch_in?: string | null
  requested_punch_out?: string | null
  reason: string
  remarks?: string | null
  status: string
  approved_by?: number | null
  approved_role?: string | null
  approved_by_name?: string | null
  approved_at?: string | null
  admin_remarks?: string | null
  created_at?: string | null
  updated_at?: string | null
}

function getInitials(name?: string | null) {
  if (!name) return "??"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
}

function getRequestTypeLabel(type: string) {
  switch (type) {
    case "FORGOT_PUNCH_IN": return "Forgot Punch In"
    case "FORGOT_PUNCH_OUT": return "Forgot Punch Out"
    case "MISSED_BOTH": return "Missed Both"
    default: return type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
  }
}

function getRequestTypeBadgeClass(type: string) {
  switch (type) {
    case "FORGOT_PUNCH_IN": return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50"
    case "FORGOT_PUNCH_OUT": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50"
    case "MISSED_BOTH": return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50"
    default: return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700"
  }
}

function renderStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50 font-semibold px-2.5 py-0.5 rounded-lg shadow-none whitespace-nowrap">
          <Clock className="h-3 w-3 mr-1" /> Pending
        </Badge>
      )
    case "APPROVED":
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50 font-semibold px-2.5 py-0.5 rounded-lg shadow-none whitespace-nowrap">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
        </Badge>
      )
    case "REJECTED":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 font-semibold px-2.5 py-0.5 rounded-lg shadow-none whitespace-nowrap">
          <XCircle className="h-3 w-3 mr-1" /> Rejected
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700 font-semibold px-2.5 py-0.5 rounded-lg shadow-none whitespace-nowrap">
          {status}
        </Badge>
      )
  }
}

export default function AttendanceCorrectionsPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [items, setItems] = useState<Correction[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("PENDING")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [selected, setSelected] = useState<Correction | null>(null)
  const [adminRemarks, setAdminRemarks] = useState("")
  const [editPunchIn, setEditPunchIn] = useState("")
  const [editPunchOut, setEditPunchOut] = useState("")
  const [dialogMode, setDialogMode] = useState<"approve" | "reject" | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== "ALL") params.append("status_filter", statusFilter)
      if (dateFrom) params.append("date_from", dateFrom)
      if (dateTo) params.append("date_to", dateTo)

      const query = params.toString() ? `?${params.toString()}` : ""
      const data = await api.get<Correction[]>(`/api/v1/attendance-corrections${query}`)
      const sorted = (data || []).slice().sort((a, b) => {
        const aT = a.created_at ? new Date(a.created_at).getTime() : 0
        const bT = b.created_at ? new Date(b.created_at).getTime() : 0
        return bT - aT
      })
      setItems(sorted)
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.data.detail || "Failed to fetch" : "Unexpected error"
      toast({ variant: "destructive", title: "Error", description: msg })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canAccessTeamModulesOrHr(user as any)) {
      fetchItems()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFrom, dateTo, user])

  const resetFilters = () => {
    setDateFrom("")
    setDateTo("")
    setStatusFilter("PENDING")
  }

  const renderDecisionSummary = (it: Correction) => {
    if (it.status === "PENDING") {
      return <span className="text-sm font-medium text-slate-400 dark:text-slate-500 italic">Awaiting decision</span>
    }

    const by = it.approved_by_name || `ID: ${it.approved_by}`
    const role = it.approved_role || ""
    const at = it.approved_at ? formatDateTimeIST(it.approved_at) : "-"
    const remark = it.admin_remarks || ""

    return (
      <div className="flex flex-col gap-1.5 min-w-[200px] max-w-[250px] p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70">
        <div className="font-semibold text-xs flex items-center gap-1.5 flex-wrap">
          <span className={it.status === "APPROVED" ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"}>
            {it.status === "APPROVED" ? "Approved" : "Rejected"}
          </span>
          <span className="text-slate-400 font-normal">by</span>
          <span className="truncate max-w-[100px] text-slate-700 dark:text-slate-300" title={by}>{by}</span>
          {role && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-white dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800 shadow-none">
              {role}
            </Badge>
          )}
        </div>
        <div className="text-[10px] text-slate-500 font-medium">
          <span className="text-slate-400">At:</span> {at}
        </div>
        {remark && (
          <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 pt-1.5 border-t border-slate-200 dark:border-slate-800 truncate" title={remark}>
            <span className="font-semibold text-slate-400 mr-1">Remark:</span>
            {remark}
          </div>
        )}
      </div>
    )
  }

  const handleAction = async () => {
    if (!selected || !dialogMode) return
    setSubmitting(true)
    try {
      const endpoint = `/api/v1/attendance-corrections/${selected.id}/${dialogMode}`
      const payload: any = { admin_remarks: adminRemarks }
      if (dialogMode === "approve") {
        if (editPunchIn) payload.requested_punch_in = editPunchIn
        if (editPunchOut) payload.requested_punch_out = editPunchOut
      }
      await api.post<Correction>(endpoint, payload)
      toast({ title: "Success", description: `Request ${dialogMode}d` })
      setDialogMode(null)
      setSelected(null)
      setAdminRemarks("")
      setEditPunchIn("")
      setEditPunchOut("")
      await fetchItems()
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.data.detail || "Action failed" : "Unexpected error"
      toast({ variant: "destructive", title: "Error", description: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const renderLoadingSkeleton = () => (
    <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800/60">
        <Skeleton className="h-6 w-64 mb-2 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded-lg" />
      </div>
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </Card>
  )

  if (!canAccessTeamModulesOrHr(user as any)) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6">
          <Card className="max-w-md w-full rounded-3xl border-red-200/70 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 shadow-xl backdrop-blur-sm overflow-hidden text-center flex flex-col items-center p-12">
            <div className="h-20 w-20 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-6 shadow-sm">
              <Lock className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Access Denied</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">You do not have access to Attendance Corrections.</p>
          </Card>
        </div>
      </PageContainer>
    )
  }

  const totalRequests = items.length
  const pendingRequests = items.filter(i => i.status === "PENDING").length
  const approvedRequests = items.filter(i => i.status === "APPROVED").length
  const rejectedRequests = items.filter(i => i.status === "REJECTED").length
  const dateFilterActive = dateFrom || dateTo ? "Yes" : "No"

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* 1. Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-8 shadow-xl">
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
            <FileClock className="h-72 w-72 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm shadow-sm">
                  ACS HRMS Corrections
                </Badge>
                <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-indigo-200 border-none backdrop-blur-sm font-semibold shadow-sm">
                  Status: {statusFilter}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Attendance Correction Control Center</h1>
              <p className="max-w-xl text-slate-300">
                Review employee punch correction requests, validate missed punches, approve or reject with proper admin remarks.
              </p>
            </div>
          </div>
        </div>

        {/* 2. KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <FileClock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Requests</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalRequests}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pendingRequests}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Approved</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{approvedRequests}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Rejected</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{rejectedRequests}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Date Filter Active</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{dateFilterActive}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Premium Filter Card */}
        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FilterX className="h-5 w-5 text-indigo-500" /> Correction Request Filters
              </h3>
              <p className="text-sm text-slate-500 mt-1">Filter attendance correction requests by date range and approval status.</p>
            </div>
            <Button
              variant="outline"
              className="rounded-xl h-10 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium whitespace-nowrap shadow-sm"
              onClick={resetFilters}
            >
              <RotateCcw className="h-4 w-4 mr-2 text-slate-500" />
              Reset Filters
            </Button>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From Date</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-xl h-10 pl-9 bg-slate-50/50 dark:bg-slate-900/50"
                  />
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To Date</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-xl h-10 pl-9 bg-slate-50/50 dark:bg-slate-900/50"
                  />
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                  <SelectTrigger className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Correction Register Table */}
        {loading ? renderLoadingSkeleton() : items.length === 0 ? (
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden p-12 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <FileClock className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No correction requests found</h3>
            <p className="text-slate-500 max-w-md mb-6">No attendance correction requests match the selected filters.</p>
            <Button variant="outline" onClick={resetFilters} className="rounded-xl">
              <RotateCcw className="h-4 w-4 mr-2" /> Reset Filters
            </Button>
          </Card>
        ) : (
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/60 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Correction Request Register</h3>
                <p className="text-sm text-slate-500 mt-1">Employee punch correction requests with requested time, reason, decision status and approval details.</p>
              </div>
              <Badge variant="secondary" className="rounded-lg px-3 py-1 bg-slate-100 dark:bg-slate-800 font-medium whitespace-nowrap self-start sm:self-auto text-slate-600 dark:text-slate-300 border-none">
                {items.length} Records
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[1250px]">
                <AnimatedTable>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60">
                    <TableRow className="hover:bg-transparent border-0">
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">ID</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Employee</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Requested At</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Work Date</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Type</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Requested In</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Requested Out</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Reason</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Decision Details</TableHead>
                      <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it, index) => (
                      <AnimatedTableRow key={it.id} delay={index * 0.02} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-0 group">
                        <TableCell className="font-mono text-slate-500">{it.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm shadow-sm">
                              {getInitials(it.employee_name)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-slate-100">{it.employee_name || "Unknown"}</span>
                              <span className="text-xs font-mono text-slate-500 mt-0.5 bg-slate-100 dark:bg-slate-800 px-1 rounded inline-block w-max">Employee #{it.employee_id}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-300">
                          {it.created_at ? formatDateTimeIST(it.created_at) : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {it.date ? (
                            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                              <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                              {format(parseISO(it.date), "dd MMM yyyy")}
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`px-2.5 py-1 rounded-lg font-semibold shadow-none whitespace-nowrap ${getRequestTypeBadgeClass(it.request_type)}`}>
                            {getRequestTypeLabel(it.request_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {it.requested_punch_in ? (
                            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {formatDateTimeIST(it.requested_punch_in)}
                            </div>
                          ) : <span className="text-slate-400">—</span>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {it.requested_punch_out ? (
                            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {formatDateTimeIST(it.requested_punch_out)}
                            </div>
                          ) : <span className="text-slate-400">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[320px] bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed" title={it.reason}>
                            {it.reason}
                          </div>
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(it.status)}
                        </TableCell>
                        <TableCell>
                          {renderDecisionSummary(it)}
                        </TableCell>
                        <TableCell className="text-right">
                          {it.status === "PENDING" ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-900/30 font-semibold shadow-sm px-3"
                                onClick={() => {
                                  setSelected(it);
                                  setDialogMode("approve");

                                  let initialPunchIn = it.requested_punch_in;
                                  let initialPunchOut = it.requested_punch_out;

                                  if (it.request_type === "FORGOT_PUNCH_IN" && !initialPunchIn && initialPunchOut) {
                                    initialPunchIn = initialPunchOut;
                                    initialPunchOut = null;
                                  } else if (it.request_type === "FORGOT_PUNCH_OUT" && !initialPunchOut && initialPunchIn) {
                                    initialPunchOut = initialPunchIn;
                                    initialPunchIn = null;
                                  }

                                  setEditPunchIn(initialPunchIn ? initialPunchIn.slice(0, 16) : "");
                                  setEditPunchOut(initialPunchOut ? initialPunchOut.slice(0, 16) : "");
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/30 font-semibold shadow-sm px-3"
                                onClick={() => {
                                  setSelected(it);
                                  setDialogMode("reject");
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-1.5" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 italic">Completed</span>
                          )}
                        </TableCell>
                      </AnimatedTableRow>
                    ))}
                  </TableBody>
                </AnimatedTable>
              </div>
            </div>
          </Card>
        )}

        {/* 5. Approve / Reject Dialog */}
        <Dialog open={dialogMode !== null} onOpenChange={(o) => {
          if (!o) {
            setDialogMode(null);
            setSelected(null);
            setAdminRemarks("");
            setEditPunchIn("");
            setEditPunchOut("");
          }
        }}>
          <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden bg-white/95 dark:bg-slate-950/95 border-slate-200/60 dark:border-slate-800/60 shadow-2xl">
            <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${dialogMode === 'approve' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {dialogMode === "approve" ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">
                    {dialogMode === "approve" ? "Approve Correction Request" : "Reject Correction Request"}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-slate-500">
                    {dialogMode === "approve"
                      ? "Verify or adjust requested punch time before approval."
                      : "Add remarks explaining why this correction request is rejected."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="p-6 space-y-6">

              {/* Request Summary Card */}
              {selected && (
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs shadow-sm">
                        {getInitials(selected.employee_name)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{selected.employee_name || "Unknown"}</span>
                        <span className="text-[10px] font-mono text-slate-500">Employee #{selected.employee_id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`px-2 py-0.5 rounded-lg text-xs shadow-none ${getRequestTypeBadgeClass(selected.request_type)}`}>
                        {getRequestTypeLabel(selected.request_type)}
                      </Badge>
                      <Badge variant="outline" className="px-2 py-0.5 rounded-lg text-xs shadow-none font-semibold flex items-center gap-1 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700">
                        <CalendarIcon className="h-3 w-3" />
                        {selected.date ? format(parseISO(selected.date), "dd MMM yyyy") : "—"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Original Reason</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      {selected.reason}
                    </p>
                  </div>
                </div>
              )}

              {/* Corrected Punch Timing */}
              {dialogMode === "approve" && selected && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(selected.request_type === "FORGOT_PUNCH_IN" || selected.request_type === "MISSED_BOTH") && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Corrected Punch-In</Label>
                      <Input
                        type="datetime-local"
                        value={editPunchIn}
                        onChange={(e) => setEditPunchIn(e.target.value)}
                        className="rounded-xl h-11"
                      />
                    </div>
                  )}
                  {(selected.request_type === "FORGOT_PUNCH_OUT" || selected.request_type === "MISSED_BOTH") && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Corrected Punch-Out</Label>
                      <Input
                        type="datetime-local"
                        value={editPunchOut}
                        onChange={(e) => setEditPunchOut(e.target.value)}
                        className="rounded-xl h-11"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Admin Remarks */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {dialogMode === "approve" ? "Approval Remarks (optional)" : "Rejection Remarks (recommended)"}
                </Label>
                <Textarea
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  rows={4}
                  placeholder="Enter remarks for the employee..."
                  className="rounded-xl resize-none"
                />
              </div>

            </div>
            <DialogFooter className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Button variant="outline" className="rounded-xl" onClick={() => { setDialogMode(null); setSelected(null); setAdminRemarks(""); }} disabled={submitting}>Cancel</Button>
              <Button
                onClick={handleAction}
                disabled={submitting}
                className={`rounded-xl shadow-sm text-white ${dialogMode === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  dialogMode === "approve" ? "Approve Request" : "Reject Request"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PageContainer>
  )
}
