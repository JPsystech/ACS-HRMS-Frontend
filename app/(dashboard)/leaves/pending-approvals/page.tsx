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
import { Card, CardContent } from "@/components/ui/card"
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
import { Check, X, Loader2, RotateCcw, Search } from "lucide-react"
import { format } from "date-fns"

const BATCH_SIZE = 10

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
  }, [user])

  const fetchEmployees = async () => {
    try {
      if (user?.role === "ADMIN") {
        // ADMIN sees all employees
        const data = await api.get<Employee[]>("/api/v1/employees")
        setEmployees(data)
      } else if (canAccessTeamModules(user as any)) {
        // Team roles use my-team endpoint
        const data = await api.get<Employee[]>("/api/v1/employees/my-team-tree")
        setEmployees(data)
      } else {
        // Employees see only themselves - use my-team for self
        const data = await api.get<Employee[]>("/api/v1/employees/my-team")
        setEmployees(data)
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err)
      // Don't show error for VP/MANAGER/EMPLOYEE - they might not have access to /employees
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
        console.error("[PendingApprovals] Fetch failed", {
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
        console.error("[PendingApprovals] Unexpected fetch error", err)
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

  const fetchPendingCorrections = async () => {
    setLoadingCorrections(true)
    try {
      // Use status_filter=PENDING to fetch corrections needing approval
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
      await fetchPendingLeaves()
    } catch (err) {
      if (err instanceof ApiClientError) {
        console.error("[PendingApprovals] Approve failed", {
          status: err.status,
          response: err.data,
        })
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to approve leave",
        })
      } else {
        console.error("[PendingApprovals] Unexpected approve error", err)
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
      await fetchPendingLeaves()
    } catch (err) {
      if (err instanceof ApiClientError) {
        console.error("[PendingApprovals] Reject failed", {
          status: err.status,
          response: err.data,
        })
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to reject leave",
        })
      } else {
        console.error("[PendingApprovals] Unexpected reject error", err)
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

  const handleSubmitApproveCorrection = async () => {
    if (!selectedCorrection) return

    setSubmitting(true)
    try {
      await api.post<AttendanceCorrectionRequest>(
        `/api/v1/attendance-corrections/${selectedCorrection.id}/approve`,
        { admin_remarks: remarks || undefined }
      )
      toast({
        title: "Success",
        description: "Attendance correction approved successfully",
      })
      setApproveCorrectionOpen(false)
      setSelectedCorrection(null)
      setRemarks("")
      await fetchPendingCorrections()
    } catch (err) {
      console.error("[PendingApprovals] Correction approve failed", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve attendance correction",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitRejectCorrection = async () => {
    if (!selectedCorrection) return
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
      await api.post<AttendanceCorrectionRequest>(
        `/api/v1/attendance-corrections/${selectedCorrection.id}/reject`,
        { admin_remarks: remarks }
      )
      toast({
        title: "Success",
        description: "Attendance correction rejected successfully",
      })
      setRejectCorrectionOpen(false)
      setSelectedCorrection(null)
      setRemarks("")
      await fetchPendingCorrections()
    } catch (err) {
      console.error("[PendingApprovals] Correction reject failed", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject attendance correction",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getEmployeeName = (employeeId: number, leave?: LeaveRequest) => {
    // Prefer employee details from leave object if available (from Task 5 API enrichment)
    if (leave) {
      if ((leave as any).employee_name) {
        return `${(leave as any).employee_name} (${(leave as any).employee_emp_code || ""})`
      }
      if ((leave as any).employee) {
        const empData = (leave as any).employee
        return `${empData.name} (${empData.emp_code || ""})`
      }
    }
    
    // Fallback to employee list lookup
    const emp = employees.find((e) => e.id === employeeId)
    if (emp) {
      return `${emp.name} (${emp.emp_code})`
    }
    
    // If employee not found, try to get from any leave data if available
    const foundLeave = leaves.find((l) => l.employee_id === employeeId)
    if (foundLeave && (foundLeave as any).employee) {
      const empData = (foundLeave as any).employee
      return `${empData.name} (${empData.emp_code})`
    }
    
    return `Employee #${employeeId}`
  }

  const canApproveReject = (leave: LeaveRequest) => {
    if (leave.status !== "PENDING") return false
    // ADMIN, MD, VP, and MANAGER can approve - backend handles hierarchical validation
    if (user?.role === "ADMIN" || user?.role === "MD" || user?.role === "VP" || user?.role === "MANAGER") {
      return true
    }
    return false
  }

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
      <PageContainer
        title="Pending Approvals"
        description="Review and approve/reject leave requests"
      >
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="p-6 bg-muted/50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You need manager-level access to view pending approvals.
            </p>
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title="Pending Approvals"
      description="Review and approve/reject leave requests"
    >
      {/* Search and Filters */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by employee name, leave type, reason, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => {
                fetchPendingLeaves()
                fetchPendingCorrections()
              }}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="leaves" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
          <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Corrections</TabsTrigger>
        </TabsList>
        <TabsContent value="leaves">
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
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center border rounded-lg p-12">
              {searchTerm ? (
                <>
                  <p className="text-lg text-muted-foreground mb-4">
                    No pending leave requests match your search
                  </p>
                  <Button variant="outline" onClick={() => setSearchTerm("")}>
                    Clear Search
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-lg text-muted-foreground mb-4">
                    No pending leave requests found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    All leave requests have been processed or there are no pending requests at this time.
                  </p>
                </>
              )}
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <AnimatedTable>
                    <TableHeader>
                      <tr>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>From Date</TableHead>
                        <TableHead>To Date</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead>Computed Days</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Applied At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {filteredLeaves.map((leave, index) => (
                        <AnimatedTableRow key={leave.id} delay={index * 0.03}>
                          <TableCell className="font-medium">#{leave.id}</TableCell>
                          <TableCell>{getEmployeeName(leave.employee_id, leave)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{leave.leave_type}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(leave.from_date), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>
                            {format(new Date(leave.to_date), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>
                            {leave.duration === "HALF_DAY" ? "Half Day" : "Full Day"}
                          </TableCell>
                          <TableCell>
                            {leave.duration === "HALF_DAY"
                              ? (leave.half_day_session === "SECOND_HALF" ? "Second Half" : "First Half")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-semibold">
                              {leave.computed_days}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {leave.reason || "-"}
                          </TableCell>
                          <TableCell>
                            {leave.applied_at
                              ? format(new Date(leave.applied_at), "MMM dd, yyyy")
                              : "-"}
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
                                    className="h-8 w-8"
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleReject(leave)}
                                    title="Reject"
                                    className="h-8 w-8"
                                  >
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </>
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
        </TabsContent>
        <TabsContent value="attendance">
          {loadingCorrections ? (
            <div className="border rounded-lg">
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ) : filteredCorrections.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center border rounded-lg p-12">
              {searchTerm ? (
                <>
                  <p className="text-lg text-muted-foreground mb-4">
                    No pending attendance corrections match your search
                  </p>
                  <Button variant="outline" onClick={() => setSearchTerm("")}>
                    Clear Search
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-lg text-muted-foreground mb-4">
                    No pending attendance corrections found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    All corrections have been processed or there are no pending requests.
                  </p>
                </>
              )}
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <AnimatedTable>
                    <TableHeader>
                      <tr>
                        <TableHead>ID</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Requested In</TableHead>
                        <TableHead>Requested Out</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {filteredCorrections.map((it, index) => (
                        <AnimatedTableRow key={it.id} delay={index * 0.03}>
                          <TableCell className="font-medium">#{it.id}</TableCell>
                          <TableCell>{it.employee_name || getEmployeeName(it.employee_id)}</TableCell>
                          <TableCell>{format(new Date(it.date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{it.request_type.replace(/_/g, " ")}</Badge>
                          </TableCell>
                          <TableCell>
                            {it.requested_punch_in ? format(new Date(it.requested_punch_in), "hh:mm a") : "-"}
                          </TableCell>
                          <TableCell>
                            {it.requested_punch_out ? format(new Date(it.requested_punch_out), "hh:mm a") : "-"}
                          </TableCell>
                          <TableCell className="max-w-[250px] truncate" title={it.reason}>
                            {it.reason}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApproveCorrection(it)}
                                title="Approve"
                                className="h-8 w-8"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRejectCorrection(it)}
                                title="Reject"
                                className="h-8 w-8"
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
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
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Leave Request</DialogTitle>
            <DialogDescription>
              Approve leave request #{selectedLeave?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Duration</span>
              <span className="text-foreground">
                {selectedLeave?.duration === "HALF_DAY" ? "Half Day" : "Full Day"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Session</span>
              <span className="text-foreground">
                {selectedLeave?.duration === "HALF_DAY"
                  ? (selectedLeave?.half_day_session === "SECOND_HALF" ? "Second Half" : "First Half")
                  : "-"}
              </span>
            </div>
          </div>
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

      {/* Approve Attendance Correction Dialog */}
      <Dialog open={approveCorrectionOpen} onOpenChange={setApproveCorrectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Attendance Correction</DialogTitle>
            <DialogDescription>
              Approve correction request #{selectedCorrection?.id} for {selectedCorrection?.employee_name || getEmployeeName(selectedCorrection?.employee_id || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Type</span>
              <span className="text-foreground">{selectedCorrection?.request_type.replace(/_/g, " ")}</span>
            </div>
            <div className="flex justify-between">
              <span>Date</span>
              <span className="text-foreground">
                {selectedCorrection?.date ? format(new Date(selectedCorrection.date), "MMM dd, yyyy") : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Requested In</span>
              <span className="text-foreground">
                {selectedCorrection?.requested_punch_in ? format(new Date(selectedCorrection.requested_punch_in), "hh:mm a") : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Requested Out</span>
              <span className="text-foreground">
                {selectedCorrection?.requested_punch_out ? format(new Date(selectedCorrection.requested_punch_out), "hh:mm a") : "-"}
              </span>
            </div>
          </div>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="approve-correction-remarks">Admin Remarks (Optional)</Label>
              <Textarea
                id="approve-correction-remarks"
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
                setApproveCorrectionOpen(false)
                setRemarks("")
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitApproveCorrection} disabled={submitting}>
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

      {/* Reject Attendance Correction Dialog */}
      <Dialog open={rejectCorrectionOpen} onOpenChange={setRejectCorrectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Attendance Correction</DialogTitle>
            <DialogDescription>
              Reject correction request #{selectedCorrection?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reject-correction-remarks">Remarks *</Label>
              <Textarea
                id="reject-correction-remarks"
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
                setRejectCorrectionOpen(false)
                setRemarks("")
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRejectCorrection}
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
    </PageContainer>
  )
}
