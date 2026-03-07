"use client"

import { useEffect, useState } from "react"
import { api, ApiClientError } from "@/lib/api"
import { RequireRole } from "@/components/auth/RequireRole"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

type Correction = {
  id: number
  employee_id: number
  request_type: string
  date: string
  requested_punch_in?: string | null
  requested_punch_out?: string | null
  reason: string
  remarks?: string | null
  status: string
  approved_by?: number | null
  approved_at?: string | null
  admin_remarks?: string | null
}

export default function AttendanceCorrectionsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<Correction[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("PENDING")
  const [selected, setSelected] = useState<Correction | null>(null)
  const [adminRemarks, setAdminRemarks] = useState("")
  const [dialogMode, setDialogMode] = useState<"approve" | "reject" | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const query = statusFilter && statusFilter !== "ALL" ? `?status_filter=${statusFilter}` : ""
      const data = await api.get<Correction[]>(`/api/v1/attendance-corrections${query}`)
      setItems(data || [])
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
  }, [statusFilter])

  const handleAction = async () => {
    if (!selected || !dialogMode) return
    setSubmitting(true)
    try {
      const endpoint = `/api/v1/attendance-corrections/${selected.id}/${dialogMode}`
      await api.post<Correction>(endpoint, { admin_remarks: adminRemarks })
      toast({ title: "Success", description: `Request ${dialogMode}d` })
      setDialogMode(null)
      setSelected(null)
      setAdminRemarks("")
      await fetchItems()
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.data.detail || "Action failed" : "Unexpected error"
      toast({ variant: "destructive", title: "Error", description: msg })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RequireRole allowedRoles={["HR", "ADMIN"]}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Attendance Corrections</h1>
            <p className="text-muted-foreground">Review correction requests</p>
          </div>
          <div className="flex gap-4">
            <div className="min-w-[200px]">
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
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Requested In</TableHead>
                <TableHead>Requested Out</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{it.id}</TableCell>
                  <TableCell>{it.employee_id}</TableCell>
                  <TableCell>{it.date}</TableCell>
                  <TableCell>{it.request_type}</TableCell>
                  <TableCell>{it.requested_punch_in?.replace("T", " ") ?? "-"}</TableCell>
                  <TableCell>{it.requested_punch_out?.replace("T", " ") ?? "-"}</TableCell>
                  <TableCell className="max-w-[320px] truncate">{it.reason}</TableCell>
                  <TableCell>{it.status}</TableCell>
                  <TableCell className="text-right">
                    {it.status === "PENDING" ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelected(it); setDialogMode("approve"); }}>
                          Approve
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => { setSelected(it); setDialogMode("reject"); }}>
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

        <Dialog open={dialogMode !== null} onOpenChange={(o) => { if (!o) { setDialogMode(null); setSelected(null); setAdminRemarks(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dialogMode === "approve" ? "Approve Request" : "Reject Request"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2">
              <Label>Admin Remarks (optional)</Label>
              <Textarea value={adminRemarks} onChange={(e) => setAdminRemarks(e.target.value)} rows={4} />
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
    </RequireRole>
  )
}
