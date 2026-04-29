"use client"

import { useEffect, useState } from "react"
import { api, ApiClientError } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { canAccessTeamModulesOrHr } from "@/lib/utils"
import { formatDateTimeIST } from "@/lib/format-attendance"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { format, parseISO, subDays } from "date-fns"
import { Calendar as CalendarIcon, FilterX } from "lucide-react"

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
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFrom, dateTo])

  const renderDecisionSummary = (it: Correction) => {
    if (it.status === "PENDING") return <span>—</span>

    const by = it.approved_by_name || `ID: ${it.approved_by}`
    const role = it.approved_role || ""
    const at = it.approved_at ? formatDateTimeIST(it.approved_at) : "-"
    const remark = it.admin_remarks || ""

    return (
      <div className="flex flex-col gap-1 text-[11px] leading-snug min-w-[150px]">
        <div className="font-semibold text-foreground flex items-center gap-1.5">
          <span className={it.status === "APPROVED" ? "text-green-600" : "text-red-600"}>
            {it.status === "APPROVED" ? "Approved" : "Rejected"}
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

  return (
    <>
      {!canAccessTeamModulesOrHr(user as any) ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="p-6 bg-muted/50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">You do not have access to Attendance Corrections.</p>
          </div>
        </div>
      ) : (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Attendance Corrections</h1>
            <p className="text-muted-foreground">Review correction requests</p>
          </div>
          <div className="flex gap-4 items-end">
            <div className="min-w-[150px]">
              <Label className="text-xs text-muted-foreground mb-1 block">From Date</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-8"
                />
                <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="min-w-[150px]">
              <Label className="text-xs text-muted-foreground mb-1 block">To Date</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-8"
                />
                <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDateFrom("")
                  setDateTo("")
                }}
                title="Clear filters"
              >
                <FilterX className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-[150px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="ALL">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="border rounded-lg bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Requested At</TableHead>
                <TableHead>Work Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Requested In</TableHead>
                <TableHead>Requested Out</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Decision (By / At / Remark)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{it.id}</TableCell>
                  <TableCell>{it.employee_name || it.employee_id}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {it.created_at ? formatDateTimeIST(it.created_at) : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {it.date ? format(parseISO(it.date), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell>{it.request_type}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {it.requested_punch_in ? formatDateTimeIST(it.requested_punch_in) : "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {it.requested_punch_out ? formatDateTimeIST(it.requested_punch_out) : "-"}
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate">{it.reason}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        it.status === "PENDING" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                        it.status === "APPROVED" ? "bg-green-100 text-green-800 border-green-200" :
                        it.status === "REJECTED" ? "bg-red-100 text-red-800 border-red-200" :
                        "bg-gray-100 text-gray-800 border-gray-200"
                      }
                    >
                      {it.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{renderDecisionSummary(it)}</TableCell>
                  <TableCell className="text-right">
                    {it.status === "PENDING" ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
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
                        }}>
                          Approve
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => { 
                          setSelected(it); 
                          setDialogMode("reject"); 
                        }}>
                          Reject
                        </Button>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={dialogMode !== null} onOpenChange={(o) => { 
          if (!o) { 
            setDialogMode(null); 
            setSelected(null); 
            setAdminRemarks(""); 
            setEditPunchIn("");
            setEditPunchOut("");
          } 
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{dialogMode === "approve" ? "Approve Request" : "Reject Request"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {dialogMode === "approve" && (
                <div className="grid grid-cols-2 gap-4">
                  {(selected?.request_type === "FORGOT_PUNCH_IN" || selected?.request_type === "MISSED_BOTH") && (
                    <div className="grid gap-2">
                      <Label>Corrected Punch-In</Label>
                      <Input
                        type="datetime-local"
                        value={editPunchIn}
                        onChange={(e) => setEditPunchIn(e.target.value)}
                      />
                    </div>
                  )}
                  {(selected?.request_type === "FORGOT_PUNCH_OUT" || selected?.request_type === "MISSED_BOTH") && (
                    <div className="grid gap-2">
                      <Label>Corrected Punch-Out</Label>
                      <Input
                        type="datetime-local"
                        value={editPunchOut}
                        onChange={(e) => setEditPunchOut(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="grid gap-2">
                <Label>Admin Remarks (optional)</Label>
                <Textarea 
                  value={adminRemarks} 
                  onChange={(e) => setAdminRemarks(e.target.value)} 
                  rows={4} 
                  placeholder="Enter remarks for the employee..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogMode(null); setSelected(null); setAdminRemarks(""); }} disabled={submitting}>Cancel</Button>
              <Button onClick={handleAction} disabled={submitting}>
                {dialogMode === "approve" ? "Approve" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      )}
    </>
  )
}
