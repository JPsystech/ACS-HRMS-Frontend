"use client"

import React, { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Employee, Department, RoleDefinition } from "@/types/models"
import { PageContainer } from "@/components/ui/page-container"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import {
  Check,
  X,
  RefreshCw,
  Loader2,
  Home,
  Laptop,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  CalendarX,
  CalendarDays,
  Building2,
  AlertTriangle,
  RotateCcw,
  Search,
  Users,
  MessageSquareText,
  ShieldCheck,
  BadgeCheck,
  FileClock,
  ChevronRight
} from "lucide-react"
import { format } from "date-fns"

type WfhStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"

type WfhRequest = {
  id: number
  employee_id: number
  department_id?: number | null
  request_date: string
  reason?: string | null
  status: WfhStatus
  applied_at?: string | null
  approved_by?: number | null
  approver?: { id: number; name: string; role: string } | null
  approved_role?: string | null
  approved_at?: string | null
  approval_remark?: string | null
}

export default function WfhApprovalsPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()

  const [wfhRequests, setWfhRequests] = useState<WfhRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [filters, setFilters] = useState<{ from?: string; to?: string; department_id?: number | undefined; employee_id?: number | undefined }>({})
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string>("")
  const [submittingId, setSubmittingId] = useState<number | null>(null)

  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [selectedWfh, setSelectedWfh] = useState<WfhRequest | null>(null)
  const [remarks, setRemarks] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | WfhStatus>("ALL")

  useEffect(() => {
    if (user) {
      fetchLookups()
      fetchWfh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchWfh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, filters.department_id, filters.employee_id, filters.from, filters.to])

  const fetchLookups = async () => {
    try {
      const [employeesData, departmentsData, rolesData] = await Promise.all([
        api.get<Employee[]>("/api/v1/employees?limit=1000").catch(() => []),
        api.get<Department[]>("/api/v1/departments").catch(() => []),
        api.get<RoleDefinition[]>("/api/v1/roles").catch(() => []),
      ])
      setEmployees(Array.isArray(employeesData) ? employeesData : [])
      setDepartments(Array.isArray(departmentsData) ? departmentsData : [])
      setRoles(Array.isArray(rolesData) ? rolesData : [])
    } catch {
      setEmployees([])
      setDepartments([])
    }
  }

  const fetchWfh = async () => {
    setLoading(true)
    setApiError("")
    try {
      const params = new URLSearchParams()
      const usePendingEndpoint = statusFilter === "PENDING"
      if (!usePendingEndpoint && statusFilter !== "ALL") {
        params.set("status", statusFilter)
      }
      if (filters.from) params.set("from", filters.from)
      if (filters.to) params.set("to", filters.to)
      if (filters.department_id != null) params.set("department_id", String(filters.department_id))
      if (filters.employee_id != null) params.set("employee_id", String(filters.employee_id))

      const basePath = usePendingEndpoint ? "/api/v1/wfh/pending" : "/api/v1/wfh/list"
      const url = params.toString() ? `${basePath}?${params.toString()}` : basePath

      const res = await api.get<{ items?: WfhRequest[]; total?: number }>(url)
      const items = Array.isArray(res?.items) ? res.items : res?.items ?? []
      setWfhRequests(items)
    } catch (err) {
      if (err instanceof ApiClientError) {
        const detail = typeof err.data?.detail === "string" ? err.data.detail : "Failed to load WFH requests"
        setApiError(detail)
      } else {
        setApiError("Failed to load WFH requests")
      }
      setWfhRequests([])
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name?: string | null) => {
    if (!name) return "??"
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
  }

  const getEmployeeById = (employeeId: number) => {
    return employees.find((e) => e.id === employeeId)
  }

  const getEmployeeDisplay = (employeeId: number | undefined | null, approverObj?: { name: string } | null) => {
    if (approverObj && approverObj.name) return approverObj.name
    if (!employeeId) return "Unknown"
    const emp = getEmployeeById(employeeId)
    if (emp) return emp.name
    return `System User #${employeeId}`
  }

  const getDepartmentDisplay = (departmentId?: number | null, employeeId?: number, wfhRequest?: any) => {
    if (wfhRequest?.employee?.department?.name) return wfhRequest.employee.department.name
    if (departmentId != null) {
      const dept = departments.find((d) => d.id === departmentId)
      if (dept) return dept.name
    }
    if (employeeId == null) return "—"
    const emp = getEmployeeById(employeeId)
    if (emp?.department_id) {
      const dept = departments.find((d) => d.id === emp.department_id)
      if (dept) return dept.name
    }
    if (emp?.reporting_manager_id) {
      const mgr = getEmployeeById(emp.reporting_manager_id)
      if (mgr?.department_id) {
        const dept = departments.find((d) => d.id === mgr.department_id)
        if (dept) return dept.name
      }
    }
    return "—"
  }

  const getStatusBadgeClass = (status: WfhStatus) => {
    switch (status) {
      case "PENDING": return "bg-amber-50 text-amber-700 border-amber-200"
      case "APPROVED": return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "REJECTED": return "bg-red-50 text-red-700 border-red-200"
      case "CANCELLED": return "bg-slate-50 text-slate-700 border-slate-200"
      default: return "bg-slate-50 text-slate-700 border-slate-200"
    }
  }

  const renderStatusBadge = (status: WfhStatus) => {
    let Icon = Clock
    if (status === "APPROVED") Icon = CheckCircle2
    if (status === "REJECTED") Icon = XCircle
    if (status === "CANCELLED") Icon = Ban

    return (
      <Badge variant="outline" className={`${getStatusBadgeClass(status)} font-medium shadow-none gap-1 px-2 py-0.5`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  const formatDateSafe = (value?: string | null) => {
    if (!value) return "—"
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? "—" : format(d, "MMM dd, yyyy")
  }

  const formatDateTimeSafe = (value?: string | null) => {
    if (!value) return "—"
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy, hh:mm a")
  }

  const canActOnRequest = (wfh: WfhRequest) => {
    if (!user) return false
    if (["MD", "VP", "HR", "ADMIN"].includes(user.role)) return true
    const emp = getEmployeeById(wfh.employee_id)
    if (!emp) return false
    return emp.reporting_manager_id === user.id
  }

  const handleOpenApprove = (wfh: WfhRequest) => {
    setSelectedWfh(wfh)
    setRemarks("")
    setApproveOpen(true)
  }

  const handleOpenReject = (wfh: WfhRequest) => {
    setSelectedWfh(wfh)
    setRemarks("")
    setRejectOpen(true)
  }

  const handleConfirmApprove = async () => {
    if (!selectedWfh) return
    setSubmittingId(selectedWfh.id)
    try {
      const body = remarks.trim() ? { remarks: remarks.trim() } : {}
      await api.post(`/api/v1/wfh/${selectedWfh.id}/approve`, body)
      toast({ title: "WFH approved", description: "WFH request approved successfully." })
      setApproveOpen(false)
      setSelectedWfh(null)
      setRemarks("")
      window.dispatchEvent(new Event("wfh-action-done"))
      await fetchWfh()
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 403) {
          toast({ variant: "destructive", title: "Not authorized", description: "Only reporting manager or HR can approve this request" })
        } else {
          toast({ variant: "destructive", title: "Error", description: err.data.detail || "Failed to approve WFH request" })
        }
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to approve WFH request" })
      }
    } finally {
      setSubmittingId(null)
    }
  }

  const handleConfirmReject = async () => {
    if (!selectedWfh) return
    setSubmittingId(selectedWfh.id)
    try {
      const body = remarks.trim() ? { remarks: remarks.trim() } : {}
      await api.post(`/api/v1/wfh/${selectedWfh.id}/reject`, body)
      toast({ title: "WFH rejected", description: "WFH request rejected successfully." })
      setRejectOpen(false)
      setSelectedWfh(null)
      setRemarks("")
      window.dispatchEvent(new Event("wfh-action-done"))
      await fetchWfh()
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 403) {
          toast({ variant: "destructive", title: "Not authorized", description: "Only reporting manager or HR can approve this request" })
        } else {
          toast({ variant: "destructive", title: "Error", description: err.data.detail || "Failed to reject WFH request" })
        }
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to reject WFH request" })
      }
    } finally {
      setSubmittingId(null)
    }
  }

  const resetFilters = () => {
    setFilters({})
    setStatusFilter("ALL")
  }

  const renderMetricCard = (label: string, value: number, icon: React.ReactNode, tone: string) => {
    const toneMap: Record<string, string> = {
      slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
      emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
      red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
      orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
    }

    return (
      <Card className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
        <CardContent className="flex items-center gap-4 p-5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneMap[tone] || toneMap.slate}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderLoadingSkeleton = () => (
    <Card className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md p-6">
      <Skeleton className="h-8 w-64 mb-6 rounded-xl" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </Card>
  )

  const renderWfhSummaryCard = (wfh: WfhRequest | null) => {
    if (!wfh) return null
    const emp = getEmployeeById(wfh.employee_id)
    return (
      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800 space-y-3 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{emp?.name || `Employee #${wfh.employee_id}`}</p>
            <p className="text-xs font-mono text-slate-500">{emp?.emp_code || "—"}</p>
          </div>
          {renderStatusBadge(wfh.status)}
        </div>
        <div className="grid grid-cols-2 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Department</p>
            <p className="font-medium text-slate-700 dark:text-slate-300">{getDepartmentDisplay(wfh.department_id, wfh.employee_id, wfh)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Request Date</p>
            <p className="font-medium text-slate-700 dark:text-slate-300">{formatDateSafe(wfh.request_date)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-500">Reason</p>
            <p className="font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800 mt-1">
              {wfh.reason || "No reason provided"}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-500">Applied At</p>
            <p className="font-medium text-slate-700 dark:text-slate-300">{formatDateTimeSafe(wfh.applied_at)}</p>
          </div>
        </div>
      </div>
    )
  }

  const filteredRequests = statusFilter === "ALL" ? wfhRequests : wfhRequests.filter((w) => w.status === statusFilter)

  const metrics = {
    total: wfhRequests.length,
    pending: wfhRequests.filter(r => r.status === "PENDING").length,
    approved: wfhRequests.filter(r => r.status === "APPROVED").length,
    rejected: wfhRequests.filter(r => r.status === "REJECTED").length,
    cancelled: wfhRequests.filter(r => r.status === "CANCELLED").length,
  }

  return (
    <PageContainer>
      <div className="space-y-6">

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-8 shadow-xl">
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
            <Laptop className="h-72 w-72 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 text-white">
              <h1 className="text-3xl font-bold tracking-tight">WFH Request Control Center</h1>
              <p className="max-w-xl text-slate-300">
                Review, approve and reject employee Work From Home requests with department, employee, date and status filters.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className="bg-white/10 text-white hover:bg-white/20 border-0 font-medium px-3 py-1">
                ACS HRMS WFH Desk
              </Badge>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-slate-600 text-slate-300">
                  Status: {statusFilter}
                </Badge>
                <span className="text-sm font-medium text-slate-300">
                  {wfhRequests.length} Requests
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {renderMetricCard("Total Requests", metrics.total, <ClipboardCheck className="h-5 w-5" />, "slate")}
          {renderMetricCard("Pending", metrics.pending, <Clock className="h-5 w-5" />, "amber")}
          {renderMetricCard("Approved", metrics.approved, <CheckCircle2 className="h-5 w-5" />, "emerald")}
          {renderMetricCard("Rejected", metrics.rejected, <XCircle className="h-5 w-5" />, "red")}
          {renderMetricCard("Cancelled", metrics.cancelled, <CalendarX className="h-5 w-5" />, "orange")}
        </div>

        {/* Premium Filter Card */}
        <Card className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">WFH Request Filters</h3>
            <p className="text-sm text-slate-500">Filter WFH requests by employee, department, request date and approval status.</p>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 uppercase">Department</Label>
                <select
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={filters.department_id != null ? String(filters.department_id) : "all"}
                  onChange={(e) => {
                    const v = e.target.value === "all" ? undefined : parseInt(e.target.value, 10)
                    setFilters((f) => ({ ...f, department_id: v, employee_id: undefined }))
                  }}
                  disabled={loading}
                >
                  <option value="all">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 uppercase">Employee</Label>
                <select
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={filters.employee_id != null ? String(filters.employee_id) : "all"}
                  onChange={(e) => {
                    const v = e.target.value === "all" ? undefined : parseInt(e.target.value, 10)
                    setFilters((f) => ({ ...f, employee_id: v }))
                  }}
                  disabled={loading}
                >
                  <option value="all">All Employees</option>
                  {employees
                    .filter((e) => (filters.department_id ? e.department_id === filters.department_id : true))
                    .map((e) => (
                      <option key={e.id} value={e.id}>{e.name} ({e.emp_code})</option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 uppercase">From Date</Label>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-3 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={filters.from ?? ""}
                    onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                    disabled={loading}
                  />
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 uppercase">To Date</Label>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-3 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={filters.to ?? ""}
                    onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                    disabled={loading}
                  />
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 uppercase">Status</Label>
                <select
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "ALL" | WfhStatus)}
                  disabled={loading}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  disabled={loading}
                  className="h-10 flex-1 rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button
                  onClick={fetchWfh}
                  disabled={loading}
                  className="h-10 flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  {loading ? "" : "Refresh"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Error Card */}
        {apiError && !loading && (
          <Card className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 shadow-sm overflow-hidden">
            <div className="p-6 flex items-start gap-4">
              <div className="h-10 w-10 shrink-0 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-1">Failed to load WFH requests</h3>
                <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchWfh} className="border-red-200 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400">
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Main Content */}
        {loading ? (
          renderLoadingSkeleton()
        ) : !apiError && filteredRequests.length === 0 ? (
          <Card className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm p-12 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <Laptop className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No WFH requests found</h3>
            <p className="text-slate-500 max-w-md mb-6">
              No Work From Home requests match the selected filters.
            </p>
            {(statusFilter !== "ALL" || Object.keys(filters).length > 0) && (
              <Button variant="outline" onClick={resetFilters} className="rounded-xl border-slate-200 text-slate-600">
                Reset Filters
              </Button>
            )}
          </Card>
        ) : !apiError ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Card className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">WFH Request Register</h3>
                    <p className="text-sm text-slate-500">Employee Work From Home requests with request date, reason, approval status and decision history.</p>
                  </div>
                  <Badge variant="secondary" className="rounded-lg px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border-0">
                    {filteredRequests.length} Records
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <AnimatedTable className="min-w-[1100px]">
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                      <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800">
                        <TableHead className="font-semibold text-slate-600 dark:text-slate-300 py-4">Employee</TableHead>
                        <TableHead className="font-semibold text-slate-600 dark:text-slate-300 py-4">Department</TableHead>
                        <TableHead className="font-semibold text-slate-600 dark:text-slate-300 py-4">Request Date</TableHead>
                        <TableHead className="font-semibold text-slate-600 dark:text-slate-300 py-4">Reason</TableHead>
                        <TableHead className="font-semibold text-slate-600 dark:text-slate-300 py-4">Status</TableHead>
                        <TableHead className="font-semibold text-slate-600 dark:text-slate-300 py-4">Decision</TableHead>
                        <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300 py-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((wfh, index) => {
                        const emp = getEmployeeById(wfh.employee_id)
                        return (
                          <AnimatedTableRow
                            key={wfh.id}
                            delay={index * 0.02}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-slate-100 dark:border-slate-800/60"
                          >
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                                  {getInitials(emp?.name)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900 dark:text-slate-100">{emp?.name || `Employee #${wfh.employee_id}`}</span>
                                  {emp?.emp_code && <span className="text-xs font-mono text-slate-500">{emp.emp_code}</span>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <Building2 className="h-4 w-4 text-slate-400" />
                                <span>{getDepartmentDisplay(wfh.department_id, wfh.employee_id, wfh)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 font-medium">
                                <CalendarDays className="h-4 w-4 text-indigo-500" />
                                {formatDateSafe(wfh.request_date)}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="max-w-[320px] text-sm text-slate-600 dark:text-slate-300 line-clamp-2" title={wfh.reason || ""}>
                                {wfh.reason || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              {renderStatusBadge(wfh.status)}
                            </TableCell>
                            <TableCell className="py-4">
                              {wfh.status === "PENDING" ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs text-slate-500 italic">Awaiting decision</span>
                                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                    <Clock className="h-3 w-3" />
                                    {formatDateTimeSafe(wfh.applied_at)}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1 text-xs">
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-500">By:</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{getEmployeeDisplay(wfh.approved_by, wfh.approver)}</span>
                                    {wfh.approved_role && (
                                      <Badge variant="outline" className="px-1 h-4 text-[9px] ml-1 bg-slate-50 text-slate-600">{wfh.approved_role}</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 text-slate-500">
                                    <Clock className="h-3 w-3" />
                                    {formatDateTimeSafe(wfh.approved_at)}
                                  </div>
                                  {wfh.approval_remark && (
                                    <div className="text-[11px] text-slate-600 dark:text-slate-400 italic truncate max-w-[200px]" title={wfh.approval_remark}>
                                      &quot;{wfh.approval_remark}&quot;
                                    </div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right py-4">
                              {wfh.status === "PENDING" && canActOnRequest(wfh) ? (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenApprove(wfh)}
                                    disabled={submittingId === wfh.id}
                                    className="rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 shadow-none border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400"
                                  >
                                    {submittingId === wfh.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleOpenReject(wfh)}
                                    disabled={submittingId === wfh.id}
                                    className="rounded-xl shadow-none"
                                  >
                                    {submittingId === wfh.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">Completed</span>
                              )}
                            </TableCell>
                          </AnimatedTableRow>
                        )
                      })}
                    </TableBody>
                  </AnimatedTable>
                </div>
              </Card>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredRequests.map((wfh) => {
                const emp = getEmployeeById(wfh.employee_id)
                return (
                  <Card key={wfh.id} className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                          {getInitials(emp?.name)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{emp?.name || `Employee #${wfh.employee_id}`}</span>
                          <span className="text-xs text-slate-500">{getDepartmentDisplay(wfh.department_id, wfh.employee_id, wfh)}</span>
                        </div>
                      </div>
                      {renderStatusBadge(wfh.status)}
                    </div>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Request Date</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 text-indigo-500" />
                          {formatDateSafe(wfh.request_date)}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-slate-500 block mb-1">Reason</span>
                        <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                          {wfh.reason || "No reason provided"}
                        </p>
                      </div>
                    </div>
                    {wfh.status === "PENDING" && canActOnRequest(wfh) && (
                      <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button
                          className="flex-1 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 shadow-none border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400"
                          onClick={() => handleOpenApprove(wfh)}
                          disabled={submittingId === wfh.id}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          className="flex-1 rounded-xl shadow-none"
                          variant="destructive"
                          onClick={() => handleOpenReject(wfh)}
                          disabled={submittingId === wfh.id}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </>
        ) : null}
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden bg-white/95 dark:bg-slate-950/95 border-slate-200/60 dark:border-slate-800/60 shadow-2xl">
          <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Approve WFH Request</DialogTitle>
                <DialogDescription className="mt-1 text-slate-500">
                  Review the Work From Home request and add optional approval remarks.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6">
            {renderWfhSummaryCard(selectedWfh)}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Approval Remarks <span className="text-slate-400 font-normal">(Optional)</span></Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter approval remarks..."
                rows={3}
                className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus-visible:ring-emerald-500"
              />
            </div>
          </div>
          <DialogFooter className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Button
              variant="outline"
              onClick={() => setApproveOpen(false)}
              disabled={submittingId !== null}
              className="rounded-xl border-slate-200 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmApprove}
              disabled={submittingId !== null}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {submittingId !== null ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving…
                </>
              ) : (
                "Approve Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden bg-white/95 dark:bg-slate-950/95 border-slate-200/60 dark:border-slate-800/60 shadow-2xl">
          <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Reject WFH Request</DialogTitle>
                <DialogDescription className="mt-1 text-slate-500">
                  Add rejection remarks for employee and audit reference.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6">
            {renderWfhSummaryCard(selectedWfh)}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Rejection Remarks <span className="text-red-500">*</span></Label>
              </div>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter clear reason for rejection..."
                rows={3}
                className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus-visible:ring-red-500"
              />
              <p className="text-xs text-red-500">Remarks are recommended when rejecting a WFH request.</p>
            </div>
          </div>
          <DialogFooter className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={submittingId !== null}
              className="rounded-xl border-slate-200 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReject}
              disabled={submittingId !== null}
              variant="destructive"
              className="rounded-xl shadow-sm"
            >
              {submittingId !== null ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting…
                </>
              ) : (
                "Reject Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
