"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { DebugPanel } from "@/components/debug/DebugPanel"
import {
  CompoffRequest,
  CompoffRequestStatus,
  CompoffEarnRequest,
  CompoffActionRequest,
  Employee,
  CompoffBalance,
} from "@/types/models"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X, Loader2, Plus, Calendar } from "lucide-react"
import { format } from "date-fns"

export default function CompOffPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [requests, setRequests] = useState<CompoffRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [balance, setBalance] = useState<CompoffBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("all")
  const [filterEmployee, setFilterEmployee] = useState<number | undefined>(
    undefined
  )
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<CompoffRequest | null>(
    null
  )
  const [remarks, setRemarks] = useState("")
  const [formData, setFormData] = useState<CompoffEarnRequest>({
    worked_date: new Date().toISOString().split("T")[0],
    reason: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string>("")

  useEffect(() => {
    if (user) {
      fetchData()
      if (user.role !== "HR") {
        fetchBalance()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (user) {
      fetchRequests()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filterEmployee])

  const fetchData = async () => {
    if (user?.role === "HR") {
      // HR can see all employees
      try {
        const data = await api.get<Employee[]>("/api/v1/employees")
        setEmployees(data)
      } catch (err) {
        console.error("Failed to fetch employees:", err)
      }
    } else if (user?.role === "MANAGER") {
      // Manager sees only reportees
      try {
        const data = await api.get<Employee[]>("/api/v1/employees")
        const reportees = data.filter(
          (emp) => emp.reporting_manager_id === user.id
        )
        setEmployees(reportees)
      } catch (err) {
        console.error("Failed to fetch employees:", err)
      }
    }
  }

  const fetchBalance = async () => {
    try {
      const data = await api.get<CompoffBalance>("/api/v1/compoff/balance")
      setBalance(data)
    } catch (err) {
      console.error("Failed to fetch balance:", err)
    }
  }

  const fetchRequests = async () => {
    setLoading(true)
    setApiError("")
    try {
      // Use pending endpoint for pending tab (HR/Manager only)
      // Otherwise use my-requests which is role-scoped
      let endpoint =
        activeTab === "pending" &&
        (user?.role === "HR" || user?.role === "MANAGER")
          ? "/api/v1/compoff/pending"
          : "/api/v1/compoff/my-requests"

      const response = await api.get<{ items: CompoffRequest[]; total: number }>(
        endpoint
      )
      let items = response.items || []

      // Client-side filtering for status (if not using pending endpoint)
      if (activeTab !== "pending" && activeTab !== "all") {
        items = items.filter((item) => item.status === activeTab.toUpperCase())
      }
      // Filter by employee if selected
      if (filterEmployee) {
        items = items.filter((item) => item.employee_id === filterEmployee)
      }

      setRequests(items)
    } catch (err) {
      if (err instanceof ApiClientError) {
        const errorMsg = err.data.detail || "Failed to fetch comp-off requests"
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

  const handleRequest = () => {
    setFormData({
      worked_date: new Date().toISOString().split("T")[0],
      reason: "",
    })
    setRequestOpen(true)
  }

  const handleApprove = (request: CompoffRequest) => {
    setSelectedRequest(request)
    setRemarks("")
    setApproveOpen(true)
  }

  const handleReject = (request: CompoffRequest) => {
    setSelectedRequest(request)
    setRemarks("")
    setRejectOpen(true)
  }

  const handleSubmitRequest = async () => {
    if (!formData.worked_date) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Worked date is required",
      })
      return
    }

    setSubmitting(true)
    try {
      await api.post<CompoffRequest>("/api/v1/compoff/request", formData)
      toast({
        title: "Success",
        description: "Comp-off request submitted successfully",
      })
      setRequestOpen(false)
      setFormData({
        worked_date: new Date().toISOString().split("T")[0],
        reason: "",
      })
      await fetchRequests()
      if (user?.role !== "HR") {
        await fetchBalance()
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to submit comp-off request",
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

  const handleSubmitApprove = async () => {
    if (!selectedRequest) return

    setSubmitting(true)
    try {
      const data: CompoffActionRequest = {
        remarks: remarks || undefined,
      }
      await api.post<CompoffRequest>(
        `/api/v1/compoff/${selectedRequest.id}/approve`,
        data
      )
      toast({
        title: "Success",
        description: "Comp-off request approved successfully",
      })
      setApproveOpen(false)
      setSelectedRequest(null)
      setRemarks("")
      await fetchRequests()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to approve comp-off request",
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
    if (!selectedRequest) return

    setSubmitting(true)
    try {
      const data: CompoffActionRequest = {
        remarks: remarks || undefined,
      }
      await api.post<CompoffRequest>(
        `/api/v1/compoff/${selectedRequest.id}/reject`,
        data
      )
      toast({
        title: "Success",
        description: "Comp-off request rejected successfully",
      })
      setRejectOpen(false)
      setSelectedRequest(null)
      setRemarks("")
      await fetchRequests()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to reject comp-off request",
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

  const getEmployeeName = (employeeId: number) => {
    const emp = employees.find((e) => e.id === employeeId)
    if (emp) {
      return `${emp.name} (${emp.emp_code})`
    }
    // If employee not found, try to get from request data if available
    const request = requests.find((r) => r.employee_id === employeeId)
    if (request && (request as any).employee) {
      const empData = (request as any).employee
      return `${empData.name} (${empData.emp_code})`
    }
    return `Employee #${employeeId}`
  }

  const getStatusBadgeVariant = (status: CompoffRequestStatus) => {
    switch (status) {
      case "APPROVED":
        return "default"
      case "REJECTED":
        return "destructive"
      case "PENDING":
        return "secondary"
      default:
        return "outline"
    }
  }

  const canApproveReject = (request: CompoffRequest) => {
    if (request.status !== "PENDING") return false
    if (user?.role === "HR") return true
    if (user?.role === "MANAGER") {
      // Manager can approve only direct reportees
      const emp = employees.find((e) => e.id === request.employee_id)
      return emp?.reporting_manager_id === user?.id
    }
    return false
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Comp Off</h1>
          <p className="text-muted-foreground">Manage comp-off requests</p>
        </div>
        {user?.role !== "HR" && (
          <Button onClick={handleRequest}>
            <Plus className="h-4 w-4 mr-2" />
            Request Comp Off
          </Button>
        )}
      </div>

      {/* Balance Card (for non-HR users) */}
      {balance && user?.role !== "HR" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>My Comp Off Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{balance.available_days}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-2xl font-bold">{balance.credits}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Debits</p>
                <p className="text-2xl font-bold">{balance.debits}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {balance.expired_credits}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      {(user?.role === "HR" || user?.role === "MANAGER") && (
        <div className="mb-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Employee
              </Label>
              <Select
                value={filterEmployee?.toString() || "all"}
                onValueChange={(value) =>
                  setFilterEmployee(
                    value === "all" ? undefined : parseInt(value)
                  )
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
          </div>
        </div>
      )}

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
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center border rounded-lg p-12">
          <p className="text-lg text-muted-foreground mb-4">
            No comp-off requests found
          </p>
          {user?.role !== "HR" && (
            <Button onClick={handleRequest}>
              <Plus className="h-4 w-4 mr-2" />
              Request Comp Off
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                {(user?.role === "HR" || user?.role === "MANAGER") && (
                  <TableHead>Employee</TableHead>
                )}
                <TableHead>Worked Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">#{request.id}</TableCell>
                  {(user?.role === "HR" || user?.role === "MANAGER") && (
                    <TableCell>
                      {getEmployeeName(request.employee_id)}
                    </TableCell>
                  )}
                  <TableCell>
                    {request.worked_date
                      ? format(new Date(request.worked_date), "MMM dd, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>{request.reason || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(request.status)}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {request.requested_at
                      ? format(new Date(request.requested_at), "MMM dd, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canApproveReject(request) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(request)}
                            title="Approve"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReject(request)}
                            title="Reject"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Request Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Comp Off</DialogTitle>
            <DialogDescription>
              Request comp-off for a worked date (Sunday or holiday)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="worked-date">Worked Date *</Label>
              <Input
                id="worked-date"
                type="date"
                value={formData.worked_date}
                onChange={(e) =>
                  setFormData({ ...formData, worked_date: e.target.value })
                }
                required
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Must be a Sunday or holiday with valid attendance
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="Enter reason for comp-off request..."
                disabled={submitting}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRequestOpen(false)
                setFormData({
                  worked_date: new Date().toISOString().split("T")[0],
                  reason: "",
                })
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitRequest} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Comp Off Request</DialogTitle>
            <DialogDescription>
              Approve comp-off request #{selectedRequest?.id}
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
            <DialogTitle>Reject Comp Off Request</DialogTitle>
            <DialogDescription>
              Reject comp-off request #{selectedRequest?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reject-remarks">Remarks (Optional)</Label>
              <Textarea
                id="reject-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter rejection remarks..."
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
              disabled={submitting}
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

      {/* Debug Panel */}
      {user?.role === "HR" && <DebugPanel />}
    </div>
  )
}
