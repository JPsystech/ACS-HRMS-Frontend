"use client"

import React, { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { DebugPanel } from "@/components/debug/DebugPanel"
import {
  LeaveRequest,
  LeaveType,
  LeaveStatus,
  Employee,
  ApprovalActionRequest,
  RejectActionRequest,
  CancelLeaveRequest,
} from "@/types/models"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Check, X, Loader2, RotateCcw, AlertCircle } from "lucide-react"
import { format } from "date-fns"

/** Display labels for leave types (avoids relying on LeaveType at runtime for UI) */
const LEAVE_TYPE_LABEL: Record<string, string> = {
  CL: "CL",
  PL: "PL",
  SL: "SL",
  RH: "RH",
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
  const [recredit, setRecredit] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string>("")

  useEffect(() => {
    if (user) {
      // Load department names so we can show names instead of numeric IDs
      api.get<{ id: number; name: string }[]>("/api/v1/departments")
        .then((r) => {
          setDepartments(Array.isArray(r) ? r : [])
        })
        .catch(() => {
          // Non-blocking: if departments fail to load, we fall back to numeric IDs
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
      if (user?.role === "HR") {
        // HR sees all employees
        const data = await api.get<Employee[]>("/api/v1/employees")
        setEmployees(data)
      } else if (user?.role === "MANAGER") {
        // Managers use the my-team endpoint instead of /employees
        const data = await api.get<Employee[]>("/api/v1/employees/my-team")
        setEmployees(data)
      } else {
        // Employees see only themselves - use my-team for self
        const data = await api.get<Employee[]>("/api/v1/employees/my-team")
        setEmployees(data)
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err)
      // Don't show error for MANAGER/EMPLOYEE - they might not have access to /employees
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
        console.error("[Leaves] Fetch failed", {
          status: err.status,
          response: err.data,
        })
        setApiError(errorMsg)
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMsg,
        })
      } else {
        const errorMsg = "An unexpected error occurred"
        console.error("[Leaves] Unexpected fetch error", err)
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
    setRecredit(true)
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
      // Notify other pages to refetch balances and dashboard
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("leave-action-done"))
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        console.error("[Leaves] Approve failed", {
          status: err.status,
          response: err.data,
        })
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to approve leave",
        })
      } else {
        console.error("[Leaves] Unexpected approve error", err)
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
        console.error("[Leaves] Reject failed", {
          status: err.status,
          response: err.data,
        })
        toast({
          variant: "destructive",
          title: "Error",
          description: getApiErrorMessage(err, "Failed to reject leave"),
        })
      } else {
        console.error("[Leaves] Unexpected reject error", err)
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

    setSubmitting(true)
    try {
      const data: CancelLeaveRequest = {
        recredit: recredit,
        remarks: remarks || undefined,
      }
      await api.post(
        `/api/v1/hr/actions/cancel-leave/${selectedLeave.id}`,
        data
      )
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
        console.error("[Leaves] Cancel failed", {
          status: err.status,
          response: err.data,
        })
        toast({
          variant: "destructive",
          title: "Error",
          description: getApiErrorMessage(err, "Failed to cancel leave"),
        })
      } else {
        console.error("[Leaves] Unexpected cancel error", err)
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
        // Prefer backend-provided department_name, else map department_id via departments list
        department:
          (emp as any).department_name ||
          getDepartmentName((emp as any).department_id) ||
          "-"
      }
    }
    // If employee not found, try to get from leave data if available
    const leave = leaves.find((l) => l.employee_id === employeeId)
    if (leave && (leave as any).employee) {
      const empData = (leave as any).employee
      return {
        name: empData.name,
        emp_code: empData.emp_code,
        department:
          empData.department_name ||
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
    
    // Prefer approver details from leave object if available (from Task 5 API enrichment)
    if ((leave as any).approver_name) {
      return `${(leave as any).approver_name} (${(leave as any).approver_emp_code || ""})`
    }
    if ((leave as any).approver) {
      const approver = (leave as any).approver
      return `${approver.name} (${approver.emp_code || ""})`
    }
    
    // Fallback to employee list lookup
    const approver = employees.find((e) => e.id === approverId)
    if (approver) {
      return `${approver.name} (${approver.emp_code})`
    }
    return `Approver #${approverId}`
  }

  const getStatusBadgeVariant = (status: LeaveStatus) => {
    switch (status) {
      case "APPROVED":
        return "default"
      case "REJECTED":
        return "destructive"
      case "PENDING":
        return "secondary"
      case "CANCELLED":
      case "CANCELLED_BY_COMPANY":
        return "outline"
      default:
        return "outline"
    }
  }

  const getActionSummary = (leave: LeaveRequest) => {
    if (leave.status === "APPROVED" && leave.approved_at) {
      const by = leave.approver ? `${leave.approver.name}` : `#${leave.approver_id}`
      const at = leave.approved_at ? format(new Date(leave.approved_at), "dd MMM yyyy, HH:mm") : ""
      const remark = leave.approved_remark ? ` — ${leave.approved_remark}` : ""
      return `Approved by ${by} on ${at}${remark}`
    }
    if (leave.status === "REJECTED" && leave.rejected_at) {
      const by = leave.rejected_by ? `${leave.rejected_by.name}` : `#${leave.rejected_by_id}`
      const at = format(new Date(leave.rejected_at), "dd MMM yyyy, HH:mm")
      const remark = leave.rejected_remark ? ` — ${leave.rejected_remark}` : ""
      return `Rejected by ${by} on ${at}${remark}`
    }
    if ((leave.status === "CANCELLED" || leave.status === "CANCELLED_BY_COMPANY") && leave.cancelled_at) {
      const by = leave.cancelled_by ? `${leave.cancelled_by.name}` : `#${leave.cancelled_by_id}`
      const at = format(new Date(leave.cancelled_at), "dd MMM yyyy, HH:mm")
      const remark = leave.cancelled_remark ? ` — ${leave.cancelled_remark}` : ""
      return `Cancelled by ${by} on ${at}${remark}`
    }
    return "—"
  }

  const canApproveReject = (leave: LeaveRequest) => {
    if (leave.status !== "PENDING") return false
    
    // MD and ADMIN can approve any pending leave
    if (user?.role === "MD" || user?.role === "ADMIN") return true
    
    // HR can approve any pending leave
    if (user?.role === "HR") return true
    
    // Manager can approve only if they are the designated approver
    if (user?.role === "MANAGER") {
      return leave.approver_id === user?.id
    }
    
    return false
  }

  const canCancel = (leave: LeaveRequest) => {
    if (user?.role !== "HR") return false
    if (leave.status !== "APPROVED") return false
    return leave.leave_type === "CL" || leave.leave_type === "PL"
  }

  return (
    <PageContainer
      title="Leaves"
      description="Manage and approve leave requests"
    >
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pending">Pending For Me</TabsTrigger>
          {user?.role === "MD" || user?.role === "ADMIN" ? (
            <TabsTrigger value="all">All Leaves</TabsTrigger>
          ) : null}
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="lwp">LWP</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-4">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Employee
                </Label>
                <Select
                  value={filters.employee_id?.toString() || "all"}
                  onValueChange={(value) =>
                    setFilters({
                  ...filters,
                  employee_id: value === "all" ? undefined : parseInt(value),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.name} ({emp.emp_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
              </div>
              <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Leave Type
            </Label>
            <Select
              value={filters.leave_type || "all"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  leave_type: value === "all" ? undefined : (value as LeaveType),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CL">CL</SelectItem>
                <SelectItem value="PL">PL</SelectItem>
                <SelectItem value="SL">SL</SelectItem>
                <SelectItem value="RH">RH</SelectItem>
                <SelectItem value="COMPOFF">Comp Off</SelectItem>
                <SelectItem value="LWP">LWP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              From Date
            </Label>
            <Input
              type="date"
              value={filters.from_date}
              onChange={(e) =>
                setFilters({ ...filters, from_date: e.target.value })
              }
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              To Date
            </Label>
            <Input
              type="date"
              value={filters.to_date}
              onChange={(e) =>
                setFilters({ ...filters, to_date: e.target.value })
              }
            />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Error Banner */}
      {apiError && !loading && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">
            <strong>API Error:</strong> {apiError}
          </p>
        </div>
      )}

      {loading ? (
        <div className="border rounded-lg">
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      ) : leaves.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center border rounded-lg p-12">
          <p className="text-lg text-muted-foreground mb-4">
            No leave requests found
          </p>
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <AnimatedTable>
                <TableHeader>
                  <tr>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Emp Code</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approver</TableHead>
                    <TableHead className="max-w-[220px]">Action (By / At / Remark)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave, index) => (
                    <AnimatedTableRow key={leave.id} delay={index * 0.03}>
                  <TableCell>{getEmployeeDetails(leave.employee_id).name}</TableCell>
                  <TableCell>{getEmployeeDetails(leave.employee_id).emp_code}</TableCell>
                  <TableCell>{getEmployeeDetails(leave.employee_id).department}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{LEAVE_TYPE_LABEL[leave.leave_type] ?? leave.leave_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(leave.from_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(leave.to_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-semibold">
                      {leave.computed_days}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {leave.reason || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={getStatusBadgeVariant(leave.status)}
                      className={leave.status === "PENDING" ? "animate-pulse" : ""}
                    >
                      {leave.status.replace("_", " ")}
                    </Badge>
                    {leave.override_policy && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        HR Override
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{getApproverName(leave.approver_id, leave)}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-muted-foreground text-xs" title={getActionSummary(leave)}>
                    {getActionSummary(leave)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canApproveReject(leave) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(leave)}
                            title="Approve"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReject(leave)}
                            title="Reject"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                      {canCancel(leave) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancel(leave)}
                          title="Company Cancel"
                        >
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                      </AnimatedTableRow>
                    ))}
                  </TableBody>
                </AnimatedTable>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Leave Request</DialogTitle>
            <DialogDescription>
              Approve leave request #{selectedLeave?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="approve-remarks">Remarks (Optional)</Label>
              <Textarea
                id="approve-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter approval remarks..."
                disabled={submitting}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApproveOpen(false)
                setRemarks("")
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitApprove} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Reject leave request #{selectedLeave?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reject-remarks">Remarks *</Label>
              <Textarea
                id="reject-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter rejection remarks..."
                required
                disabled={submitting}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectOpen(false)
                setRemarks("")
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReject}
              disabled={submitting || !remarks.trim()}
              variant="destructive"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Approved Leave</DialogTitle>
            <DialogDescription>
              Cancel approved leave request #{selectedLeave?.id} (Company
              Emergency - HR Only)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cancel-remarks">Remarks (Optional)</Label>
              <Textarea
                id="cancel-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter cancellation remarks..."
                disabled={submitting}
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="recredit"
                checked={recredit}
                onChange={(e) => setRecredit(e.target.checked)}
                title="Re-credit leave balance"
                aria-label="Re-credit leave balance"
                className="h-4 w-4"
                disabled={submitting}
              />
              <Label htmlFor="recredit">Re-credit leave balance</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelOpen(false)
                setRemarks("")
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCancel}
              disabled={submitting}
              variant="destructive"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Leave"
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
