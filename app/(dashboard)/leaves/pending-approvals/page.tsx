"use client"

import React, { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { canAccessTeamModules } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LeaveRequest,
  Employee,
  ApprovalActionRequest,
  RejectActionRequest,
  AttendanceCorrectionRequest,
} from "@/types/models"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PageContainer } from "@/components/ui/page-container"
import {
  AnimatedTable,
  AnimatedTableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from "@/components/ui/animated-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Check, 
  X, 
  Loader2, 
  RotateCcw, 
  Search,
  ClipboardCheck,
  FileClock,
  CalendarDays,
  CalendarCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  BadgeCheck,
  MessageSquareText,
  ShieldCheck,
  TimerReset,
  Layers
} from "lucide-react"
import { format } from "date-fns"

const BATCH_SIZE = 10

/** --- UI Helpers --- */
function getInitials(name?: string | null) {
  if (!name) return "??"
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getLeaveTypeLabel(type: string) {
  const map: Record<string, string> = {
    CL: "CL", PL: "PL", SL: "SL", RH: "RH", FL: "FL", COMPOFF: "Comp-off", LWP: "LWP"
  }
  return map[type] ?? type
}

function getLeaveTypeBadgeClass(type: string) {
  switch (type) {
    case "CL": return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
    case "PL": return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
    case "SL": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
    case "RH": return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800"
    case "FL": return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
    case "COMPOFF": return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800"
    case "LWP": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
    default: return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800"
  }
}

function getCorrectionTypeLabel(type: string) {
  return type.replace(/_/g, " ")
}

function getCorrectionTypeBadgeClass(type: string) {
  switch (type) {
    case "FORGOT_PUNCH_IN": return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
    case "FORGOT_PUNCH_OUT": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
    case "MISSED_BOTH": return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
    default: return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800"
  }
}

function formatDateSafe(value?: string) {
  if (!value) return "—"
  try {
    return format(new Date(value), "MMM dd, yyyy")
  } catch {
    return value
  }
}

function formatDateTimeSafe(value?: string, formatStr: string = "MMM dd, yyyy hh:mm a") {
  if (!value) return "—"
  try {
    return format(new Date(value), formatStr)
  } catch {
    return value
  }
}

const renderMetricCard = (label: string, value: React.ReactNode, icon: React.ElementType, tone: string) => {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-800/50",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 border-purple-100 dark:border-purple-800/50",
  }
  const colorClass = tones[tone] || tones.slate
  const Icon = icon

  return (
    <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
          <Icon className="h-5 w-5" />
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
  <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 shadow-sm overflow-hidden">
    <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 p-5">
      <Skeleton className="h-6 w-1/4" />
    </CardHeader>
    <CardContent className="p-0">
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </CardContent>
  </Card>
)

export default function PendingApprovalsPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [corrections, setCorrections] = useState<AttendanceCorrectionRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCorrections, setLoadingCorrections] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [approveCorrectionOpen, setApproveCorrectionOpen] = useState(false)
  const [rejectCorrectionOpen, setRejectCorrectionOpen] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null)
  const [selectedCorrection, setSelectedCorrection] = useState<AttendanceCorrectionRequest | null>(null)
  const [remarks, setRemarks] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState("")

  useEffect(() => {
    if (user) {
      fetchEmployees()
      fetchPendingLeaves()
      fetchPendingCorrections()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchEmployees = async () => {
    try {
      if (user?.role === "ADMIN") {
        const data = await api.get<Employee[]>("/api/v1/employees")
        setEmployees(data)
      } else if (canAccessTeamModules(user as any)) {
        const data = await api.get<Employee[]>("/api/v1/employees/my-team-tree")
        setEmployees(data)
      } else {
        const data = await api.get<Employee[]>("/api/v1/employees/my-team")
        setEmployees(data)
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err)
      if (user?.role === "ADMIN" || user?.role === "MD") {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch employees",
        })
      }
      setEmployees([])
    }
  }

  const fetchPendingLeaves = async () => {
    setLoading(true)
    setApiError("")
    try {
      const response = await api.get<{ items: LeaveRequest[]; total: number }>("/api/v1/leaves/pending")
      setLeaves(response.items || [])
    } catch (err) {
      if (err instanceof ApiClientError) {
        const errorMsg = err.data.detail || "Failed to fetch pending leaves"
        setApiError(errorMsg)
        toast({ variant: "destructive", title: "Error", description: errorMsg })
      } else {
        const errorMsg = "An unexpected error occurred"
        setApiError(errorMsg)
        toast({ variant: "destructive", title: "Error", description: errorMsg })
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingCorrections = async () => {
    setLoadingCorrections(true)
    try {
      const response = await api.get<AttendanceCorrectionRequest[]>("/api/v1/attendance-corrections?status_filter=PENDING")
      setCorrections(response || [])
    } catch (err) {
      console.error("[PendingApprovals] Fetch corrections failed", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch pending attendance corrections",
      })
    } finally {
      setLoadingCorrections(false)
    }
  }

  const handleApprove = (leave: LeaveRequest) => {
    setSelectedLeave(leave)
    setRemarks("")
    setApproveOpen(true)
  }

  const handleReject = (leave: LeaveRequest) => {
    setSelectedLeave(leave)
    setRemarks("")
    setRejectOpen(true)
  }

  const handleApproveCorrection = (correction: AttendanceCorrectionRequest) => {
    setSelectedCorrection(correction)
    setRemarks("")
    setApproveCorrectionOpen(true)
  }

  const handleRejectCorrection = (correction: AttendanceCorrectionRequest) => {
    setSelectedCorrection(correction)
    setRemarks("")
    setRejectCorrectionOpen(true)
  }

  const handleSubmitApprove = async () => {
    if (!selectedLeave) return
    setSubmitting(true)
    try {
      const data: ApprovalActionRequest = { remarks: remarks || undefined }
      await api.post<LeaveRequest>(`/api/v1/leaves/${selectedLeave.id}/approve`, data)
      toast({ title: "Success", description: "Leave approved successfully" })
      setApproveOpen(false)
      setSelectedLeave(null)
      setRemarks("")
      await fetchPendingLeaves()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({ variant: "destructive", title: "Error", description: err.data.detail || "Failed to approve leave" })
      } else {
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReject = async () => {
    if (!selectedLeave) return
    if (!remarks.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Remarks are required for rejection" })
      return
    }
    setSubmitting(true)
    try {
      const data: RejectActionRequest = { remarks: remarks }
      await api.post<LeaveRequest>(`/api/v1/leaves/${selectedLeave.id}/reject`, data)
      toast({ title: "Success", description: "Leave rejected successfully" })
      setRejectOpen(false)
      setSelectedLeave(null)
      setRemarks("")
      await fetchPendingLeaves()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({ variant: "destructive", title: "Error", description: err.data.detail || "Failed to reject leave" })
      } else {
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitApproveCorrection = async () => {
    if (!selectedCorrection) return
    setSubmitting(true)
    try {
      await api.post<AttendanceCorrectionRequest>(
        `/api/v1/attendance-corrections/${selectedCorrection.id}/approve`,
        { admin_remarks: remarks || undefined }
      )
      toast({ title: "Success", description: "Attendance correction approved successfully" })
      setApproveCorrectionOpen(false)
      setSelectedCorrection(null)
      setRemarks("")
      await fetchPendingCorrections()
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to approve attendance correction" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitRejectCorrection = async () => {
    if (!selectedCorrection) return
    if (!remarks.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Remarks are required for rejection" })
      return
    }
    setSubmitting(true)
    try {
      await api.post<AttendanceCorrectionRequest>(
        `/api/v1/attendance-corrections/${selectedCorrection.id}/reject`,
        { admin_remarks: remarks }
      )
      toast({ title: "Success", description: "Attendance correction rejected successfully" })
      setRejectCorrectionOpen(false)
      setSelectedCorrection(null)
      setRemarks("")
      await fetchPendingCorrections()
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to reject attendance correction" })
    } finally {
      setSubmitting(false)
    }
  }

  const getEmployeeDisplay = (employeeId: number, leaveOrCorrection?: LeaveRequest | AttendanceCorrectionRequest) => {
    if (leaveOrCorrection) {
      if ((leaveOrCorrection as any).employee_name) {
        return {
          name: (leaveOrCorrection as any).employee_name,
          emp_code: (leaveOrCorrection as any).employee_emp_code || ""
        }
      }
      if ((leaveOrCorrection as any).employee) {
        const empData = (leaveOrCorrection as any).employee
        return {
          name: empData.name,
          emp_code: empData.emp_code || ""
        }
      }
    }
    
    const emp = employees.find((e) => e.id === employeeId)
    if (emp) {
      return {
        name: emp.name,
        emp_code: emp.emp_code
      }
    }
    
    return {
      name: `Employee #${employeeId}`,
      emp_code: "-"
    }
  }

  const getEmployeeName = (employeeId: number, item?: LeaveRequest | AttendanceCorrectionRequest) => {
    const disp = getEmployeeDisplay(employeeId, item)
    return disp.emp_code ? `${disp.name} (${disp.emp_code})` : disp.name
  }

  const renderLeaveSummaryCard = (leave: LeaveRequest | null) => {
    if (!leave) return null;
    const emp = getEmployeeDisplay(leave.employee_id, leave);
    const isHalfDay = leave.duration === "HALF_DAY";
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/40 p-4 space-y-3 mb-4 shadow-sm">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm shadow-inner dark:bg-indigo-900/50 dark:text-indigo-400">
              {getInitials(emp.name)}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100">{emp.name}</p>
              <p className="text-xs font-mono text-slate-500">{emp.emp_code}</p>
            </div>
          </div>
          <Badge className={`shadow-none ${getLeaveTypeBadgeClass(leave.leave_type)}`}>
            {getLeaveTypeLabel(leave.leave_type)}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-slate-200/60 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-500 font-medium">Period</p>
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {formatDateSafe(leave.from_date)} - {formatDateSafe(leave.to_date)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Duration & Days</p>
            <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Badge variant="outline" className={`font-semibold px-2 py-0 h-5 text-[10px] shadow-none ${isHalfDay ? "text-amber-600 border-amber-200 bg-amber-50" : "text-indigo-600 border-indigo-200 bg-indigo-50"}`}>
                {isHalfDay ? "Half Day" : "Full Day"}
              </Badge>
              <span className="text-indigo-600 dark:text-indigo-400">{leave.computed_days} Days</span>
            </p>
          </div>
          {isHalfDay && (
            <div className="col-span-2">
              <p className="text-xs text-slate-500 font-medium">Session</p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {leave.half_day_session === "SECOND_HALF" ? "Second Half" : "First Half"}
              </p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-xs text-slate-500 font-medium">Reason</p>
            <p className="font-medium text-slate-700 dark:text-slate-300 italic max-h-16 overflow-y-auto scrollbar-thin">
              {leave.reason || "—"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderCorrectionSummaryCard = (correction: AttendanceCorrectionRequest | null) => {
    if (!correction) return null;
    const emp = getEmployeeDisplay(correction.employee_id, correction);
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/40 p-4 space-y-3 mb-4 shadow-sm">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm shadow-inner dark:bg-indigo-900/50 dark:text-indigo-400">
              {getInitials(emp.name)}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100">{emp.name}</p>
              <p className="text-xs font-mono text-slate-500">{emp.emp_code}</p>
            </div>
          </div>
          <Badge className={`shadow-none ${getCorrectionTypeBadgeClass(correction.request_type)}`}>
            {getCorrectionTypeLabel(correction.request_type)}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-slate-200/60 dark:border-slate-800">
          <div className="col-span-2">
            <p className="text-xs text-slate-500 font-medium">Work Date</p>
            <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              {formatDateSafe(correction.date)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Requested In</p>
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {correction.requested_punch_in ? formatDateTimeSafe(correction.requested_punch_in, "hh:mm a") : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Requested Out</p>
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {correction.requested_punch_out ? formatDateTimeSafe(correction.requested_punch_out, "hh:mm a") : "—"}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-500 font-medium">Reason</p>
            <p className="font-medium text-slate-700 dark:text-slate-300 italic max-h-16 overflow-y-auto scrollbar-thin">
              {correction.reason || "—"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const filteredLeaves = leaves.filter((leave) => {
    if (!searchTerm) return true
    const employeeName = getEmployeeName(leave.employee_id, leave).toLowerCase()
    const searchLower = searchTerm.toLowerCase()
    return (
      employeeName.includes(searchLower) ||
      leave.leave_type.toLowerCase().includes(searchLower) ||
      leave.reason?.toLowerCase().includes(searchLower) ||
      leave.id.toString().includes(searchTerm)
    )
  })

  const filteredCorrections = corrections.filter((it) => {
    if (!searchTerm) return true
    const employeeName = (it.employee_name || getEmployeeName(it.employee_id)).toLowerCase()
    const searchLower = searchTerm.toLowerCase()
    return (
      employeeName.includes(searchLower) ||
      it.request_type.toLowerCase().includes(searchLower) ||
      it.reason.toLowerCase().includes(searchLower) ||
      it.id.toString().includes(searchTerm)
    )
  })

  if (!user || !canAccessTeamModules(user as any)) {
    return (
      <PageContainer title="Pending Approvals" description="Review and approve/reject leave requests">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="p-8 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-sm max-w-md">
            <ShieldCheck className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-red-900 dark:text-red-100 mb-2">Access Denied</h3>
            <p className="text-red-700 dark:text-red-400 font-medium">
              You need manager-level access to view the pending approval queue.
            </p>
          </div>
        </div>
      </PageContainer>
    )
  }

  const totalPending = leaves.length + corrections.length;
  const searchResultsCount = filteredLeaves.length + filteredCorrections.length;

  return (
    <PageContainer>
      <div className="space-y-6">
        
        {/* 1. Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-8 shadow-xl">
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
            <ClipboardCheck className="h-72 w-72 text-white" />
          </div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 text-white">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm shadow-sm">
                  ACS HRMS Approval Desk
                </Badge>
                <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-indigo-200 border-none backdrop-blur-sm font-semibold shadow-sm">
                  Pending Queue
                </Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Pending Approval Control Center</h1>
              <p className="max-w-xl text-slate-300">
                Review pending leave requests and attendance correction requests from one approval queue.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 dark:bg-slate-900/50 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl shadow-inner w-max">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">Total Pending Items</p>
                <p className="text-xl font-bold text-white">{totalPending}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {renderMetricCard("Total Pending", totalPending, ClipboardCheck, "indigo")}
          {renderMetricCard("Pending Leaves", leaves.length, CalendarDays, "amber")}
          {renderMetricCard("Pending Corrections", corrections.length, FileClock, "purple")}
          {renderMetricCard("Employees Loaded", employees.length, Users, "slate")}
          {renderMetricCard("Search Results", searchResultsCount, Search, "emerald")}
        </div>

        {/* 3. Premium Search Card */}
        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 p-5">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Search className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Approval Queue Filters
            </CardTitle>
            <CardDescription>Search pending approvals by employee name, employee code, request type or reason.</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search employee, code, reason or request type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setSearchTerm("")}
                className="rounded-xl h-10 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm shrink-0"
              >
                <RotateCcw className="h-4 w-4 mr-2 text-slate-500" />
                Reset Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Error Banner */}
        {apiError && !loading && (
          <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 p-6 shadow-sm">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-red-800 dark:text-red-300">Failed to load pending approvals</h4>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1 font-medium">{apiError}</p>
              <Button variant="outline" size="sm" onClick={() => { fetchPendingLeaves(); fetchPendingCorrections(); }} className="mt-4 rounded-lg border-red-200 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/50">
                <RotateCcw className="h-3 w-3 mr-2" /> Retry
              </Button>
            </div>
          </div>
        )}

        {/* 4. Premium Tabs & Tables */}
        <Tabs defaultValue="leaves" className="w-full">
          <div className="bg-slate-100/70 dark:bg-slate-900/70 p-1.5 rounded-2xl shadow-inner overflow-x-auto mb-6 inline-block w-full max-w-2xl">
            <TabsList className="w-full bg-transparent flex justify-start gap-1 p-0 h-auto grid grid-cols-2 min-w-max">
              <TabsTrigger 
                value="leaves" 
                className="rounded-xl px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:dark:bg-slate-950 data-[state=active]:shadow-sm font-medium flex justify-between items-center group"
              >
                <div className="flex items-center">
                  <CalendarDays className="h-4 w-4 mr-2 text-slate-400 group-data-[state=active]:text-indigo-600 dark:group-data-[state=active]:text-indigo-400" /> 
                  Leaves
                </div>
                <Badge className="ml-2 bg-slate-200 text-slate-700 hover:bg-slate-200 shadow-none dark:bg-slate-800 dark:text-slate-300 group-data-[state=active]:bg-indigo-100 group-data-[state=active]:text-indigo-700 dark:group-data-[state=active]:bg-indigo-900/50 dark:group-data-[state=active]:text-indigo-400">{filteredLeaves.length}</Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="attendance" 
                className="rounded-xl px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:dark:bg-slate-950 data-[state=active]:shadow-sm font-medium flex justify-between items-center group"
              >
                <div className="flex items-center">
                  <FileClock className="h-4 w-4 mr-2 text-slate-400 group-data-[state=active]:text-indigo-600 dark:group-data-[state=active]:text-indigo-400" /> 
                  Corrections
                </div>
                <Badge className="ml-2 bg-slate-200 text-slate-700 hover:bg-slate-200 shadow-none dark:bg-slate-800 dark:text-slate-300 group-data-[state=active]:bg-indigo-100 group-data-[state=active]:text-indigo-700 dark:group-data-[state=active]:bg-indigo-900/50 dark:group-data-[state=active]:text-indigo-400">{filteredCorrections.length}</Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="leaves">
            {loading ? renderLoadingSkeleton() : filteredLeaves.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 p-12 flex flex-col items-center text-center shadow-sm">
                <div className="h-20 w-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <CalendarCheck className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">No pending leave approvals</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6 font-medium">
                  {searchTerm ? "No records match your search. Try another keyword or reset the search." : "There are no leave requests waiting for your approval."}
                </p>
                {searchTerm && (
                  <Button variant="outline" className="rounded-xl shadow-sm" onClick={() => setSearchTerm("")}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Search
                  </Button>
                )}
              </div>
            ) : (
              <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 p-5 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Pending Leave Approvals</CardTitle>
                    <CardDescription className="text-sm mt-1">Review employee leave applications awaiting approval or rejection.</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-white dark:bg-slate-950 font-bold px-3 py-1 shadow-sm rounded-lg">
                    {filteredLeaves.length} Records
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto hidden xl:block">
                    <AnimatedTable className="min-w-[1050px]">
                      <TableHeader>
                        <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                          <TableHead className="pl-6">Employee</TableHead>
                          <TableHead>Leave Type</TableHead>
                          <TableHead>Leave Period</TableHead>
                          <TableHead>Duration & Days</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Requested At</TableHead>
                          <TableHead className="text-right pr-6">Actions</TableHead>
                        </tr>
                      </TableHeader>
                      <TableBody>
                        {filteredLeaves.map((leave, index) => {
                          const disp = getEmployeeDisplay(leave.employee_id, leave)
                          const isHalfDay = leave.duration === "HALF_DAY"
                          return (
                            <AnimatedTableRow key={leave.id} delay={index * 0.03} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60">
                              <TableCell className="pl-6">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm shadow-inner dark:bg-indigo-900/50 dark:text-indigo-400">
                                    {getInitials(disp.name)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 dark:text-slate-100">{disp.name}</p>
                                    <p className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded w-max mt-0.5">{disp.emp_code}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`shadow-none text-xs px-2.5 py-0.5 ${getLeaveTypeBadgeClass(leave.leave_type)}`}>
                                  {getLeaveTypeLabel(leave.leave_type)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-start gap-2">
                                  <CalendarDays className="h-4 w-4 text-slate-400 mt-0.5" />
                                  <div className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-tight">
                                    <div>{formatDateSafe(leave.from_date)}</div>
                                    <div className="text-slate-400 text-xs mt-0.5">to {formatDateSafe(leave.to_date)}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`font-semibold px-2 py-0 h-5 text-[10px] shadow-none ${isHalfDay ? "text-amber-600 border-amber-200 bg-amber-50" : "text-indigo-600 border-indigo-200 bg-indigo-50"}`}>
                                      {isHalfDay ? "Half Day" : "Full Day"}
                                    </Badge>
                                    <Badge className="bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 font-bold shadow-sm text-[11px] px-1.5 py-0 h-5">
                                      {leave.computed_days} d
                                    </Badge>
                                  </div>
                                  {isHalfDay && (
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      {leave.half_day_session === "SECOND_HALF" ? "Second Half" : "First Half"}
                                    </span>
                                  )}
                                  {leave.lwp_days > 0 && (
                                    <Badge variant="destructive" className="w-max text-[9px] px-1 py-0 h-4 shadow-none">
                                      LWP: {leave.lwp_days}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[200px] text-sm text-slate-600 dark:text-slate-400 line-clamp-2 italic" title={leave.reason || ""}>
                                  {leave.reason || "—"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                                  <Clock className="h-4 w-4 text-slate-400" />
                                  {formatDateTimeSafe(leave.applied_at)}
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApprove(leave)}
                                    className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 h-9 px-3 font-semibold shadow-sm"
                                    title="Approve"
                                  >
                                    <Check className="h-4 w-4 mr-1" /> Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReject(leave)}
                                    className="rounded-xl border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 h-9 px-3 font-semibold shadow-sm"
                                    title="Reject"
                                  >
                                    <X className="h-4 w-4 mr-1" /> Reject
                                  </Button>
                                </div>
                              </TableCell>
                            </AnimatedTableRow>
                          )
                        })}
                      </TableBody>
                    </AnimatedTable>
                  </div>

                  {/* Mobile Cards for Leaves */}
                  <div className="xl:hidden p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredLeaves.map((leave) => {
                      const disp = getEmployeeDisplay(leave.employee_id, leave)
                      const isHalfDay = leave.duration === "HALF_DAY"
                      return (
                        <div key={leave.id} className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/20 p-5 shadow-sm space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm shadow-inner dark:bg-indigo-900/50 dark:text-indigo-400">
                                {getInitials(disp.name)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight">{disp.name}</p>
                                <p className="text-xs font-mono text-slate-500 mt-0.5">{disp.emp_code}</p>
                              </div>
                            </div>
                            <Badge className={`shadow-none text-xs px-2.5 py-0.5 ${getLeaveTypeBadgeClass(leave.leave_type)}`}>
                              {getLeaveTypeLabel(leave.leave_type)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-slate-100 dark:border-slate-800/60">
                            <div>
                              <p className="text-xs text-slate-500 font-medium">Period</p>
                              <p className="font-semibold text-slate-700 dark:text-slate-300">
                                {formatDateSafe(leave.from_date)}<br/>
                                <span className="text-slate-400 text-xs font-normal">to</span> {formatDateSafe(leave.to_date)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium">Duration & Days</p>
                              <div className="flex flex-col items-start gap-1 mt-0.5">
                                <Badge variant="outline" className={`font-semibold px-2 py-0 h-5 text-[10px] shadow-none ${isHalfDay ? "text-amber-600 border-amber-200 bg-amber-50" : "text-indigo-600 border-indigo-200 bg-indigo-50"}`}>
                                  {isHalfDay ? "Half Day" : "Full Day"}
                                </Badge>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{leave.computed_days} Days</span>
                              </div>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-slate-500 font-medium">Reason</p>
                              <p className="font-medium text-slate-700 dark:text-slate-300 italic">{leave.reason || "—"}</p>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex gap-2">
                            <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={() => handleApprove(leave)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                            </Button>
                            <Button variant="destructive" className="flex-1 rounded-xl shadow-sm" onClick={() => handleReject(leave)}>
                              <XCircle className="mr-2 h-4 w-4" /> Reject
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="attendance">
            {loadingCorrections ? renderLoadingSkeleton() : filteredCorrections.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 p-12 flex flex-col items-center text-center shadow-sm">
                <div className="h-20 w-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <FileClock className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">No pending attendance corrections</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6 font-medium">
                  {searchTerm ? "No records match your search. Try another keyword or reset the search." : "There are no attendance correction requests waiting for your approval."}
                </p>
                {searchTerm && (
                  <Button variant="outline" className="rounded-xl shadow-sm" onClick={() => setSearchTerm("")}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Search
                  </Button>
                )}
              </div>
            ) : (
              <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 p-5 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Pending Attendance Corrections</CardTitle>
                    <CardDescription className="text-sm mt-1">Review employee punch correction requests awaiting admin or manager approval.</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-white dark:bg-slate-950 font-bold px-3 py-1 shadow-sm rounded-lg">
                    {filteredCorrections.length} Records
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto hidden xl:block">
                    <AnimatedTable className="min-w-[1050px]">
                      <TableHeader>
                        <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                          <TableHead className="pl-6">Employee</TableHead>
                          <TableHead>Work Date</TableHead>
                          <TableHead>Request Type</TableHead>
                          <TableHead>Requested Punch In</TableHead>
                          <TableHead>Requested Punch Out</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Requested At</TableHead>
                          <TableHead className="text-right pr-6">Actions</TableHead>
                        </tr>
                      </TableHeader>
                      <TableBody>
                        {filteredCorrections.map((it, index) => {
                          const disp = getEmployeeDisplay(it.employee_id, it)
                          return (
                            <AnimatedTableRow key={it.id} delay={index * 0.03} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60">
                              <TableCell className="pl-6">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm shadow-inner dark:bg-indigo-900/50 dark:text-indigo-400">
                                    {getInitials(disp.name)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 dark:text-slate-100">{disp.name}</p>
                                    <p className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded w-max mt-0.5">{disp.emp_code}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
                                  <CalendarDays className="h-4 w-4 text-slate-400" />
                                  {formatDateSafe(it.date)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`shadow-none text-[11px] px-2.5 py-0.5 ${getCorrectionTypeBadgeClass(it.request_type)}`}>
                                  {getCorrectionTypeLabel(it.request_type)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm font-medium">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  {it.requested_punch_in ? formatDateTimeSafe(it.requested_punch_in, "hh:mm a") : "—"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-sm font-medium">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  {it.requested_punch_out ? formatDateTimeSafe(it.requested_punch_out, "hh:mm a") : "—"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[200px] text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 line-clamp-2" title={it.reason}>
                                  {it.reason || "—"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                                  {it.created_at ? formatDateTimeSafe(it.created_at) : "—"}
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApproveCorrection(it)}
                                    className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 h-9 px-3 font-semibold shadow-sm"
                                    title="Approve"
                                  >
                                    <Check className="h-4 w-4 mr-1" /> Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRejectCorrection(it)}
                                    className="rounded-xl border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 h-9 px-3 font-semibold shadow-sm"
                                    title="Reject"
                                  >
                                    <X className="h-4 w-4 mr-1" /> Reject
                                  </Button>
                                </div>
                              </TableCell>
                            </AnimatedTableRow>
                          )
                        })}
                      </TableBody>
                    </AnimatedTable>
                  </div>

                  {/* Mobile Cards for Corrections */}
                  <div className="xl:hidden p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCorrections.map((it) => {
                      const disp = getEmployeeDisplay(it.employee_id, it)
                      return (
                        <div key={it.id} className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/20 p-5 shadow-sm space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm shadow-inner dark:bg-indigo-900/50 dark:text-indigo-400">
                                {getInitials(disp.name)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight">{disp.name}</p>
                                <p className="text-xs font-mono text-slate-500 mt-0.5">{disp.emp_code}</p>
                              </div>
                            </div>
                            <Badge className={`shadow-none text-[10px] px-2 py-0.5 ${getCorrectionTypeBadgeClass(it.request_type)}`}>
                              {getCorrectionTypeLabel(it.request_type)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-slate-100 dark:border-slate-800/60">
                            <div className="col-span-2">
                              <p className="text-xs text-slate-500 font-medium">Work Date</p>
                              <p className="font-semibold text-slate-700 dark:text-slate-300">{formatDateSafe(it.date)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium">Requested In</p>
                              <p className="font-semibold text-slate-700 dark:text-slate-300">{it.requested_punch_in ? formatDateTimeSafe(it.requested_punch_in, "hh:mm a") : "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium">Requested Out</p>
                              <p className="font-semibold text-slate-700 dark:text-slate-300">{it.requested_punch_out ? formatDateTimeSafe(it.requested_punch_out, "hh:mm a") : "—"}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-slate-500 font-medium">Reason</p>
                              <p className="font-medium text-slate-700 dark:text-slate-300 italic p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">{it.reason || "—"}</p>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex gap-2">
                            <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={() => handleApproveCorrection(it)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                            </Button>
                            <Button variant="destructive" className="flex-1 rounded-xl shadow-sm" onClick={() => handleRejectCorrection(it)}>
                              <XCircle className="mr-2 h-4 w-4" /> Reject
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve Leave Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-0 bg-white/95 dark:bg-slate-950/95 overflow-hidden border-emerald-200 dark:border-emerald-900/50 shadow-xl">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-6 flex items-start gap-4 border-b border-emerald-100 dark:border-emerald-900/50">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-emerald-900 dark:text-emerald-100">Approve Leave Request</DialogTitle>
              <DialogDescription className="text-emerald-700 dark:text-emerald-300/80 mt-1">
                Review the leave request and add optional approval remarks.
              </DialogDescription>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {renderLeaveSummaryCard(selectedLeave)}
            <div className="space-y-2">
              <Label htmlFor="approve-remarks" className="font-semibold text-slate-700 dark:text-slate-300">Approval Remarks <span className="text-slate-400 font-normal">(Optional)</span></Label>
              <Textarea
                id="approve-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter approval remarks..."
                disabled={submitting}
                rows={3}
                className="rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
              />
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/50 sm:justify-end gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setApproveOpen(false); setRemarks(""); }} disabled={submitting} className="rounded-xl bg-white dark:bg-slate-950">
              Cancel
            </Button>
            <Button onClick={handleSubmitApprove} disabled={submitting} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Approving...</> : <><CheckCircle2 className="h-4 w-4 mr-2" /> Approve Leave</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Leave Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-0 bg-white/95 dark:bg-slate-950/95 overflow-hidden border-red-200 dark:border-red-900/50 shadow-xl">
          <div className="bg-red-50 dark:bg-red-950/30 p-6 flex items-start gap-4 border-b border-red-100 dark:border-red-900/50">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-red-900 dark:text-red-100">Reject Leave Request</DialogTitle>
              <DialogDescription className="text-red-700 dark:text-red-300/80 mt-1">
                Add rejection remarks for employee and audit reference.
              </DialogDescription>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {renderLeaveSummaryCard(selectedLeave)}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <Label htmlFor="reject-remarks" className="font-semibold text-slate-700 dark:text-slate-300">Remarks <span className="text-red-500">*</span></Label>
                <span className="text-[10px] text-amber-600 font-medium">Remarks are required for rejection.</span>
              </div>
              <Textarea
                id="reject-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter rejection remarks..."
                required
                disabled={submitting}
                rows={3}
                className="rounded-xl bg-white dark:bg-slate-900 border-red-200 dark:border-red-900/50 shadow-sm focus-visible:ring-red-500"
              />
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/50 sm:justify-end gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setRejectOpen(false); setRemarks(""); }} disabled={submitting} className="rounded-xl bg-white dark:bg-slate-950">
              Cancel
            </Button>
            <Button onClick={handleSubmitReject} disabled={submitting || !remarks.trim()} variant="destructive" className="rounded-xl shadow-md">
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rejecting...</> : <><XCircle className="h-4 w-4 mr-2" /> Reject Leave</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Correction Dialog */}
      <Dialog open={approveCorrectionOpen} onOpenChange={setApproveCorrectionOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-0 bg-white/95 dark:bg-slate-950/95 overflow-hidden border-emerald-200 dark:border-emerald-900/50 shadow-xl">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-6 flex items-start gap-4 border-b border-emerald-100 dark:border-emerald-900/50">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-emerald-900 dark:text-emerald-100">Approve Attendance Correction</DialogTitle>
              <DialogDescription className="text-emerald-700 dark:text-emerald-300/80 mt-1">
                Confirm the requested punch correction before approval.
              </DialogDescription>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {renderCorrectionSummaryCard(selectedCorrection)}
            <div className="space-y-2">
              <Label htmlFor="approve-correction-remarks" className="font-semibold text-slate-700 dark:text-slate-300">Approval Remarks <span className="text-slate-400 font-normal">(Optional)</span></Label>
              <Textarea
                id="approve-correction-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter approval remarks..."
                disabled={submitting}
                rows={3}
                className="rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
              />
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/50 sm:justify-end gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setApproveCorrectionOpen(false); setRemarks(""); }} disabled={submitting} className="rounded-xl bg-white dark:bg-slate-950">
              Cancel
            </Button>
            <Button onClick={handleSubmitApproveCorrection} disabled={submitting} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Approving...</> : <><CheckCircle2 className="h-4 w-4 mr-2" /> Approve Correction</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Correction Dialog */}
      <Dialog open={rejectCorrectionOpen} onOpenChange={setRejectCorrectionOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-0 bg-white/95 dark:bg-slate-950/95 overflow-hidden border-red-200 dark:border-red-900/50 shadow-xl">
          <div className="bg-red-50 dark:bg-red-950/30 p-6 flex items-start gap-4 border-b border-red-100 dark:border-red-900/50">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-red-900 dark:text-red-100">Reject Attendance Correction</DialogTitle>
              <DialogDescription className="text-red-700 dark:text-red-300/80 mt-1">
                Add rejection remarks for correction audit trail.
              </DialogDescription>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {renderCorrectionSummaryCard(selectedCorrection)}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <Label htmlFor="reject-correction-remarks" className="font-semibold text-slate-700 dark:text-slate-300">Remarks <span className="text-red-500">*</span></Label>
                <span className="text-[10px] text-amber-600 font-medium">Remarks are required for rejection.</span>
              </div>
              <Textarea
                id="reject-correction-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter rejection remarks..."
                required
                disabled={submitting}
                rows={3}
                className="rounded-xl bg-white dark:bg-slate-900 border-red-200 dark:border-red-900/50 shadow-sm focus-visible:ring-red-500"
              />
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/50 sm:justify-end gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setRejectCorrectionOpen(false); setRemarks(""); }} disabled={submitting} className="rounded-xl bg-white dark:bg-slate-950">
              Cancel
            </Button>
            <Button onClick={handleSubmitRejectCorrection} disabled={submitting || !remarks.trim()} variant="destructive" className="rounded-xl shadow-md">
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rejecting...</> : <><XCircle className="h-4 w-4 mr-2" /> Reject Correction</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
