"use client"

import React, { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Employee, Department, RoleDefinition } from "@/types/models"
import { PageContainer } from "@/components/ui/page-container"
import { Card, CardContent } from "@/components/ui/card"
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
import { Check, X, RefreshCw, Loader2 } from "lucide-react"
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
  }, [user])

  // Auto-refresh when filters or status change
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
      // For the dedicated pending view, use the /pending endpoint (backend already scopes by role)
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
        const detail =
          typeof err.data?.detail === "string"
            ? err.data.detail
            : "Failed to load WFH requests"
        setApiError(detail)
        toast({
          variant: "destructive",
          title: "Error",
          description: detail,
        })
      } else {
        setApiError("Failed to load WFH requests")
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load WFH requests",
        })
      }
      setWfhRequests([])
    } finally {
      setLoading(false)
    }
  }

  const getEmployeeLabel = (employeeId: number) => {
    const emp = employees.find((e) => e.id === employeeId)
    if (!emp) return `Employee #${employeeId}`
    const roleName = emp.role
    const roleDef = roles.find((r) => r.name === roleName)
    const wfhBadge =
      roleDef && roleDef.wfh_enabled ? "WFH enabled" : "WFH disabled"
    return `${emp.name} (${emp.emp_code})${roleDef ? ` – ${roleName}` : ""}${
      roleDef ? ` (${wfhBadge})` : ""
    }`
  }

  const getDepartmentName = (departmentId?: number | null, employeeId?: number, wfhRequest?: any) => {
    // 1) First check if the WFH request already has department information through employee relationship
    if (wfhRequest?.employee?.department?.name) {
      return wfhRequest.employee.department.name
    }
    
    // 2) Use department_id from the WFH request if present
    if (departmentId && typeof departmentId === "number") {
      const dept = departments.find((d) => d.id === departmentId)
      if (dept) return dept.name
    }

    if (employeeId == null) return "-"

    // 3) Use the employee's own department if set
    const emp = employees.find((e) => e.id === employeeId)
    if (emp?.department_id) {
      const dept = departments.find((d) => d.id === emp.department_id)
      if (dept) return dept.name
    }

    // 4) Fallback: inherit department from reporting manager (useful for VP/MD without explicit dept)
    if (emp?.reporting_manager_id) {
      const mgr = employees.find((e) => e.id === emp.reporting_manager_id)
      if (mgr?.department_id) {
        const dept = departments.find((d) => d.id === mgr.department_id)
        if (dept) return dept.name
      }
    }

    return "-"
  }

  const parseDateSafe = (value?: string | null): Date | null => {
    if (!value) return null
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const formatRange = (from: string, to?: string | null) => {
    const fromDate = parseDateSafe(from)
    const toDate = parseDateSafe(to || undefined)

    if (!fromDate && !toDate) {
      return "-"
    }

    // Single-day or invalid 'to' – show only one date
    if (!toDate || !to || (fromDate && toDate && fromDate.getTime() === toDate.getTime())) {
      const d = fromDate || toDate!
      return format(d, "EEE, MMM dd, yyyy")
    }

    // Proper range
    return `${format(fromDate || toDate!, "MMM dd, yyyy")} – ${format(
      toDate,
      "MMM dd, yyyy"
    )}`
  }

  const formatRequestedAt = (requestedAt?: string | null) => {
    if (!requestedAt) return "-"
    const dt = new Date(requestedAt)
    return format(dt, "dd MMM yyyy, hh:mm a")
  }

  const renderDecisionSummary = (wfh: WfhRequest) => {
    if (wfh.status === "PENDING") {
      return (
        <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
          <span className="font-medium">Requested At:</span>
          <span>{formatRequestedAt(wfh.applied_at)}</span>
        </div>
      )
    }

    if (!wfh.approved_at) return "-"

    const approver = employees.find((e) => e.id === wfh.approved_by)
    const by = approver ? approver.name : `ID: ${wfh.approved_by}`
    const role = wfh.approved_role || ""
    const at = format(new Date(wfh.approved_at), "dd/MM/yyyy HH:mm")
    const remark = wfh.approval_remark || ""

    return (
      <div className="flex flex-col gap-1 text-[11px] leading-snug min-w-[150px]">
        <div className="font-semibold text-foreground flex items-center gap-1.5">
          <span className={wfh.status === "APPROVED" ? "text-green-600" : "text-red-600"}>
            {wfh.status === "APPROVED" ? "Approved" : "Rejected"}
          </span>
          <span className="text-muted-foreground font-normal">by</span>
          <span className="truncate max-w-[80px]" title={by}>{by}</span>
          {role && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-muted/50">
              {role}
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground/80">
          <span className="font-medium">At:</span> {at}
        </div>
        {remark && (
          <div className="mt-0.5 text-foreground italic truncate max-w-[150px]" title={remark}>
            <span className="font-semibold not-italic text-muted-foreground mr-1">Remark:</span>
            {remark}
          </div>
        )}
      </div>
    )
  }

  const canActOnRequest = (wfh: WfhRequest) => {
    if (!user) return false

    // MD / VP / HR / ADMIN: can act on any request they see
    if (user.role === "MD" || user.role === "VP" || user.role === "HR" || user.role === "ADMIN") return true

    const emp = employees.find((e) => e.id === wfh.employee_id)
    if (!emp) return false

    // MANAGER and other team roles: only direct reports
    return emp.reporting_manager_id === user.id
  }

  const filteredRequests =
    statusFilter === "ALL"
      ? wfhRequests
      : wfhRequests.filter((w) => w.status === statusFilter)

  const handleOpenApprove = (wfh: WfhRequest) => {
    setSelectedWfh(wfh)
    setRemarks("")
    setApproveOpen(true)
  }

  const handleConfirmApprove = async () => {
    if (!selectedWfh) return
    setSubmittingId(selectedWfh.id)
    try {
      const body = remarks.trim() ? { remarks: remarks.trim() } : {}
      await api.post(`/api/v1/wfh/${selectedWfh.id}/approve`, body)
      toast({
        title: "WFH approved",
        description: "WFH request approved successfully.",
      })
      setApproveOpen(false)
      setSelectedWfh(null)
      setRemarks("")
      // Notify other dashboards (e.g. WFH balances) to refresh
      window.dispatchEvent(new Event("wfh-action-done"))
      await fetchWfh()
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 403) {
          toast({
            variant: "destructive",
            title: "Not authorized",
            description: "Only reporting manager or HR can approve this request",
          })
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: err.data.detail || "Failed to approve WFH request",
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to approve WFH request",
        })
      }
    } finally {
      setSubmittingId(null)
    }
  }

  const handleOpenReject = (wfh: WfhRequest) => {
    setSelectedWfh(wfh)
    setRemarks("")
    setRejectOpen(true)
  }

  const handleConfirmReject = async () => {
    if (!selectedWfh) return
    setSubmittingId(selectedWfh.id)
    try {
      // If backend accepts remarks, send them; otherwise send empty body
      const body = remarks.trim()
        ? { remarks: remarks.trim() }
        : {}
      await api.post(`/api/v1/wfh/${selectedWfh.id}/reject`, body)
      toast({
        title: "WFH rejected",
        description: "WFH request rejected successfully.",
      })
      setRejectOpen(false)
      setSelectedWfh(null)
      setRemarks("")
      window.dispatchEvent(new Event("wfh-action-done"))
      await fetchWfh()
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 403) {
          toast({
            variant: "destructive",
            title: "Not authorized",
            description: "Only reporting manager or HR can approve this request",
          })
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: err.data.detail || "Failed to reject WFH request",
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to reject WFH request",
        })
      }
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <PageContainer
      title="WFH Approvals"
      description="Review and approve or reject Work From Home requests."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground">
              Manage WFH requests for your team by status.
            </p>
          </div>
          <div className="flex items-center gap-3">
              {/* Department filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Department</span>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={filters.department_id != null ? String(filters.department_id) : "all"}
                  onChange={(e) => {
                    const v = e.target.value === "all" ? undefined : parseInt(e.target.value, 10)
                    // Reset employee filter when department changes
                    setFilters((f) => ({ ...f, department_id: v, employee_id: undefined }))
                  }}
                  disabled={loading}
                >
                  <option value="all">All</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              {/* Employee filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Employee</span>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm max-w-[220px]"
                  value={filters.employee_id != null ? String(filters.employee_id) : "all"}
                  onChange={(e) => {
                    const v = e.target.value === "all" ? undefined : parseInt(e.target.value, 10)
                    setFilters((f) => ({ ...f, employee_id: v }))
                  }}
                  disabled={loading}
                >
                  <option value="all">All</option>
                  {employees
                    .filter((e) => (filters.department_id ? e.department_id === filters.department_id : true))
                    .map((e) => (
                      <option key={e.id} value={e.id}>{e.name} ({e.emp_code})</option>
                    ))}
                </select>
              </div>
              {/* Date range */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">From</span>
                <input
                  type="date"
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={filters.from ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                  disabled={loading}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">To</span>
                <input
                  type="date"
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={filters.to ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                  disabled={loading}
                />
              </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status</span>
              {/* Simple status filter */}
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as "ALL" | WfhStatus)
                  // refresh list on filter change
                  setTimeout(() => { fetchWfh() }, 0)
                }}
                disabled={loading}
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchWfh}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : apiError ? (
              <EmptyState
                icon={X}
                title="Failed to load WFH requests"
                description={apiError}
              />
            ) : wfhRequests.length === 0 ? (
              <EmptyState
                icon={Check}
                title="No WFH requests"
                description="There are no WFH requests in the system yet."
              />
            ) : filteredRequests.length === 0 ? (
              <EmptyState
                icon={Check}
                title="No WFH requests for this status"
                description="Try selecting a different status or refreshing."
              />
            ) : (
              <div className="overflow-x-auto">
                <AnimatedTable>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Reporting Manager</TableHead>
                      <TableHead>Date / Range</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Decision (By / At / Remark)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((wfh, index) => (
                      <AnimatedTableRow key={wfh.id} delay={index * 0.03}>
                        <TableCell className="font-medium">
                          {getEmployeeLabel(wfh.employee_id)}
                        </TableCell>
                        <TableCell>{getDepartmentName(wfh.department_id, wfh.employee_id, wfh)}</TableCell>
                        <TableCell className="text-sm">
                          {(() => {
                            const emp = employees.find((e) => e.id === wfh.employee_id)
                            if (!emp?.reporting_manager_id) return "-"
                            const mgr = employees.find(
                              (e) => e.id === emp.reporting_manager_id
                            )
                            return mgr
                              ? `${mgr.name} (${mgr.emp_code})`
                              : `Manager #${emp.reporting_manager_id}`
                          })()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatRange(wfh.request_date, undefined)}
                        </TableCell>
                        <TableCell className="max-w-xs text-sm truncate" title={wfh.reason || ""}>
                          {wfh.reason || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              wfh.status === "PENDING" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                              wfh.status === "APPROVED" ? "bg-green-100 text-green-800 border-green-200" :
                              wfh.status === "REJECTED" ? "bg-red-100 text-red-800 border-red-200" :
                              "bg-gray-100 text-gray-800 border-gray-200"
                            }
                          >
                            {wfh.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {renderDecisionSummary(wfh)}
                        </TableCell>
                        <TableCell className="text-right">
                          {wfh.status === "PENDING" && canActOnRequest(wfh) ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenApprove(wfh)}
                                disabled={submittingId === wfh.id}
                              >
                                {submittingId === wfh.id ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 mr-1" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleOpenReject(wfh)}
                                disabled={submittingId === wfh.id}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </AnimatedTableRow>
                    ))}
                  </TableBody>
                </AnimatedTable>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approve dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve WFH request</DialogTitle>
            <DialogDescription>
              {selectedWfh
                ? `Approve WFH request for ${formatRange(
                    selectedWfh.request_date,
                    undefined
                  )}?`
                : "Approve this WFH request?"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Remarks (optional)</label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter approval remarks (optional)"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveOpen(false)}
              disabled={submittingId !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmApprove}
              disabled={submittingId !== null}
            >
              {submittingId !== null ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Approving…
                </>
              ) : (
                "Approve"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject WFH request</DialogTitle>
            <DialogDescription>
              {selectedWfh
                ? `Reject WFH request for ${formatRange(
                    selectedWfh.request_date,
                    undefined
                  )}?`
                : "Reject this WFH request?"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Remarks (optional)</label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter reason for rejection (optional)"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={submittingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={submittingId !== null}
            >
              {submittingId !== null ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Rejecting…
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

