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
  approved_at?: string | null
}

export default function WfhApprovalsPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [wfhRequests, setWfhRequests] = useState<WfhRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string>("")
  const [submittingId, setSubmittingId] = useState<number | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [selectedWfh, setSelectedWfh] = useState<WfhRequest | null>(null)
  const [rejectRemarks, setRejectRemarks] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | WfhStatus>("PENDING")

  useEffect(() => {
    if (user) {
      fetchLookups()
      fetchPendingWfh()
    }
  }, [user])

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

  const fetchPendingWfh = async () => {
    setLoading(true)
    setApiError("")
    try {
      const res = await api.get<{ items?: WfhRequest[]; total?: number }>(
        "/api/v1/wfh/my"
      )
      const items = Array.isArray(res?.items) ? res.items : []
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

  const getDepartmentName = (departmentId?: number | null) => {
    if (!departmentId) return "-"
    const dept = departments.find((d) => d.id === departmentId)
    return dept?.name || "-"
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

  const canActOnRequest = (wfh: WfhRequest) => {
    if (!user) return false
    if (user.role === "HR" || user.role === "ADMIN") return true
    const emp = employees.find((e) => e.id === wfh.employee_id)
    if (!emp) return false
    return emp.reporting_manager_id === user.id
  }

  const filteredRequests =
    statusFilter === "ALL"
      ? wfhRequests
      : wfhRequests.filter((w) => w.status === statusFilter)

  const handleApprove = async (wfh: WfhRequest) => {
    setSubmittingId(wfh.id)
    try {
      await api.post(`/api/v1/wfh/${wfh.id}/approve`, {})
      toast({
        title: "WFH approved",
        description: "WFH request approved successfully.",
      })
      // Notify other dashboards (e.g. WFH balances) to refresh
      window.dispatchEvent(new Event("wfh-action-done"))
      await fetchPendingWfh()
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
    setRejectRemarks("")
    setRejectOpen(true)
  }

  const handleConfirmReject = async () => {
    if (!selectedWfh) return
    setSubmittingId(selectedWfh.id)
    try {
      // If backend accepts remarks, send them; otherwise send empty body
      const body = rejectRemarks.trim()
        ? { remarks: rejectRemarks.trim() }
        : {}
      await api.post(`/api/v1/wfh/${selectedWfh.id}/reject`, body)
      toast({
        title: "WFH rejected",
        description: "WFH request rejected successfully.",
      })
      setRejectOpen(false)
      setSelectedWfh(null)
      setRejectRemarks("")
      window.dispatchEvent(new Event("wfh-action-done"))
      await fetchPendingWfh()
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status</span>
              {/* Simple status filter */}
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "ALL" | WfhStatus)
                }
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
              onClick={fetchPendingWfh}
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
                      <TableHead>Requested At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((wfh, index) => (
                      <AnimatedTableRow key={wfh.id} delay={index * 0.03}>
                        <TableCell className="font-medium">
                          {getEmployeeLabel(wfh.employee_id)}
                        </TableCell>
                        <TableCell>{getDepartmentName(wfh.department_id)}</TableCell>
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
                            variant={
                              wfh.status === "PENDING"
                                ? "secondary"
                                : wfh.status === "APPROVED"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {wfh.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatRequestedAt(wfh.applied_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          {wfh.status === "PENDING" && canActOnRequest(wfh) ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(wfh)}
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
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
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

