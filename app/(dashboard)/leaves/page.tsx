"use client"

import React, { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { DebugPanel } from "@/components/debug/DebugPanel"
import { canAccessTeamModules } from "@/lib/utils"
import {
  LeaveRequest,
  LeaveType,
  LeaveStatus,
  Employee,
  ApprovalActionRequest,
  RejectActionRequest,
  CancelActionRequest,
} from "@/types/models"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PageContainer } from "@/components/ui/page-container"
import { EmptyState } from "@/components/ui/empty-state"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  AlertCircle,
  CalendarDays,
  FileClock,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CalendarX,
  Building2,
  ClipboardCheck,
  Layers,
  Ban,
  UserCheck,
  ShieldCheck,
  MessageSquareText,
  RefreshCw
} from "lucide-react"
import { format } from "date-fns"

/** Display labels for leave types */
const LEAVE_TYPE_LABEL: Record<string, string> = {
  CL: "CL",
  PL: "PL",
  SL: "SL",
  RH: "RH",
  FL: "FL",
  COMPOFF: "Comp-off",
  LWP: "LWP",
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: { detail?: string | string[] } }).data
    const d = data?.detail
    if (typeof d === "string") return d
    if (Array.isArray(d)) return d.join(". ") || fallback
  }
  return fallback
}

type LeavesApiResponse = LeaveRequest[] | { items?: LeaveRequest[]; total?: number }

// --- UI Helpers ---

function getInitials(name: string) {
  if (!name) return "??"
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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

function renderStatusBadge(status: LeaveStatus, overridePolicy?: boolean) {
  let badgeCls = ""
  let Icon = Clock
  let label = status.replace("_", " ")

  switch (status) {
    case "PENDING":
      badgeCls = "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 animate-pulse"
      Icon = Clock
      break
    case "APPROVED":
      badgeCls = "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
      Icon = CheckCircle2
      break
    case "REJECTED":
      badgeCls = "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
      Icon = XCircle
      break
    case "CANCELLED":
    case "CANCELLED_BY_COMPANY":
    case "REVOKED":
      badgeCls = "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800"
      Icon = status === "REVOKED" ? RotateCcw : Ban
      if (status === "CANCELLED_BY_COMPANY") label = "CANCELLED (CO)"
      break
    default:
      badgeCls = "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800"
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className={`flex items-center gap-1 font-semibold ${badgeCls}`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
      {overridePolicy && (
        <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800 px-1 shadow-sm font-bold">
          HR Override
        </Badge>
      )}
    </div>
  )
}

function formatLeaveDate(date: string) {
  try {
    return format(new Date(date), "MMM dd, yyyy")
  } catch {
    return date
  }
}

const renderMetricCard = (label: string, value: React.ReactNode, icon: React.ElementType, tone: string) => {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-800/50",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-800/50",
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50",
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

export default function LeavesPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("pending")
  const [filters, setFilters] = useState({
    employee_id: undefined as number | undefined,
    leave_type: undefined as LeaveType | undefined,
    from_date: "",
    to_date: "",
  })
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null)
  const [remarks, setRemarks] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string>("")

  useEffect(() => {
    if (user) {
      api.get<{ id: number; name: string }[]>("/api/v1/departments")
        .then((r) => {
          setDepartments(Array.isArray(r) ? r : [])
        })
        .catch(() => {
          setDepartments([])
        })

      fetchEmployees()
      fetchLeaves()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (user) {
      fetchLeaves()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters])

  const fetchEmployees = async () => {
    try {
      if (user?.role === "HR" || user?.role === "ADMIN" || user?.role === "MD") {
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
      if (user?.role === "HR") {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch employees",
        })
      }
      setEmployees([])
    }
  }

  const fetchLeaves = async () => {
    setLoading(true)
    setApiError("")
    try {
      const params = new URLSearchParams()
      
      if (filters.from_date) params.append("from", filters.from_date)
      if (filters.to_date) params.append("to", filters.to_date)
      if (filters.employee_id) params.append("employee_id", filters.employee_id.toString())

      const queryString = params.toString()
      const endpoint = activeTab === "pending"
        ? `/api/v1/leaves/pending${queryString ? `?${queryString}` : ""}`
        : activeTab === "all"
        ? `/api/v1/leaves/list${queryString ? `?${queryString}` : ""}`
        : `/api/v1/leaves/list${queryString ? `?${queryString}` : ""}`

      const response = await api.get<LeavesApiResponse>(endpoint)
      let items = Array.isArray(response) ? response : response.items || []

      // Client-side filtering
      if (activeTab !== "pending" && activeTab !== "all") {
        items = items.filter((item) => {
          if (activeTab === "lwp") {
            return item.lwp_days > 0
          }
          if (activeTab === "cancelled") {
            return item.status === "CANCELLED" || item.status === "CANCELLED_BY_COMPANY"
          }
          return item.status === activeTab.toUpperCase()
        })
      }
      if (filters.leave_type) {
        items = items.filter((item) => item.leave_type === filters.leave_type)
      }

      setLeaves(items)
    } catch (err) {
      if (err instanceof ApiClientError) {
        const errorMsg = err.data.detail || "Failed to fetch leaves"
        setApiError(errorMsg)
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMsg,
        })
      } else {
        const errorMsg = "An unexpected error occurred"
        setApiError(errorMsg)
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMsg,
        })
      }
    } finally {
      setLoading(false)
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

  const handleCancel = (leave: LeaveRequest) => {
    setSelectedLeave(leave)
    setRemarks("")
    setCancelOpen(true)
  }

  const handleSubmitApprove = async () => {
    if (!selectedLeave) return

    setSubmitting(true)
    try {
      const data: ApprovalActionRequest = {
        remarks: remarks || undefined,
      }
      await api.post<LeaveRequest>(
        `/api/v1/leaves/${selectedLeave.id}/approve`,
        data
      )
      toast({
        title: "Success",
        description: "Leave approved successfully",
      })
      setApproveOpen(false)
      setSelectedLeave(null)
      setRemarks("")
      await fetchLeaves()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("leave-action-done"))
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to approve leave",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred",
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReject = async () => {
    if (!selectedLeave) return
    if (!remarks.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Remarks are required for rejection",
      })
      return
    }

    setSubmitting(true)
    try {
      const data: RejectActionRequest = {
        remarks: remarks,
      }
      await api.post<LeaveRequest>(
        `/api/v1/leaves/${selectedLeave.id}/reject`,
        data
      )
      toast({
        title: "Success",
        description: "Leave rejected successfully",
      })
      setRejectOpen(false)
      setSelectedLeave(null)
      setRemarks("")
      await fetchLeaves()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("leave-action-done"))
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: getApiErrorMessage(err, "Failed to reject leave"),
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred",
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitCancel = async () => {
    if (!selectedLeave) return
    if (!remarks.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Remark is required to cancel",
      })
      return
    }

    setSubmitting(true)
    try {
      const data: CancelActionRequest = { remark: remarks.trim() }
      await api.post<LeaveRequest>(`/api/v1/leaves/${selectedLeave.id}/cancel`, data)
      toast({
        title: "Success",
        description: "Leave cancelled successfully",
      })
      setCancelOpen(false)
      setSelectedLeave(null)
      setRemarks("")
      await fetchLeaves()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("leave-action-done"))
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: getApiErrorMessage(err, "Failed to cancel leave"),
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred",
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const resetFilters = () => {
    setFilters({
      employee_id: undefined,
      leave_type: undefined,
      from_date: "",
      to_date: "",
    })
  }

  const getDepartmentName = (departmentId?: number | null): string => {
    if (departmentId == null) return "-"
    const dept = departments.find((d) => d.id === departmentId)
    return dept?.name ?? departmentId.toString()
  }

  const getEmployeeDetails = (employeeId: number) => {
    const emp = employees.find((e) => e.id === employeeId)
    if (emp) {
      return {
        name: emp.name,
        emp_code: emp.emp_code,
        department:
          emp.department?.name ||
          getDepartmentName(emp.department_id) ||
          "-"
      }
    }
    const leave = leaves.find((l) => l.employee_id === employeeId)
    if (leave && leave.employee) {
      const empData = leave.employee
      return {
        name: empData.name,
        emp_code: empData.emp_code,
        department:
          empData.department?.name ||
          getDepartmentName(empData.department_id) ||
          "-"
      }
    }
    return {
      name: `Employee #${employeeId}`,
      emp_code: "-",
      department: "-"
    }
  }

  const getApproverName = (approverId: number | null | undefined, leave: LeaveRequest | null) => {
    if (!approverId || !leave) return "-"
    if ((leave as any).approver_name) {
      return `${(leave as any).approver_name} (${(leave as any).approver_emp_code || ""})`
    }
    if ((leave as any).approver) {
      const approver = (leave as any).approver
      return `${approver.name} (${approver.emp_code || ""})`
    }
    const approver = employees.find((e) => e.id === approverId)
    if (approver) {
      return `${approver.name} (${approver.emp_code})`
    }
    return `Approver #${approverId}`
  }

  const renderActionSummary = (leave: LeaveRequest) => {
    let type = "";
    let by = "";
    let role = "";
    let at = "";
    let remark = "";

    if (leave.status === "APPROVED" && leave.approved_at) {
      type = "Approved";
      by = leave.approver ? `${leave.approver.name}` : `ID: ${leave.approver_id}`;
      role = leave.approved_role || "";
      at = format(new Date(leave.approved_at), "dd/MM/yyyy HH:mm");
      remark = leave.approved_remark || "";
    } else if (leave.status === "REJECTED" && leave.rejected_at) {
      type = "Rejected";
      by = leave.rejected_by ? `${leave.rejected_by.name}` : `ID: ${leave.rejected_by_id}`;
      role = leave.approved_role || "";
      at = format(new Date(leave.rejected_at), "dd/MM/yyyy HH:mm");
      remark = leave.rejected_remark || "";
    } else if ((leave.status === "CANCELLED" || leave.status === "CANCELLED_BY_COMPANY" || leave.status === "REVOKED") && leave.cancelled_at) {
      type = leave.status === "REVOKED" ? "Revoked" : "Cancelled";
      if (leave.cancelled_by_id === leave.employee_id) {
        by = "Self (Employee)";
      } else {
        by = leave.cancelled_by ? `${leave.cancelled_by.name}` : `ID: ${leave.cancelled_by_id}`;
      }
      at = format(new Date(leave.cancelled_at), "dd/MM/yyyy HH:mm");
      remark = leave.cancelled_remark || "";
    } else {
      return <span className="text-slate-400 italic">Awaiting action</span>;
    }

    return (
      <div className="flex flex-col gap-1.5 text-[11px] leading-snug min-w-[200px] p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
        <div className="font-semibold flex items-center gap-1.5">
          <span className={
            type === "Approved" ? "text-emerald-600 dark:text-emerald-400" : 
            type === "Rejected" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
          }>
            {type}
          </span>
          <span className="text-slate-500 font-normal">by</span>
          <span className="truncate max-w-[100px] text-slate-700 dark:text-slate-300" title={by}>{by}</span>
          {role && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-white/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-none">
              {role}
            </Badge>
          )}
        </div>
        <div className="text-slate-500 flex items-center gap-1 text-[10px]">
          <span className="font-medium">At:</span> {at}
        </div>
        {remark && (
          <div 
            className="mt-0.5 p-1.5 bg-white/60 dark:bg-slate-950/40 rounded-lg border border-slate-100 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 max-h-[60px] overflow-y-auto scrollbar-thin"
            title={remark}
          >
            <span className="font-bold text-slate-500 mr-1">Note:</span>
            {remark}
          </div>
        )}
      </div>
    );
  };

  const canApproveReject = (leave: LeaveRequest) => {
    if (leave.status !== "PENDING") return false
    if (!user) return false
    if (user.role === "ADMIN" || user.role === "MD" || user.role === "VP") return true
    if (user.role === "HR") return true
    if (canAccessTeamModules(user as any)) return leave.approver_id === user.id
    return false
  }

  const canCancel = (leave: LeaveRequest) => {
    const role = user?.role
    const isSelf = leave.employee_id === user?.id
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const fromDate = new Date(leave.from_date)
    fromDate.setHours(0, 0, 0, 0)

    if (leave.status === "PENDING") {
      if (isSelf) return fromDate > today
      return role === "ADMIN" || role === "MD" || role === "HR" || role === "VP" || role === "MANAGER"
    }
    
    if (leave.status === "APPROVED") {
      if (role === "HR") return true
      if (isSelf) return fromDate >= today
      if (role === "ADMIN" || role === "MD" || role === "VP" || role === "MANAGER") {
        return fromDate >= today
      }
    }
    return false
  }

  const renderLeaveSummaryCard = (leave: LeaveRequest | null) => {
    if (!leave) return null;
    const emp = getEmployeeDetails(leave.employee_id);
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/40 p-4 space-y-3 mb-4 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{emp.name}</p>
            <p className="text-xs font-mono text-slate-500">{emp.emp_code}</p>
          </div>
          <Badge className={`shadow-none ${getLeaveTypeBadgeClass(leave.leave_type)}`}>
            {LEAVE_TYPE_LABEL[leave.leave_type] ?? leave.leave_type}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-slate-200/60 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-500 font-medium">Period</p>
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {formatLeaveDate(leave.from_date)} - {formatLeaveDate(leave.to_date)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Duration & Days</p>
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {leave.duration === "HALF_DAY" ? "Half Day" : "Full Day"} 
              <span className="text-slate-400 mx-1">•</span> 
              <span className="text-indigo-600 dark:text-indigo-400">{leave.computed_days} Days</span>
            </p>
          </div>
          {leave.duration === "HALF_DAY" && (
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

  const totalRequests = leaves.length;
  const pendingCount = leaves.filter(l => l.status === "PENDING").length;
  const approvedCount = leaves.filter(l => l.status === "APPROVED").length;
  const rejectedCount = leaves.filter(l => l.status === "REJECTED").length;
  const lwpLeaves = leaves.filter(l => l.lwp_days > 0).length;

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
                  ACS HRMS Leave Desk
                </Badge>
                <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-indigo-200 border-none backdrop-blur-sm font-semibold shadow-sm">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} View
                </Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Leave Request Control Center</h1>
              <p className="max-w-xl text-slate-300">
                Review, approve, reject and cancel employee leave requests with department, type and date filters.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 dark:bg-slate-900/50 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl shadow-inner w-max">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                <FileClock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">Requests Found</p>
                <p className="text-xl font-bold text-white">{leaves.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {renderMetricCard("Total Requests", totalRequests, FileClock, "slate")}
          {renderMetricCard("Pending", pendingCount, Clock, "amber")}
          {renderMetricCard("Approved", approvedCount, CheckCircle2, "emerald")}
          {renderMetricCard("Rejected", rejectedCount, XCircle, "red")}
          {renderMetricCard("LWP Leaves", lwpLeaves, AlertTriangle, "indigo")}
        </div>

        {/* 3. Premium Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="bg-slate-100/70 dark:bg-slate-900/70 p-1.5 rounded-2xl shadow-inner overflow-x-auto">
            <TabsList className="w-full bg-transparent flex justify-start gap-1 p-0 h-auto md:grid md:grid-cols-6 min-w-max">
              <TabsTrigger 
                value="pending" 
                className="rounded-xl px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:dark:bg-slate-950 data-[state=active]:shadow-sm font-medium"
              >
                <Clock className="h-4 w-4 mr-2" /> Pending For Me
              </TabsTrigger>
              {user?.role === "ADMIN" && (
                <TabsTrigger 
                  value="all" 
                  className="rounded-xl px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:dark:bg-slate-950 data-[state=active]:shadow-sm font-medium"
                >
                  <Layers className="h-4 w-4 mr-2" /> All Leaves
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="approved" 
                className="rounded-xl px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:dark:bg-slate-950 data-[state=active]:shadow-sm font-medium"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Approved
              </TabsTrigger>
              <TabsTrigger 
                value="rejected" 
                className="rounded-xl px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:dark:bg-slate-950 data-[state=active]:shadow-sm font-medium"
              >
                <XCircle className="h-4 w-4 mr-2" /> Rejected
              </TabsTrigger>
              <TabsTrigger 
                value="cancelled" 
                className="rounded-xl px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:dark:bg-slate-950 data-[state=active]:shadow-sm font-medium"
              >
                <Ban className="h-4 w-4 mr-2" /> Cancelled
              </TabsTrigger>
              <TabsTrigger 
                value="lwp" 
                className="rounded-xl px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:dark:bg-slate-950 data-[state=active]:shadow-sm font-medium"
              >
                <AlertTriangle className="h-4 w-4 mr-2" /> LWP
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        {/* 4. Premium Filter Card */}
        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 p-5">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Leave Request Filters
            </CardTitle>
            <CardDescription>Filter leave requests by employee, leave type and date range.</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Employee</Label>
                <Select
                  value={filters.employee_id?.toString() || "all"}
                  onValueChange={(value) =>
                    setFilters({ ...filters, employee_id: value === "all" ? undefined : parseInt(value) })
                  }
                >
                  <SelectTrigger className="rounded-xl h-10 bg-white dark:bg-slate-950 shadow-sm">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name} ({emp.emp_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Leave Type</Label>
                <Select
                  value={filters.leave_type || "all"}
                  onValueChange={(value) =>
                    setFilters({ ...filters, leave_type: value === "all" ? undefined : (value as LeaveType) })
                  }
                >
                  <SelectTrigger className="rounded-xl h-10 bg-white dark:bg-slate-950 shadow-sm">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="CL">CL</SelectItem>
                    <SelectItem value="PL">PL</SelectItem>
                    <SelectItem value="SL">SL</SelectItem>
                    <SelectItem value="FL">FL</SelectItem>
                    <SelectItem value="RH">RH</SelectItem>
                    <SelectItem value="COMPOFF">Comp Off</SelectItem>
                    <SelectItem value="LWP">LWP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">From Date</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    type="date" 
                    value={filters.from_date} 
                    onChange={(e) => setFilters({ ...filters, from_date: e.target.value })} 
                    className="pl-9 rounded-xl h-10 bg-white dark:bg-slate-950 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">To Date</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    type="date" 
                    value={filters.to_date} 
                    onChange={(e) => setFilters({ ...filters, to_date: e.target.value })} 
                    className="pl-9 rounded-xl h-10 bg-white dark:bg-slate-950 shadow-sm"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={resetFilters}
                  className="w-full rounded-xl h-10 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <RotateCcw className="h-4 w-4 mr-2 text-slate-500" />
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Error Card */}
        {apiError && !loading && (
          <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 p-6 shadow-sm">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-red-800 dark:text-red-300">Failed to load leave requests</h4>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1 font-medium">{apiError}</p>
              <Button variant="outline" size="sm" onClick={fetchLeaves} className="mt-4 rounded-lg border-red-200 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/50">
                <RotateCcw className="h-3 w-3 mr-2" /> Retry
              </Button>
            </div>
          </div>
        )}

        {/* 5. Loading & Empty & Register Area */}
        {loading ? (
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
        ) : leaves.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 p-12 flex flex-col items-center text-center shadow-sm">
            <div className="h-20 w-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <FileClock className="h-10 w-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">No leave requests found</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6 font-medium">
              No leave requests match the selected tab or filters.
            </p>
            <Button variant="outline" className="rounded-xl shadow-sm" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        ) : (
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 p-5 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Leave Request Register</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Employee leave applications with leave type, duration, approval status and action history.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-white dark:bg-slate-950 font-bold px-3 py-1 shadow-sm rounded-lg">
                {leaves.length} Records
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop Table */}
              <div className="overflow-x-auto hidden xl:block">
                <AnimatedTable className="min-w-[1250px]">
                  <TableHeader>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                      <TableHead className="pl-6">Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Leave Period</TableHead>
                      <TableHead>Duration & Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approver</TableHead>
                      <TableHead>Action Summary</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((leave, index) => {
                      const emp = getEmployeeDetails(leave.employee_id)
                      const isHalfDay = leave.duration === "HALF_DAY"
                      return (
                        <AnimatedTableRow key={leave.id} delay={index * 0.03} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60">
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm shadow-inner dark:bg-indigo-900/50 dark:text-indigo-400">
                                {getInitials(emp.name)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-slate-100">{emp.name}</p>
                                <p className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded w-max mt-0.5">{emp.emp_code}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                              <Building2 className="h-4 w-4 text-slate-400" />
                              <span className="font-medium text-sm">{emp.department}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`shadow-none text-xs px-2.5 py-0.5 ${getLeaveTypeBadgeClass(leave.leave_type)}`}>
                              {LEAVE_TYPE_LABEL[leave.leave_type] ?? leave.leave_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-start gap-2">
                              <CalendarDays className="h-4 w-4 text-slate-400 mt-0.5" />
                              <div className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-tight">
                                <div>{formatLeaveDate(leave.from_date)}</div>
                                <div className="text-slate-400 text-xs mt-0.5">to {formatLeaveDate(leave.to_date)}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`font-semibold px-2 py-0 h-5 text-[10px] ${isHalfDay ? "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20" : "text-indigo-600 border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20"}`}>
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
                            {renderStatusBadge(leave.status, leave.override_policy)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
                              <UserCheck className="h-4 w-4 text-slate-400" />
                              <span className="truncate max-w-[120px]" title={getApproverName(leave.approver_id, leave)}>
                                {getApproverName(leave.approver_id, leave)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {renderActionSummary(leave)}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              {canApproveReject(leave) ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApprove(leave)}
                                    className="rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 h-8 px-2"
                                    title="Approve"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReject(leave)}
                                    className="rounded-xl border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 h-8 px-2"
                                    title="Reject"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : canCancel(leave) ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancel(leave)}
                                  className="rounded-xl border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 h-8 px-2"
                                  title={leave.employee_id === user?.id ? "Self Cancel" : "Company Cancel"}
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              ) : (
                                <span className="text-xs text-slate-400 italic">No Action</span>
                              )}
                            </div>
                          </TableCell>
                        </AnimatedTableRow>
                      )
                    })}
                  </TableBody>
                </AnimatedTable>
              </div>

              {/* Mobile / Tablet Card List */}
              <div className="xl:hidden p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {leaves.map((leave) => {
                  const emp = getEmployeeDetails(leave.employee_id)
                  const isHalfDay = leave.duration === "HALF_DAY"
                  return (
                    <div key={leave.id} className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/20 p-5 shadow-sm space-y-4">
                      
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm shadow-inner dark:bg-indigo-900/50 dark:text-indigo-400">
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight">{emp.name}</p>
                            <p className="text-xs font-mono text-slate-500 mt-0.5">{emp.emp_code}</p>
                          </div>
                        </div>
                        <Badge className={`shadow-none text-xs px-2.5 py-0.5 ${getLeaveTypeBadgeClass(leave.leave_type)}`}>
                          {LEAVE_TYPE_LABEL[leave.leave_type] ?? leave.leave_type}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <div className="col-span-2">
                          <p className="text-xs text-slate-500 font-medium">Department</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-300">{emp.department}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Period</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-300">
                            {formatLeaveDate(leave.from_date)}
                            <br/>
                            <span className="text-slate-400 text-xs font-normal">to</span> {formatLeaveDate(leave.to_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Duration & Days</p>
                          <div className="flex flex-col items-start gap-1 mt-0.5">
                            <Badge variant="outline" className={`font-semibold px-2 py-0 h-5 text-[10px] shadow-none ${isHalfDay ? "text-amber-600 border-amber-200 bg-amber-50" : "text-indigo-600 border-indigo-200 bg-indigo-50"}`}>
                              {isHalfDay ? "Half Day" : "Full Day"}
                            </Badge>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{leave.computed_days} Days</span>
                            {isHalfDay && (
                              <span className="text-[10px] text-slate-500">{leave.half_day_session === "SECOND_HALF" ? "Second Half" : "First Half"}</span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-slate-500 font-medium">Reason</p>
                          <p className="font-medium text-slate-700 dark:text-slate-300 italic">{leave.reason || "—"}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-slate-500 font-medium mb-1">Status</p>
                          {renderStatusBadge(leave.status, leave.override_policy)}
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-slate-500 font-medium">Approver</p>
                          <p className="font-semibold text-slate-700 dark:text-slate-300">{getApproverName(leave.approver_id, leave)}</p>
                        </div>
                      </div>

                      {/* Mobile Actions */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex gap-2">
                        {canApproveReject(leave) ? (
                          <>
                            <Button 
                              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" 
                              onClick={() => handleApprove(leave)}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                            </Button>
                            <Button 
                              variant="destructive" 
                              className="flex-1 rounded-xl shadow-sm" 
                              onClick={() => handleReject(leave)}
                            >
                              <XCircle className="mr-2 h-4 w-4" /> Reject
                            </Button>
                          </>
                        ) : canCancel(leave) ? (
                          <Button 
                            variant="outline" 
                            className="w-full rounded-xl border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 shadow-sm" 
                            onClick={() => handleCancel(leave)}
                          >
                            <Ban className="mr-2 h-4 w-4" /> Cancel Leave
                          </Button>
                        ) : (
                          <Button disabled variant="outline" className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border-dashed text-slate-400">
                            No Action Available
                          </Button>
                        )}
                      </div>

                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 6. Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-0 bg-white/95 dark:bg-slate-950/95 overflow-hidden border-emerald-200 dark:border-emerald-900/50 shadow-xl">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-6 flex items-start gap-4 border-b border-emerald-100 dark:border-emerald-900/50">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-emerald-900 dark:text-emerald-100">Approve Leave Request</DialogTitle>
              <DialogDescription className="text-emerald-700 dark:text-emerald-300/80 mt-1">
                Review leave duration and add optional approval remarks.
              </DialogDescription>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {renderLeaveSummaryCard(selectedLeave)}
            
            <div className="space-y-2">
              <Label htmlFor="approve-remarks" className="font-semibold text-slate-700 dark:text-slate-300">Remarks <span className="text-slate-400 font-normal">(Optional)</span></Label>
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
            <Button
              variant="outline"
              onClick={() => {
                setApproveOpen(false)
                setRemarks("")
              }}
              disabled={submitting}
              className="rounded-xl bg-white dark:bg-slate-950"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitApprove} 
              disabled={submitting}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Approving...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Approve Leave</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-0 bg-white/95 dark:bg-slate-950/95 overflow-hidden border-red-200 dark:border-red-900/50 shadow-xl">
          <div className="bg-red-50 dark:bg-red-950/30 p-6 flex items-start gap-4 border-b border-red-100 dark:border-red-900/50">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-red-900 dark:text-red-100">Reject Leave Request</DialogTitle>
              <DialogDescription className="text-red-700 dark:text-red-300/80 mt-1">
                Rejection remarks are required and will be visible for audit/employee reference.
              </DialogDescription>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {renderLeaveSummaryCard(selectedLeave)}
            
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <Label htmlFor="reject-remarks" className="font-semibold text-slate-700 dark:text-slate-300">Remarks <span className="text-red-500">*</span></Label>
                <span className="text-[10px] text-amber-600 font-medium">Please mention clear reason for rejection.</span>
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
            <Button
              variant="outline"
              onClick={() => {
                setRejectOpen(false)
                setRemarks("")
              }}
              disabled={submitting}
              className="rounded-xl bg-white dark:bg-slate-950"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReject}
              disabled={submitting || !remarks.trim()}
              variant="destructive"
              className="rounded-xl shadow-md"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rejecting...</>
              ) : (
                <><XCircle className="h-4 w-4 mr-2" /> Reject Leave</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-0 bg-white/95 dark:bg-slate-950/95 overflow-hidden border-amber-200 dark:border-amber-900/50 shadow-xl">
          <div className="bg-amber-50 dark:bg-amber-950/30 p-6 flex items-start gap-4 border-b border-amber-100 dark:border-amber-900/50">
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Ban className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-amber-900 dark:text-amber-100">Cancel Leave</DialogTitle>
              <DialogDescription className="text-amber-700 dark:text-amber-300/80 mt-1">
                Cancel pending or approved leave request with mandatory cancellation remark.
              </DialogDescription>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {renderLeaveSummaryCard(selectedLeave)}
            
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 flex gap-3 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <p>If approved leave is cancelled, balance restoration will follow backend policy.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancel-remarks" className="font-semibold text-slate-700 dark:text-slate-300">Remarks <span className="text-amber-600">*</span></Label>
              <Textarea
                id="cancel-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter cancellation remark..."
                disabled={submitting}
                rows={3}
                className="rounded-xl bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/50 shadow-sm focus-visible:ring-amber-500"
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/50 sm:justify-end gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setCancelOpen(false)
                setRemarks("")
              }}
              disabled={submitting}
              className="rounded-xl bg-white dark:bg-slate-950"
            >
              Close
            </Button>
            <Button
              onClick={handleSubmitCancel}
              disabled={submitting || !remarks.trim()}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Confirming...</>
              ) : (
                <><Ban className="h-4 w-4 mr-2" /> Confirm Cancel</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debug Panel */}
      {user?.role === "HR" && <DebugPanel />}
    </PageContainer>
  )
}
