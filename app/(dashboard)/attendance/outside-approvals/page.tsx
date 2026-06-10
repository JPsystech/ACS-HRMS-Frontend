"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { AdminAttendanceSessionDto } from "@/types/models"
import { RequireRole } from "@/components/auth/RequireRole"
import { DebugPanel } from "@/components/debug/DebugPanel"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import {
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MapPin,
  Clock,
  RotateCcw,
  Eye,
  CalendarDays,
  ShieldAlert,
  Loader2,
  Navigation
} from "lucide-react"
import { format } from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function OutsideApprovalsPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()

  const [sessions, setSessions] = useState<AdminAttendanceSessionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string>("")

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("PENDING")

  // Modals
  const [viewSession, setViewSession] = useState<AdminAttendanceSessionDto | null>(null)
  const [actionSession, setActionSession] = useState<AdminAttendanceSessionDto | null>(null)
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)
  const [remarks, setRemarks] = useState("")

  useEffect(() => {
    if (user) {
      fetchApprovals()
    }
  }, [user])

  const fetchApprovals = async () => {
    setLoading(true)
    setApiError("")
    try {
      // Depending on backend implementation, we might need pagination or date filters. For now, fetch all pending outside approvals.
      const data = await api.get<{ items: AdminAttendanceSessionDto[]; total: number }>("/api/v1/attendance/outside-approvals")
      setSessions(data?.items || [])
    } catch (err) {
      if (err instanceof ApiClientError) {
        setApiError(err.data.detail || "Failed to fetch outside approvals")
      } else {
        setApiError("An unexpected error occurred")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleActionSubmit = async () => {
    if (!actionSession || !actionType) return

    if (actionType === "reject" && !remarks.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Remarks are mandatory for rejection.",
      })
      return
    }

    setSubmitting(true)
    try {
      const sessionId = (actionSession as any).session_id || actionSession.id;
      await api.post(`/api/v1/attendance/outside-approvals/${sessionId}/${actionType}`, {
        remarks: remarks.trim() || undefined
      })

      toast({
        title: "Success",
        description: `Punch has been successfully ${actionType}d.`,
      })

      setActionSession(null)
      setActionType(null)
      setRemarks("")
      setViewSession(null) // close view if open
      await fetchApprovals()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({ variant: "destructive", title: "Error", description: err.data.detail || `Failed to ${actionType} punch.` })
      } else {
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const filteredSessions = sessions.filter(session => {
    if (statusFilter !== "ALL" && session.outside_approval_status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const empName = (session.employee_name || "").toLowerCase()
      const reasonType = (session.outside_reason_type || "").toLowerCase()
      if (!empName.includes(q) && !reasonType.includes(q)) return false
    }
    return true
  })

  const pendingCount = sessions.filter(s => s.outside_approval_status === "PENDING").length
  const wfhCount = sessions.filter(s => s.outside_reason_type === "WFH").length

  return (
    <RequireRole allowedRoles={["ADMIN", "HR", "MANAGER"]}>
      <div className="space-y-6">
        {/* 1. Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-950 to-orange-800 p-8 shadow-xl">
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
            <ShieldAlert className="h-72 w-72 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 text-white">
              <h1 className="text-3xl font-bold tracking-tight">Outside Punch Approvals</h1>
              <p className="max-w-xl text-orange-200">
                Review and approve attendance punches recorded outside of assigned office locations.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => fetchApprovals()}
                className="bg-white/10 text-white hover:bg-white/20 font-bold rounded-xl shadow-sm px-6 h-12"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* 2. KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Approvals</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">WFH Requests</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{wfhCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Search and Filter */}
        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Filter Approvals</h3>
          </div>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-2 flex-1 w-full max-w-sm">
                <Label className="text-xs font-medium text-slate-500 uppercase">Search Employee/Reason</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-xl h-10 pl-9 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
              <div className="space-y-2 w-full max-w-xs">
                <Label className="text-xs font-medium text-slate-500 uppercase">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Error Banner */}
        {apiError && !loading && (
          <Card className="rounded-2xl border-red-200 bg-red-50 dark:bg-red-950/20 shadow-sm overflow-hidden backdrop-blur-sm">
            <div className="p-6 flex items-start gap-4">
              <div className="h-10 w-10 shrink-0 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 mt-1">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-1">Failed to load data</h3>
                <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
              </div>
            </div>
          </Card>
        )}

        {/* 5. Main Content Area */}
        {loading ? (
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm p-6">
            <Skeleton className="h-16 w-full rounded-xl mb-4" />
            <Skeleton className="h-16 w-full rounded-xl mb-4" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </Card>
        ) : filteredSessions.length === 0 ? (
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm p-12 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No outside punch approvals found</h3>
            <p className="text-slate-500 mb-6">You&apos;re all caught up!</p>
          </Card>
        ) : (
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <AnimatedTable>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60">
                  <TableRow className="hover:bg-transparent border-0">
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Employee</TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Date & Time</TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Reason</TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Location</TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session, index) => (
                    <AnimatedTableRow key={session.id} delay={index * 0.03} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                      <TableCell>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{session.employee_name || `Emp #${session.employee_id}`}</div>
                        <div className="text-xs text-slate-500">{session.department_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-700 dark:text-slate-300">{format(new Date(session.work_date), "MMM d, yyyy")}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {(session as any).punch_in_time || session.punch_in_at ? format(new Date((session as any).punch_in_time || session.punch_in_at), "h:mm a") : "--"}
                          {(session as any).punch_out_time || session.punch_out_at ? ` - ${format(new Date((session as any).punch_out_time || session.punch_out_at), "h:mm a")}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-300 mb-1">
                          {session.outside_reason_type || "N/A"}
                        </Badge>
                        <div className="text-xs text-slate-500 line-clamp-1 max-w-[200px]" title={session.outside_reason_details || ""}>
                          {session.outside_reason_details || "No details provided"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                          <Navigation className="h-3 w-3 text-red-500" />
                          <span className="font-mono">{session.distance_from_office ? `${Math.round(session.distance_from_office)}m away` : 'Unknown'}</span>
                        </div>
                        {session.is_wfh_punch && (
                          <Badge variant="outline" className="mt-1 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400 px-1 py-0 text-[10px]">
                            WFH Linked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {session.outside_approval_status === "PENDING" && <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 shadow-none border border-orange-200">Pending</Badge>}
                        {session.outside_approval_status === "APPROVED" && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 shadow-none border border-emerald-200">Approved</Badge>}
                        {session.outside_approval_status === "REJECTED" && <Badge className="bg-red-100 text-red-700 hover:bg-red-100 shadow-none border border-red-200">Rejected</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewSession(session)}
                            className="rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {session.outside_approval_status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setActionSession(session); setActionType("approve"); setRemarks(""); }}
                                className="rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setActionSession(session); setActionType("reject"); setRemarks(""); }}
                                className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                              >
                                Reject
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
          </Card>
        )}

        {/* View Details Dialog */}
        <Dialog open={!!viewSession} onOpenChange={(o) => !o && setViewSession(null)}>
          <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden bg-white/95 dark:bg-slate-950/95 shadow-2xl border-slate-200/60 dark:border-slate-800/60">
            {viewSession && (
              <>
                <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold">Punch Location Details</DialogTitle>
                      <DialogDescription className="mt-1 text-slate-500">
                        {viewSession.employee_name} • {format(new Date(viewSession.work_date), "MMM d, yyyy")}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500 uppercase">Punch In</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {viewSession.punch_in_at ? format(new Date(viewSession.punch_in_at), "h:mm a") : "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500 uppercase">Punch Out</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {viewSession.punch_out_at ? format(new Date(viewSession.punch_out_at), "h:mm a") : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50 rounded-xl">
                    <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-200 mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Outside Reason Details
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-medium text-orange-700/70 dark:text-orange-400/70 uppercase">Reason Type</span>
                        <p className="text-sm font-medium text-orange-900 dark:text-orange-200">{viewSession.outside_reason_type || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-orange-700/70 dark:text-orange-400/70 uppercase">Explanation</span>
                        <p className="text-sm text-orange-800 dark:text-orange-300 bg-orange-100/50 dark:bg-orange-900/20 p-3 rounded-lg mt-1 whitespace-pre-wrap">
                          {viewSession.outside_reason_details || "No explanation provided."}
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <span className="text-xs font-medium text-orange-700/70 dark:text-orange-400/70 uppercase">Distance</span>
                          <p className="text-sm font-mono text-orange-900 dark:text-orange-200">
                            {viewSession.distance_from_office ? `${Math.round(viewSession.distance_from_office)}m` : 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-orange-700/70 dark:text-orange-400/70 uppercase">GPS Accuracy</span>
                          <p className="text-sm font-mono text-orange-900 dark:text-orange-200">
                            {viewSession.gps_accuracy ? `±${Math.round(viewSession.gps_accuracy)}m` : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      {viewSession.punch_in_geo && (
                        <div className="pt-2 border-t border-orange-200/50 dark:border-orange-900/50">
                          <a
                            href={`https://www.google.com/maps?q=${(viewSession.punch_in_geo as any).lat},${(viewSession.punch_in_geo as any).lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <MapPin className="h-4 w-4 mr-1" />
                            View on Google Maps
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {viewSession.outside_approval_status !== "PENDING" && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Approval Details</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium">Status:</span> {viewSession.outside_approval_status}</p>
                      {viewSession.outside_approval_remarks && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2"><span className="font-medium">Remarks:</span> {viewSession.outside_approval_remarks}</p>
                      )}
                    </div>
                  )}

                </div>
                <DialogFooter className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <Button onClick={() => setViewSession(null)} className="rounded-xl border-slate-200" variant="outline">
                    Close
                  </Button>
                  {viewSession.outside_approval_status === "PENDING" && (
                    <>
                      <Button
                        onClick={() => { setActionSession(viewSession); setActionType("approve"); setRemarks(""); }}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => { setActionSession(viewSession); setActionType("reject"); setRemarks(""); }}
                        className="rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Action Confirmation Dialog */}
        <AlertDialog open={!!actionType} onOpenChange={(o) => !o && setActionType(null)}>
          <AlertDialogContent className="rounded-2xl border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/95 shadow-2xl p-0 overflow-hidden max-w-md">
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`h-16 w-16 rounded-full flex items-center justify-center ${actionType === 'approve' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-500' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500'}`}>
                  {actionType === 'approve' ? <CheckCircle className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
                </div>
                <div>
                  <AlertDialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {actionType === 'approve' ? 'Approve Punch?' : 'Reject Punch?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-500">
                    {actionType === 'approve'
                      ? "Are you sure you want to approve this outside punch? The employee's attendance will be marked as normal."
                      : "Are you sure you want to reject this outside punch? The session will be flagged as rejected."}
                  </AlertDialogDescription>
                </div>
              </div>

              <div className="space-y-2 mt-4 text-left">
                <Label htmlFor="remarks" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Remarks {actionType === 'reject' && <span className="text-red-500">*</span>}
                </Label>
                <Textarea
                  id="remarks"
                  placeholder={actionType === 'approve' ? "Optional approval notes..." : "Reason for rejection is required..."}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="rounded-xl min-h-[100px] resize-none border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                />
              </div>
            </div>
            <AlertDialogFooter className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex-col sm:flex-row gap-3 sm:gap-0">
              <AlertDialogCancel disabled={submitting} className="rounded-xl border-slate-200 dark:border-slate-700 mt-0">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleActionSubmit}
                disabled={submitting}
                className={`rounded-xl shadow-sm text-white ${actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  actionType === 'approve' ? "Yes, Approve" : "Yes, Reject"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <DebugPanel />
      </div>
    </RequireRole>
  )
}
