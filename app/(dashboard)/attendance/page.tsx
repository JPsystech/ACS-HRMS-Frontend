"use client"

import React, { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import {
  AdminAttendanceSessionDto,
  AdminSessionUpdateRequest,
  Employee,
  PunchGeo,
  Role,
} from "@/types/models"
import { formatDateTimeIST, formatWorkedHours } from "@/lib/format-attendance"
import { Button } from "@/components/ui/button"
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
import { Clock, Edit, Loader2, MapPin, AlertTriangle } from "lucide-react"
import { format, parseISO } from "date-fns"

const ADMIN_ATTENDANCE_ROLES: Role[] = ["HR", "ADMIN"]

const MIGRATION_HINT = "DB not migrated. Run alembic upgrade head."

function isMigrationError(err: unknown): boolean {
  if (err instanceof ApiClientError) {
    const d = String(err.data?.detail ?? "").toLowerCase()
    return err.status === 500 && (d.includes("attendance_sessions") || d.includes("alembic") || d.includes("run alembic"))
  }
  return false
}

/** Normalize geo to PunchGeo shape (API may return Record<string, unknown>) */
function asPunchGeo(geo: PunchGeo | Record<string, unknown> | null | undefined): PunchGeo | null {
  if (geo == null || typeof geo !== "object") return null
  const g = geo as Record<string, unknown>
  return {
    lat: typeof g.lat === "number" ? g.lat : undefined,
    lng: typeof g.lng === "number" ? g.lng : undefined,
    accuracy: typeof g.accuracy === "number" ? g.accuracy : undefined,
    address: typeof g.address === "string" ? g.address : null,
    captured_at: typeof g.captured_at === "string" ? g.captured_at : null,
    is_mocked: typeof g.is_mocked === "boolean" ? g.is_mocked : null,
    source: typeof g.source === "string" ? g.source : null,
  }
}

function PunchLocationCell({
  geo,
  popoverId,
  isPopoverOpen,
  onTogglePopover,
}: {
  geo: AdminAttendanceSessionDto["punch_in_geo"] | AdminAttendanceSessionDto["punch_out_geo"]
  popoverId: string
  isPopoverOpen: boolean
  onTogglePopover: (id: string) => void
}) {
  const normalized = asPunchGeo(geo ?? null)
  const lat = normalized?.lat
  const lng = normalized?.lng
  const address = normalized?.address?.trim()
  const accuracy = normalized?.accuracy
  const hasCoords = typeof lat === "number" && typeof lng === "number"
  const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${lat},${lng}` : null

  if (!normalized || !hasCoords) {
    return <span className="text-muted-foreground">No location</span>
  }

  const primaryText = address && address.length > 0 ? address : `${lat}, ${lng}`
  const displayText = primaryText.length > 28 ? primaryText.slice(0, 28) + "…" : primaryText

  return (
    <div className="relative flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm truncate max-w-[200px] inline-block"
            title={`Open in Google Maps: ${lat}, ${lng}`}
          >
            {displayText}
          </a>
        ) : (
          <span className="text-sm truncate max-w-[200px]">{displayText}</span>
        )}
        {typeof accuracy === "number" && accuracy > 0 && (
          <Badge variant="outline" className="text-xs font-normal shrink-0">
            ±{accuracy}m
          </Badge>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onTogglePopover(isPopoverOpen ? "" : popoverId)
          }}
          className="text-muted-foreground hover:text-foreground p-0.5 rounded"
          title="Show details"
          aria-label="Show location details"
        >
          <MapPin className="h-3.5 w-3.5" />
        </button>
      </div>
      {isPopoverOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => onTogglePopover("")}
          />
          <div className="absolute left-0 top-full mt-1 z-50 min-w-[220px] rounded-md border bg-popover p-3 text-sm shadow-md">
            <div className="space-y-1.5">
              {normalized.is_mocked === true && (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Mock location</span>
                </div>
              )}
              <p><span className="text-muted-foreground">Lat:</span> {lat}</p>
              <p><span className="text-muted-foreground">Lng:</span> {lng}</p>
              {typeof accuracy === "number" && <p><span className="text-muted-foreground">Accuracy:</span> ±{accuracy}m</p>}
              {normalized.captured_at && (
                <p><span className="text-muted-foreground">Captured:</span> {formatDateTimeIST(normalized.captured_at)}</p>
              )}
              {normalized.source && <p><span className="text-muted-foreground">Source:</span> {normalized.source}</p>}
              {address && <p className="text-muted-foreground truncate" title={address}>{address}</p>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function AttendancePage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [sessions, setSessions] = useState<AdminAttendanceSessionDto[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("today")
  const [filters, setFilters] = useState({
    department_id: undefined as number | undefined,
    status: undefined as string | undefined,
    q: "",
    from_date: "",
    to_date: "",
    employee_id: undefined as number | undefined,
  })
  const [editOpen, setEditOpen] = useState(false)
  const [forceCloseOpen, setForceCloseOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<AdminAttendanceSessionDto | null>(null)
  const [editForm, setEditForm] = useState<AdminSessionUpdateRequest>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string>("")

  const canUseAdminAttendance = user?.role && ADMIN_ATTENDANCE_ROLES.includes(user.role)
  const canUseAdminAsManager = user?.role === "MANAGER"
  const showAdminUi = canUseAdminAttendance || canUseAdminAsManager

  useEffect(() => {
    if (user) {
      fetchEmployees()
    }
  }, [user])

  useEffect(() => {
    if (user && showAdminUi) {
      fetchSessions()
    }
  }, [user, activeTab, filters, showAdminUi])

  const fetchEmployees = async () => {
    try {
      if (user?.role === "HR" || user?.role === "ADMIN") {
        const data = await api.get<Employee[]>("/api/v1/employees")
        setEmployees(data || [])
      } else if (user?.role === "MANAGER") {
        const data = await api.get<Employee[]>("/api/v1/employees/my-team")
        setEmployees(data || [])
      } else {
        setEmployees([])
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err)
      if (user?.role === "HR" || user?.role === "ADMIN") {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch employees",
        })
      }
      setEmployees([])
    }
  }

  const fetchSessions = async () => {
    setLoading(true)
    setApiError("")
    try {
      if (activeTab === "today") {
        const params = new URLSearchParams()
        if (filters.department_id != null) params.append("department_id", String(filters.department_id))
        if (filters.status) params.append("status", filters.status)
        if (filters.q.trim()) params.append("q", filters.q.trim())
        const queryString = params.toString()
        const data = await api.get<AdminAttendanceSessionDto[]>(
          `/api/v1/admin/attendance/today${queryString ? `?${queryString}` : ""}`
        )
        setSessions(Array.isArray(data) ? data : [])
      } else if (activeTab === "missing") {
        const params = new URLSearchParams()
        params.append("status", "OPEN")
        if (filters.department_id != null) params.append("department_id", String(filters.department_id))
        if (filters.q.trim()) params.append("q", filters.q.trim())
        const queryString = params.toString()
        const data = await api.get<AdminAttendanceSessionDto[]>(
          `/api/v1/admin/attendance/today${queryString ? `?${queryString}` : ""}`
        )
        const openOnly = (Array.isArray(data) ? data : []).filter((s) => s.status === "OPEN")
        setSessions(openOnly)
      } else {
        const from = filters.from_date || format(new Date(), "yyyy-MM-dd")
        const to = filters.to_date || format(new Date(), "yyyy-MM-dd")
        const params = new URLSearchParams({ from, to })
        if (filters.employee_id != null) params.append("employee_id", String(filters.employee_id))
        if (filters.department_id != null) params.append("department_id", String(filters.department_id))
        if (filters.status) params.append("status", filters.status)
        const res = await api.get<{ items: AdminAttendanceSessionDto[]; total: number }>(
          `/api/v1/admin/attendance?${params.toString()}`
        )
        setSessions(res.items || [])
      }
    } catch (err) {
      if (isMigrationError(err)) {
        setApiError(MIGRATION_HINT)
        toast({
          variant: "destructive",
          title: "Database not ready",
          description: MIGRATION_HINT,
        })
      } else if (err instanceof ApiClientError) {
        const errorMsg = err.data.detail || "Failed to fetch attendance"
        setApiError(errorMsg)
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMsg,
        })
      } else {
        setApiError("An unexpected error occurred")
      }
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (session: AdminAttendanceSessionDto) => {
    setSelectedSession(session)
    setEditForm({
      punch_in_at: session.punch_in_at ? format(parseISO(session.punch_in_at), "yyyy-MM-dd'T'HH:mm") : undefined,
      punch_out_at: session.punch_out_at ? format(parseISO(session.punch_out_at), "yyyy-MM-dd'T'HH:mm") : undefined,
      status: session.status,
      remarks: session.remarks ?? undefined,
    })
    setEditOpen(true)
  }

  const handleForceClose = (session: AdminAttendanceSessionDto) => {
    setSelectedSession(session)
    setForceCloseOpen(true)
  }

  const handleSubmitEdit = async () => {
    if (!selectedSession) return
    setSubmitting(true)
    try {
      const body: AdminSessionUpdateRequest = {}
      if (editForm.punch_in_at) body.punch_in_at = editForm.punch_in_at
      if (editForm.punch_out_at) body.punch_out_at = editForm.punch_out_at
      if (editForm.status) body.status = editForm.status
      if (editForm.remarks !== undefined) body.remarks = editForm.remarks
      await api.patch<AdminAttendanceSessionDto>(`/api/v1/admin/attendance/${selectedSession.id}`, body)
      toast({ title: "Success", description: "Attendance updated" })
      setEditOpen(false)
      setSelectedSession(null)
      fetchSessions()
    } catch (err) {
      if (isMigrationError(err)) {
        toast({ variant: "destructive", title: "Database not ready", description: MIGRATION_HINT })
      } else if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to update",
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmForceClose = async () => {
    if (!selectedSession) return
    setSubmitting(true)
    try {
      await api.post(`/api/v1/admin/attendance/${selectedSession.id}/force-close`, {})
      toast({ title: "Success", description: "Session force closed" })
      setForceCloseOpen(false)
      setSelectedSession(null)
      fetchSessions()
    } catch (err) {
      if (isMigrationError(err)) {
        toast({ variant: "destructive", title: "Database not ready", description: MIGRATION_HINT })
      } else if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to force close",
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const isEmployeeOnly = user?.role === "EMPLOYEE" || (!showAdminUi && !!user)

  useEffect(() => {
    if (isEmployeeOnly && user) {
      fetchMyAttendance()
    }
  }, [isEmployeeOnly, user])

  const [myToday, setMyToday] = useState<AdminAttendanceSessionDto | null>(null)
  const [mySessions, setMySessions] = useState<AdminAttendanceSessionDto[]>([])
  const [myLoading, setMyLoading] = useState(false)

  const fetchMyAttendance = async () => {
    setMyLoading(true)
    try {
      const [todayRes, listRes] = await Promise.all([
        api.get<AdminAttendanceSessionDto | null>("/api/v1/attendance/today"),
        api.get<{ items: AdminAttendanceSessionDto[]; total: number }>(
          `/api/v1/attendance/my?from=${format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd")}&to=${format(new Date(), "yyyy-MM-dd")}`
        ),
      ])
      setMyToday(todayRes ?? null)
      setMySessions(listRes?.items ?? [])
    } catch (err) {
      console.error("Failed to fetch my attendance:", err)
      if (isMigrationError(err)) {
        toast({ variant: "destructive", title: "Database not ready", description: MIGRATION_HINT })
      }
      setMyToday(null)
      setMySessions([])
    } finally {
      setMyLoading(false)
    }
  }

  return (
    <PageContainer
      title="Attendance"
      description="View and manage punch in/out sessions"
    >
      {isEmployeeOnly ? (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Today</h3>
            {myLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : myToday ? (
              <div className="rounded-lg border p-4 space-y-1">
                <p>Punch In: {formatDateTimeIST(myToday.punch_in_at)}</p>
                <p>Punch Out: {myToday.punch_out_at ? formatDateTimeIST(myToday.punch_out_at) : "—"}</p>
                <p>Status: <Badge>{myToday.status}</Badge></p>
              </div>
            ) : (
              <p className="text-muted-foreground">No punch-in for today yet.</p>
            )}
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">My sessions (this month)</h3>
            {myLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : mySessions.length === 0 ? (
              <EmptyState icon={Clock} title="No sessions" description="No attendance records in this period." />
            ) : (
              <AttendanceTable
                sessions={mySessions}
                onEdit={() => {}}
                onForceClose={() => {}}
                showActions={false}
              />
            )}
          </div>
        </div>
      ) : (
      <>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="missing">Missing Punch-out</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {showAdminUi && (
          <div className="mt-4 flex flex-wrap gap-4">
            {activeTab !== "reports" && (
              <>
                <div className="flex items-center gap-2">
                  <Label className="text-muted-foreground whitespace-nowrap">Status</Label>
                  <Select
                    value={filters.status ?? "all"}
                    onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? undefined : v }))}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                      <SelectItem value="AUTO_CLOSED">Auto closed</SelectItem>
                      <SelectItem value="SUSPICIOUS">Suspicious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(user?.role === "HR" || user?.role === "ADMIN") && employees.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Label className="text-muted-foreground whitespace-nowrap">Department</Label>
                    <Select
                      value={filters.department_id?.toString() ?? "all"}
                      onValueChange={(v) =>
                        setFilters((f) => ({ ...f, department_id: v === "all" ? undefined : parseInt(v, 10) }))
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All departments</SelectItem>
                        {Array.from(new Set(employees.map((e) => e.department_id).filter(Boolean))).map((deptId) => {
                          const emp = employees.find((e) => e.department_id === deptId)
                          return (
                            <SelectItem key={deptId} value={String(deptId)}>
                              {emp?.department_name ?? `Dept ${deptId}`}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search name or code"
                    value={filters.q}
                    onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                    className="max-w-[200px]"
                  />
                </div>
              </>
            )}
            {activeTab === "reports" && (
              <>
                <div className="flex items-center gap-2">
                  <Label>From</Label>
                  <Input
                    type="date"
                    value={filters.from_date}
                    onChange={(e) => setFilters((f) => ({ ...f, from_date: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>To</Label>
                  <Input
                    type="date"
                    value={filters.to_date}
                    onChange={(e) => setFilters((f) => ({ ...f, to_date: e.target.value }))}
                  />
                </div>
                {(user?.role === "HR" || user?.role === "ADMIN") && employees.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Label>Employee</Label>
                    <Select
                      value={filters.employee_id?.toString() ?? "all"}
                      onValueChange={(v) =>
                        setFilters((f) => ({ ...f, employee_id: v === "all" ? undefined : parseInt(v, 10) }))
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={String(emp.id)}>
                            {emp.name} ({emp.emp_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Label>Status</Label>
                  <Select
                    value={filters.status ?? "all"}
                    onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? undefined : v }))}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                      <SelectItem value="AUTO_CLOSED">Auto closed</SelectItem>
                      <SelectItem value="SUSPICIOUS">Suspicious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        )}

        <TabsContent value="today" className="mt-4">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <AttendanceTable
              sessions={sessions}
              onEdit={handleEdit}
              onForceClose={handleForceClose}
              showActions={showAdminUi}
            />
          )}
        </TabsContent>
        <TabsContent value="missing" className="mt-4">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <AttendanceTable
              sessions={sessions}
              onEdit={handleEdit}
              onForceClose={handleForceClose}
              showActions={showAdminUi}
            />
          )}
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <AttendanceTable
              sessions={sessions}
              onEdit={handleEdit}
              onForceClose={handleForceClose}
              showActions={showAdminUi}
            />
          )}
        </TabsContent>
      </Tabs>

      {apiError && (
        <p className="mt-2 text-sm text-destructive">{apiError}</p>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit session</DialogTitle>
            <DialogDescription>Update punch in/out times, status, or remarks.</DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div>
                <Label>Punch In</Label>
                <Input
                  type="datetime-local"
                  value={editForm.punch_in_at ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, punch_in_at: e.target.value }))}
                />
              </div>
              <div>
                <Label>Punch Out</Label>
                <Input
                  type="datetime-local"
                  value={editForm.punch_out_at ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, punch_out_at: e.target.value }))}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={editForm.status ?? "CLOSED"}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as AdminAttendanceSessionDto["status"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="AUTO_CLOSED">Auto closed</SelectItem>
                    <SelectItem value="SUSPICIOUS">Suspicious</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Remarks</Label>
                <Textarea
                  value={editForm.remarks ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, remarks: e.target.value }))}
                  placeholder="Optional remarks"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitEdit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={forceCloseOpen} onOpenChange={setForceCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force close session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set punch-out to now and mark the session as AUTO_CLOSED. The employee will see this as a
              system-closed session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmForceClose} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Force close"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
      )}
    </PageContainer>
  )
}

function AttendanceTable({
  sessions,
  onEdit,
  onForceClose,
  showActions,
}: {
  sessions: AdminAttendanceSessionDto[]
  onEdit: (s: AdminAttendanceSessionDto) => void
  onForceClose: (s: AdminAttendanceSessionDto) => void
  showActions: boolean
}) {
  const [locationPopover, setLocationPopover] = useState<string>("")

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No sessions"
        description="No attendance sessions match the current filters."
      />
    )
  }
  return (
    <AnimatedTable>
      <TableHeader>
        <TableHead>Employee</TableHead>
        <TableHead>Department</TableHead>
        <TableHead>Punch In</TableHead>
        <TableHead>Punch In Location</TableHead>
        <TableHead>Punch Out</TableHead>
        <TableHead>Punch Out Location</TableHead>
        <TableHead>Worked</TableHead>
        <TableHead>Status</TableHead>
        {showActions && <TableHead className="text-right">Actions</TableHead>}
      </TableHeader>
      <TableBody>
        {sessions.map((s) => (
          <AnimatedTableRow key={s.id}>
            <TableCell className="font-medium">{s.employee_name ?? `#${s.employee_id}`}</TableCell>
            <TableCell>{s.department_name ?? "—"}</TableCell>
            <TableCell>{formatDateTimeIST(s.punch_in_at)}</TableCell>
            <TableCell>
              <PunchLocationCell
                geo={s.punch_in_geo}
                popoverId={`in-${s.id}`}
                isPopoverOpen={locationPopover === `in-${s.id}`}
                onTogglePopover={setLocationPopover}
              />
            </TableCell>
            <TableCell>
              {s.punch_out_at ? (
                formatDateTimeIST(s.punch_out_at)
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">—</span>
                  {s.status === "OPEN" && (
                    <Badge variant="outline" className="text-xs font-normal">Live</Badge>
                  )}
                </span>
              )}
            </TableCell>
            <TableCell>
              <PunchLocationCell
                geo={s.punch_out_geo}
                popoverId={`out-${s.id}`}
                isPopoverOpen={locationPopover === `out-${s.id}`}
                onTogglePopover={setLocationPopover}
              />
            </TableCell>
            <TableCell>{formatWorkedHours(s.worked_minutes)}</TableCell>
            <TableCell>
              <Badge variant={s.status === "OPEN" ? "default" : "secondary"}>{s.status}</Badge>
            </TableCell>
            {showActions && (
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onEdit(s)}>
                  <Edit className="h-4 w-4" />
                </Button>
                {s.status === "OPEN" && (
                  <Button variant="ghost" size="sm" onClick={() => onForceClose(s)}>
                    Force close
                  </Button>
                )}
              </TableCell>
            )}
          </AnimatedTableRow>
        ))}
      </TableBody>
    </AnimatedTable>
  )
}
