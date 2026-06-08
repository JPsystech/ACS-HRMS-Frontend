"use client"

import React, { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import {
  AdminAttendanceSessionDto,
  AdminSessionUpdateRequest,
  Employee,
  Department,
  PunchGeo,
  Role,
} from "@/types/models"
import { formatDateTimeIST, formatWorkedHours } from "@/lib/format-attendance"
import { canAccessTeamModules } from "@/lib/utils"
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
import { Card, CardContent } from "@/components/ui/card"
import { 
  Clock, 
  Edit, 
  Loader2, 
  MapPin, 
  AlertTriangle, 
  Plus, 
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  TimerReset,
  CalendarCheck,
  Building2,
  Filter,
  Search,
  RotateCcw,
  CalendarDays,
  ShieldAlert,
  Navigation,
  MapPinned,
  History,
  BadgeCheck,
  FileClock
} from "lucide-react"
import { format, parseISO, startOfYear } from "date-fns"

const ADMIN_ATTENDANCE_ROLES: Role[] = ["HR", "ADMIN"]
const SUMMARY_ROLES: Role[] = ["MANAGER", "VP", "MD", "HR", "ADMIN"]

const MIGRATION_HINT = "DB not migrated. Run alembic upgrade head."

function isMigrationError(err: unknown): boolean {
  if (err instanceof ApiClientError) {
    const d = String(err.data?.detail ?? "").toLowerCase()
    return err.status === 500 && (d.includes("attendance_sessions") || d.includes("alembic") || d.includes("run alembic"))
  }
  return false
}

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

function getInitials(name?: string | null) {
  if (!name) return "??"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "OPEN": return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-400"
    case "CLOSED": return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "AUTO_CLOSED": return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-400"
    case "SUSPICIOUS": return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-900/30 dark:text-orange-400"
    case "LEAVE_CONFLICT": return "border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-400"
    default: return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
  }
}

function getStatusLabel(status: string) {
  if (status === "LEAVE_CONFLICT") return "Conflict"
  if (status === "AUTO_CLOSED") return "Auto Closed"
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
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
    return <span className="text-sm font-medium text-slate-400 dark:text-slate-500">No location</span>
  }

  const primaryText = address && address.length > 0 ? address : `${lat}, ${lng}`
  const displayText = primaryText.length > 25 ? primaryText.slice(0, 25) + "…" : primaryText

  return (
    <div className="relative flex flex-col gap-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium hover:underline text-sm truncate max-w-[180px] inline-block transition-colors"
            title={`Open in Google Maps: ${lat}, ${lng}`}
          >
            {displayText}
          </a>
        ) : (
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{displayText}</span>
        )}
        
        {typeof accuracy === "number" && accuracy > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 shadow-none shrink-0 font-medium rounded">
            ±{accuracy}m
          </Badge>
        )}
        
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onTogglePopover(isPopoverOpen ? "" : popoverId)
          }}
          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-900/30 p-1 rounded-md transition-colors"
          title="Show details"
        >
          <Navigation className="h-3 w-3" />
        </button>
      </div>
      
      {normalized.is_mocked === true && (
        <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md self-start border border-amber-200 dark:border-amber-800/50">
          <AlertTriangle className="h-3 w-3" />
          MOCKED LOCATION
        </div>
      )}
      
      {isPopoverOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => onTogglePopover("")}
          />
          <div className="absolute left-0 top-full mt-2 z-50 min-w-[260px] rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 text-sm shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <MapPinned className="h-4 w-4 text-indigo-500" /> Location Details
            </h4>
            <div className="space-y-2.5">
              {normalized.is_mocked === true && (
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg text-xs font-semibold border border-amber-200 dark:border-amber-800/50">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Warning: Fake Location Detected
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Latitude</span> 
                  <span className="font-mono text-slate-900 dark:text-slate-100">{lat}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Longitude</span> 
                  <span className="font-mono text-slate-900 dark:text-slate-100">{lng}</span>
                </div>
              </div>
              {typeof accuracy === "number" && (
                <p className="text-xs flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Accuracy:</span> 
                  <span className="font-medium text-slate-900 dark:text-slate-100">±{accuracy} meters</span>
                </p>
              )}
              {normalized.captured_at && (
                <p className="text-xs flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Captured:</span> 
                  <span className="font-medium text-slate-900 dark:text-slate-100">{formatDateTimeIST(normalized.captured_at)}</span>
                </p>
              )}
              {normalized.source && (
                <p className="text-xs flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Source:</span> 
                  <span className="font-medium text-slate-900 dark:text-slate-100 uppercase">{normalized.source}</span>
                </p>
              )}
              {address && (
                <div className="pt-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Address:</span>
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">{address}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
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
  const [resolveOpen, setResolveOpen] = useState(false)
  const [selectedForResolve, setSelectedForResolve] = useState<AdminAttendanceSessionDto | null>(null)
  const [resolveRemarks, setResolveRemarks] = useState("")
  const [resolving, setResolving] = useState(false)
  const { toast } = useToast()

  const handleResolve = (s: AdminAttendanceSessionDto, action: "KEEP_LEAVE" | "REVOKE_LEAVE") => {
    setResolving(true)
    api.post(`/api/v1/admin/attendance/${s.id}/resolve-conflict`, {
      action,
      remarks: resolveRemarks
    }).then(() => {
      toast({ title: "Success", description: `Conflict resolved: ${action.replace("_", " ")}` })
      setResolveOpen(false)
      setSelectedForResolve(null)
      setResolveRemarks("")
      window.location.reload()
    }).catch((err) => {
      const msg = err instanceof ApiClientError ? err.data.detail || "Failed to resolve conflict" : "Failed to resolve conflict"
      toast({ variant: "destructive", title: "Error", description: msg })
    }).finally(() => {
      setResolving(false)
    })
  }

  if (sessions.length === 0) {
    return (
      <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden p-12 flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
          <Clock className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No sessions</h3>
        <p className="text-slate-500 max-w-md">No attendance sessions match the current filters.</p>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/60 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Attendance Session Register</h3>
          <p className="text-sm text-slate-500 mt-1">Punch-in/out sessions with location, worked hours and attendance status.</p>
        </div>
        <Badge variant="secondary" className="rounded-lg px-3 py-1 bg-slate-100 dark:bg-slate-800 font-medium whitespace-nowrap self-start sm:self-auto text-slate-600 dark:text-slate-300 border-none">
          {sessions.length} Records
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          <AnimatedTable>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300 w-[200px]">Employee</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Department</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Punch In</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Punch In Location</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Punch Out</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Punch Out Location</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-center">Worked</TableHead>
                <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
                {showActions && <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300 w-[140px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s, index) => (
                <AnimatedTableRow key={s.id} delay={index * 0.02} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-0 group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm shadow-sm">
                        {getInitials(s.employee_name)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{s.employee_name ?? "Unknown"}</span>
                        <span className="text-xs font-mono text-slate-500 mt-0.5 bg-slate-100 dark:bg-slate-800 px-1 rounded inline-block w-max">#{s.employee_id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {s.department_name ? (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {s.department_name}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100 font-medium">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {formatDateTimeIST(s.punch_in_at).split(', ')[0]}
                      </div>
                      <div className="text-xs text-slate-500 ml-5 font-mono">
                        {formatDateTimeIST(s.punch_in_at).split(', ')[1]}
                      </div>
                    </div>
                  </TableCell>
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
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100 font-medium">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {formatDateTimeIST(s.punch_out_at).split(', ')[0]}
                        </div>
                        <div className="text-xs text-slate-500 ml-5 font-mono">
                          {formatDateTimeIST(s.punch_out_at).split(', ')[1]}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-medium">—</span>
                        {s.status === "OPEN" && (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold tracking-wider uppercase">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            Live
                          </span>
                        )}
                      </div>
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
                  <TableCell className="text-center">
                    {s.worked_minutes != null && s.worked_minutes > 0 ? (
                      <Badge variant="outline" className="font-mono text-xs border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-none px-2 py-0.5 rounded-lg">
                        {formatWorkedHours(s.worked_minutes)}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`px-2 py-0.5 rounded-lg shadow-none font-medium whitespace-nowrap ${getStatusBadgeClass(s.status)}`}>
                      {getStatusLabel(s.status)}
                    </Badge>
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        {s.status === "LEAVE_CONFLICT" && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="rounded-xl h-8 px-2.5 shadow-sm text-xs bg-red-600 hover:bg-red-700 font-medium"
                            onClick={() => {
                              setSelectedForResolve(s)
                              setResolveOpen(true)
                            }}
                          >
                            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Resolve
                          </Button>
                        )}
                        {s.status === "OPEN" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl h-8 px-2.5 shadow-sm text-xs border-blue-200 hover:bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:hover:bg-blue-900/30 dark:text-blue-400 font-medium"
                            onClick={() => onForceClose(s)}
                          >
                            Force Close
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onEdit(s)}
                          className="h-8 w-8 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </AnimatedTableRow>
              ))}
            </TableBody>
          </AnimatedTable>
        </div>
      </div>

      {/* Resolve Conflict Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden bg-white/95 dark:bg-slate-950/95 border-slate-200/60 dark:border-slate-800/60 shadow-2xl">
          <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Resolve Leave-Attendance Conflict</DialogTitle>
                <DialogDescription className="mt-1 text-slate-500">
                  <strong className="text-slate-700 dark:text-slate-300">{selectedForResolve?.employee_name}</strong> has approved leave but also marked attendance.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl flex gap-3 text-amber-800 dark:text-amber-300">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">Please review the session punch records and decide whether to prioritize the leave or the attendance record.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Admin Remarks (Optional)</Label>
              <Textarea 
                placeholder="Add resolution notes..." 
                value={resolveRemarks}
                onChange={(e) => setResolveRemarks(e.target.value)}
                className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => handleResolve(selectedForResolve!, "KEEP_LEAVE")}
                disabled={resolving}
                className="h-auto py-3 flex-col items-center justify-center gap-1 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 whitespace-normal text-center h-20"
              >
                <span className="font-bold text-slate-700 dark:text-slate-300">Keep Leave Approved</span>
                <span className="text-[10px] text-slate-500 font-normal">Attendance will not override the approved leave.</span>
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleResolve(selectedForResolve!, "REVOKE_LEAVE")}
                disabled={resolving}
                className="h-auto py-3 flex-col items-center justify-center gap-1 rounded-xl shadow-sm whitespace-normal text-center h-20"
              >
                <span className="font-bold">Revoke Leave & Mark Present</span>
                <span className="text-[10px] text-red-200 font-normal opacity-90">Leave will be revoked and attendance will be kept.</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default function AttendancePage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [sessions, setSessions] = useState<AdminAttendanceSessionDto[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("today")
  const [teamSummary, setTeamSummary] = useState<{ team_total: number; present_today: number; not_punched: number } | null>(null)
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
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<{ employee_id?: number; punch_in_at?: string; punch_out_at?: string; status?: AdminAttendanceSessionDto["status"]; remarks?: string }>({ status: "CLOSED" })
  const [selectedSession, setSelectedSession] = useState<AdminAttendanceSessionDto | null>(null)
  const [editForm, setEditForm] = useState<AdminSessionUpdateRequest>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string>("")
  const [reportsSubTab, setReportsSubTab] = useState<"sessions" | "not_punched_today">("sessions")
  const [notPunchedEmployees, setNotPunchedEmployees] = useState<
    { employee_id: number; employee_code: string; employee_name: string; department_name?: string | null }[]
  >([])
  const [notPunchedLoading, setNotPunchedLoading] = useState(false)

  const canUseAdminAttendance = user?.role && ADMIN_ATTENDANCE_ROLES.includes(user.role)
  const isTeamRole = !!user && canAccessTeamModules(user as any) && user.role !== "ADMIN" && user.role !== "HR"
  const showAdminUi = canUseAdminAttendance || isTeamRole
  const showManagerScope = isTeamRole

  useEffect(() => {
    if (user) {
      fetchEmployees()
      if (user.role === "HR" || user.role === "ADMIN") {
        fetchDepartments()
      } else {
        setDepartments([])
      }
      if (SUMMARY_ROLES.includes(user.role)) {
        fetchTeamSummary()
      } else {
        setTeamSummary(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (user && showAdminUi) {
      fetchSessions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab, filters, showAdminUi])

  useEffect(() => {
    if (activeTab === "reports" && reportsSubTab === "not_punched_today" && showAdminUi) {
      fetchNotPunchedToday()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, reportsSubTab, showAdminUi, filters.department_id, filters.q])

  const fetchEmployees = async () => {
    try {
      if (user?.role === "HR" || user?.role === "ADMIN") {
        const data = await api.get<Employee[]>("/api/v1/employees")
        setEmployees(data || [])
      } else if (isTeamRole) {
        const data = await api.get<Employee[]>("/api/v1/employees/my-team-tree")
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

  const fetchDepartments = async () => {
    try {
      const data = await api.get<Department[]>("/api/v1/departments")
      setDepartments(Array.isArray(data) ? data : [])
    } catch {
      setDepartments([])
    }
  }

  const fetchTeamSummary = async () => {
    try {
      const data = await api.get<{ team_total: number; present_today: number; not_punched: number }>("/api/v1/attendance/team-summary")
      setTeamSummary(data ?? null)
    } catch (err) {
      setTeamSummary(null)
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
        
        const endpoint = showManagerScope 
          ? `/api/v1/attendance/today-scope${queryString ? `?${queryString}` : ""}`
          : `/api/v1/admin/attendance/today${queryString ? `?${queryString}` : ""}`
          
        const data = await api.get<AdminAttendanceSessionDto[]>(endpoint)
        setSessions(Array.isArray(data) ? data : [])
      } else if (activeTab === "missing") {
        const from = filters.from_date || format(startOfYear(new Date()), "yyyy-MM-dd")
        const to = filters.to_date || format(new Date(), "yyyy-MM-dd")
        const params = new URLSearchParams({ from, to, status: filters.status || "OPEN" })
        if (filters.employee_id != null) params.append("employee_id", String(filters.employee_id))
        if (filters.department_id != null) params.append("department_id", String(filters.department_id))
        if (filters.q.trim()) params.append("q", filters.q.trim())
        const res = await api.get<{ items: AdminAttendanceSessionDto[]; total: number }>(
          `/api/v1/admin/attendance?${params.toString()}`
        )
        setSessions(res.items || [])
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

  const fetchNotPunchedToday = async () => {
    setNotPunchedLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.department_id != null) params.append("department_id", String(filters.department_id))
      if (filters.q.trim()) params.append("q", filters.q.trim())
      const query = params.toString()
      const res = await api.get<{ items: any[]; total: number }>(
        `/api/v1/admin/attendance/not-punched-today${query ? `?${query}` : ""}`
      )
      setNotPunchedEmployees(Array.isArray(res?.items) ? (res.items as any) : [])
    } catch (err) {
      setNotPunchedEmployees([])
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to load not punched employees",
        })
      }
    } finally {
      setNotPunchedLoading(false)
    }
  }

  const resetFilters = () => {
    setFilters({
      department_id: undefined,
      status: undefined,
      q: "",
      from_date: "",
      to_date: "",
      employee_id: undefined,
    })
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
      const toIsoUtc = (localDt: string) => {
        const d = new Date(localDt)
        return isNaN(d.getTime()) ? localDt : d.toISOString()
      }
      if (editForm.punch_in_at) body.punch_in_at = toIsoUtc(editForm.punch_in_at)
      if (editForm.punch_out_at) body.punch_out_at = toIsoUtc(editForm.punch_out_at)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const openSessionsCount = sessions.filter(s => s.status === "OPEN").length
  const closedSessionsCount = sessions.filter(s => s.status === "CLOSED" || s.status === "AUTO_CLOSED").length
  const conflictsCount = sessions.filter(s => s.status === "LEAVE_CONFLICT" || s.status === "SUSPICIOUS").length
  const pendingCount = teamSummary?.not_punched ?? 0

  const renderTableSkeleton = () => (
    <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800/60">
        <Skeleton className="h-6 w-48 mb-2 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded-lg" />
      </div>
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </Card>
  )

  const getFilterSubtitle = () => {
    if (activeTab === "today") return "Filter today's sessions by status, department and employee search."
    if (activeTab === "missing") return "Review sessions where punch-out is missing for selected date range."
    return "Generate attendance reports by date range, employee and status."
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* 1. Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-8 shadow-xl">
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
            <Clock className="h-72 w-72 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm">
                  ACS HRMS Attendance
                </Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Attendance Control Center</h1>
              <p className="max-w-xl text-slate-300">
                Monitor punch-in/out sessions, team presence, missing punch-outs, location logs and attendance exceptions.
              </p>
            </div>
            {showAdminUi && (
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => {
                    setCreateForm({ status: "CLOSED" })
                    setCreateOpen(true)
                  }}
                  className="bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl shadow-sm px-6 h-12"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Session
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* API Error Card */}
        {apiError && (
          <Card className="rounded-2xl border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 shadow-sm overflow-hidden backdrop-blur-sm">
            <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 mt-1 md:mt-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-1">Attendance data error</h3>
                  <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
                </div>
              </div>
              {apiError.includes("alembic") && (
                <div className="bg-red-100 dark:bg-red-900/40 px-4 py-2 rounded-xl font-mono text-xs text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/50 whitespace-nowrap">
                  alembic upgrade head
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 2. KPI Cards & Team Summary */}
        {isEmployeeOnly ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Today Status</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{myToday ? getStatusLabel(myToday.status) : "Not Punched"}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">This Month Sessions</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{mySessions.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Open Sessions</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{mySessions.filter(s => s.status === "OPEN").length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                  <TimerReset className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Worked Hours</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {formatWorkedHours(mySessions.reduce((acc, s) => acc + (s.worked_minutes || 0), 0))}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Sessions</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{sessions.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Open Sessions</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{openSessionsCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Closed Sessions</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{closedSessionsCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Conflicts</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{conflictsCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                  <TimerReset className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Team Pending</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pendingCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Team Summary Card (Manager scope) */}
        {user && SUMMARY_ROLES.includes(user.role) && !isEmployeeOnly && (
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Users className="h-32 w-32" />
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between p-6 relative z-10 gap-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Team Attendance Today</h3>
                <p className="text-sm text-slate-500">Overview of your team&apos;s presence and pending punch-ins.</p>
              </div>
              {teamSummary ? (
                <div className="flex items-center gap-8 text-center bg-slate-50/80 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">{teamSummary.team_total}</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">Total</div>
                  </div>
                  <div className="w-px h-10 bg-slate-200 dark:bg-slate-800"></div>
                  <div>
                    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-500">{teamSummary.present_today}</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 mt-1">Present</div>
                  </div>
                  <div className="w-px h-10 bg-slate-200 dark:bg-slate-800"></div>
                  <div>
                    <div className="text-3xl font-bold text-amber-600 dark:text-amber-500">{teamSummary.not_punched}</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-500 mt-1">Pending</div>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md">
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              )}
              <Button 
                variant="outline" 
                onClick={() => setActiveTab("today")}
                className="rounded-xl border-slate-200 dark:border-slate-700 whitespace-nowrap self-start md:self-center bg-white dark:bg-slate-900 shadow-sm"
              >
                View Team Attendance
              </Button>
            </div>
          </Card>
        )}

        {isEmployeeOnly ? (
          <div className="space-y-6">
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/60">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Today&apos;s Attendance</h3>
              </div>
              <CardContent className="p-6">
                {myLoading ? (
                  <Skeleton className="h-24 w-full rounded-xl" />
                ) : myToday ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
                      <Clock className="h-32 w-32 -mt-4 -mr-4" />
                    </div>
                    <div className="relative z-10">
                      <span className="text-sm font-semibold text-slate-500 block mb-1">Punch In</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatDateTimeIST(myToday.punch_in_at)}</span>
                    </div>
                    <div className="relative z-10">
                      <span className="text-sm font-semibold text-slate-500 block mb-1">Punch Out</span>
                      {myToday.punch_out_at ? (
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatDateTimeIST(myToday.punch_out_at)}</span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 w-max rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold tracking-wider uppercase mt-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                          </span>
                          Live
                        </span>
                      )}
                    </div>
                    <div className="relative z-10">
                      <span className="text-sm font-semibold text-slate-500 block mb-1">Worked</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {myToday.worked_minutes != null && myToday.worked_minutes > 0 ? formatWorkedHours(myToday.worked_minutes) : "—"}
                      </span>
                    </div>
                    <div className="relative z-10">
                      <span className="text-sm font-semibold text-slate-500 block mb-1">Status</span>
                      <Badge variant="outline" className={`mt-1 shadow-none px-2 py-1 font-semibold rounded-lg ${getStatusBadgeClass(myToday.status)}`}>
                        {getStatusLabel(myToday.status)}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-8 text-center border border-slate-100 dark:border-slate-800 border-dashed">
                    <p className="text-slate-500 font-medium">No punch-in for today yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/60">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">My Attendance Sessions</h3>
                <p className="text-sm text-slate-500 mt-1">Your punch-in/out records for the current month.</p>
              </div>
              <div className="p-0">
                {myLoading ? (
                  <div className="p-6"><Skeleton className="h-64 w-full rounded-xl" /></div>
                ) : mySessions.length === 0 ? (
                  <div className="p-12">
                    <EmptyState icon={Clock} title="No sessions" description="No attendance records in this period." />
                  </div>
                ) : (
                  <AttendanceTable
                    sessions={mySessions}
                    onEdit={() => {}}
                    onForceClose={() => {}}
                    showActions={false}
                  />
                )}
              </div>
            </Card>
          </div>
        ) : (
          <>
            {/* Tabs Layer */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-slate-100/70 dark:bg-slate-900/70 p-1.5 rounded-2xl h-auto w-full md:w-auto inline-flex overflow-x-auto shadow-inner">
                <TabsTrigger 
                  value="today" 
                  className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 font-semibold transition-all"
                >
                  <CalendarDays className="h-4 w-4 mr-2" /> Today
                </TabsTrigger>
                <TabsTrigger 
                  value="missing" 
                  className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 font-semibold transition-all"
                >
                  <FileClock className="h-4 w-4 mr-2" /> Missing Punch-out
                </TabsTrigger>
                <TabsTrigger 
                  value="reports" 
                  className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 font-semibold transition-all"
                >
                  <BadgeCheck className="h-4 w-4 mr-2" /> Reports
                </TabsTrigger>
              </TabsList>

              {/* Advanced Filter Card */}
              <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden mt-6">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Filter className="h-5 w-5 text-indigo-500" /> Attendance Filters
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{getFilterSubtitle()}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-xl h-10 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium whitespace-nowrap shadow-sm"
                    onClick={resetFilters}
                  >
                    <RotateCcw className="h-4 w-4 mr-2 text-slate-500" />
                    Reset Filters
                  </Button>
                </div>
                
                <CardContent className="p-6">
                  {/* Today / Missing Filters */}
                  {activeTab !== "reports" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                      {activeTab === "missing" && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From Date</Label>
                            <Input
                              type="date"
                              value={filters.from_date}
                              onChange={(e) => setFilters((f) => ({ ...f, from_date: e.target.value }))}
                              className="rounded-xl h-11 bg-slate-50/50 dark:bg-slate-900/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To Date</Label>
                            <Input
                              type="date"
                              value={filters.to_date}
                              onChange={(e) => setFilters((f) => ({ ...f, to_date: e.target.value }))}
                              className="rounded-xl h-11 bg-slate-50/50 dark:bg-slate-900/50"
                            />
                          </div>
                        </>
                      )}
                      
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Search</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Search name or code..."
                            value={filters.q}
                            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                            className="rounded-xl h-11 pl-9 bg-slate-50/50 dark:bg-slate-900/50"
                          />
                        </div>
                      </div>

                      {(user?.role === "HR" || user?.role === "ADMIN") && (
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</Label>
                          <Select
                            value={filters.department_id?.toString() ?? "all"}
                            onValueChange={(v) =>
                              setFilters((f) => ({ ...f, department_id: v === "all" ? undefined : parseInt(v, 10) }))
                            }
                          >
                            <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 dark:bg-slate-900/50">
                              <SelectValue placeholder="All Departments" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="all">All Departments</SelectItem>
                              {departments.length > 0
                                ? departments
                                    .filter((d) => d.active !== false)
                                    .map((d) => (
                                      <SelectItem key={d.id} value={String(d.id)}>
                                        {d.name}
                                      </SelectItem>
                                    ))
                                : Array.from(new Set(employees.map((e) => e.department_id).filter(Boolean))).map((deptId) => {
                                    const emp = employees.find((e) => e.department_id === deptId)
                                    return (
                                      <SelectItem key={deptId} value={String(deptId)}>
                                        {emp?.department?.name ?? `Dept ${deptId}`}
                                      </SelectItem>
                                    )
                                  })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</Label>
                        <Select
                          value={filters.status ?? "all"}
                          onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? undefined : v }))}
                        >
                          <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 dark:bg-slate-900/50">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="OPEN">Open (Live)</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                            <SelectItem value="AUTO_CLOSED">Auto Closed</SelectItem>
                            <SelectItem value="SUSPICIOUS">Suspicious</SelectItem>
                            <SelectItem value="LEAVE_CONFLICT">Conflict</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Reports Filters */}
                  {activeTab === "reports" && (
                    <div className="flex flex-col gap-6">
                      <Tabs value={reportsSubTab} onValueChange={(v) => setReportsSubTab(v as any)} className="w-full">
                        <TabsList className="bg-slate-100/70 dark:bg-slate-900/70 p-1.5 rounded-xl inline-flex shadow-inner mb-4">
                          <TabsTrigger value="sessions" className="rounded-lg px-4 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm font-medium">
                            Historical Sessions
                          </TabsTrigger>
                          <TabsTrigger value="not_punched_today" className="rounded-lg px-4 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm font-medium">
                            Not Punched Today
                          </TabsTrigger>
                        </TabsList>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                          {reportsSubTab === "sessions" ? (
                            <>
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From Date</Label>
                                <Input
                                  type="date"
                                  value={filters.from_date}
                                  onChange={(e) => setFilters((f) => ({ ...f, from_date: e.target.value }))}
                                  className="rounded-xl h-11 bg-slate-50/50 dark:bg-slate-900/50"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To Date</Label>
                                <Input
                                  type="date"
                                  value={filters.to_date}
                                  onChange={(e) => setFilters((f) => ({ ...f, to_date: e.target.value }))}
                                  className="rounded-xl h-11 bg-slate-50/50 dark:bg-slate-900/50"
                                />
                              </div>
                              {showAdminUi && employees.length > 0 && (
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</Label>
                                  <Select
                                    value={filters.employee_id?.toString() ?? "all"}
                                    onValueChange={(v) =>
                                      setFilters((f) => ({ ...f, employee_id: v === "all" ? undefined : parseInt(v, 10) }))
                                    }
                                  >
                                    <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 dark:bg-slate-900/50">
                                      <SelectValue placeholder="All Employees" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      <SelectItem value="all">All Employees</SelectItem>
                                      {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={String(emp.id)}>
                                          {emp.name} ({emp.emp_code})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</Label>
                                <Select
                                  value={filters.status ?? "all"}
                                  onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? undefined : v }))}
                                >
                                  <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 dark:bg-slate-900/50">
                                    <SelectValue placeholder="All Statuses" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl">
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="OPEN">Open</SelectItem>
                                    <SelectItem value="CLOSED">Closed</SelectItem>
                                    <SelectItem value="AUTO_CLOSED">Auto Closed</SelectItem>
                                    <SelectItem value="SUSPICIOUS">Suspicious</SelectItem>
                                    <SelectItem value="LEAVE_CONFLICT">Conflict</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          ) : (
                            <>
                              {(user?.role === "HR" || user?.role === "ADMIN") && (
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</Label>
                                  <Select
                                    value={filters.department_id?.toString() ?? "all"}
                                    onValueChange={(v) =>
                                      setFilters((f) => ({ ...f, department_id: v === "all" ? undefined : parseInt(v, 10) }))
                                    }
                                  >
                                    <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 dark:bg-slate-900/50">
                                      <SelectValue placeholder="All Departments" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      <SelectItem value="all">All Departments</SelectItem>
                                      {departments
                                        .filter((d) => d.active !== false)
                                        .map((d) => (
                                          <SelectItem key={d.id} value={String(d.id)}>
                                            {d.name}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Search</Label>
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  <Input
                                    placeholder="Search name or code..."
                                    value={filters.q}
                                    onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                                    className="rounded-xl h-11 pl-9 bg-slate-50/50 dark:bg-slate-900/50"
                                  />
                                </div>
                              </div>
                              <div className="self-end pt-2">
                                <Button 
                                  variant="default" 
                                  onClick={fetchNotPunchedToday} 
                                  disabled={notPunchedLoading}
                                  className="rounded-xl h-11 px-6 shadow-sm bg-indigo-600 hover:bg-indigo-700"
                                >
                                  <RefreshCw className={`h-4 w-4 mr-2 ${notPunchedLoading ? 'animate-spin' : ''}`} /> 
                                  Refresh List
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </Tabs>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Main Content Areas */}
              <TabsContent value="today" className="mt-6 border-none p-0 outline-none">
                {loading ? renderTableSkeleton() : (
                  <AttendanceTable
                    sessions={sessions}
                    onEdit={handleEdit}
                    onForceClose={handleForceClose}
                    showActions={showAdminUi}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="missing" className="mt-6 border-none p-0 outline-none">
                {loading ? renderTableSkeleton() : (
                  <AttendanceTable
                    sessions={sessions}
                    onEdit={handleEdit}
                    onForceClose={handleForceClose}
                    showActions={showAdminUi}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="reports" className="mt-6 border-none p-0 outline-none">
                {reportsSubTab === "sessions" ? (
                  loading ? renderTableSkeleton() : (
                    <AttendanceTable
                      sessions={sessions}
                      onEdit={handleEdit}
                      onForceClose={handleForceClose}
                      showActions={showAdminUi}
                    />
                  )
                ) : (
                  notPunchedLoading ? renderTableSkeleton() : notPunchedEmployees.length === 0 ? (
                    <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden p-12 text-center flex flex-col items-center justify-center">
                      <div className="h-16 w-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Everyone has punched today</h3>
                      <p className="text-slate-500 max-w-md">No pending punch-ins found for the selected filters.</p>
                    </Card>
                  ) : (
                    <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
                      <div className="p-6 border-b border-slate-100 dark:border-slate-800/60">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Not Punched Today</h3>
                        <p className="text-sm text-slate-500 mt-1">Employees who have not marked attendance today.</p>
                      </div>
                      <AnimatedTable>
                        <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60">
                          <TableRow className="hover:bg-transparent border-0">
                            <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Employee</TableHead>
                            <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Department</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {notPunchedEmployees.map((e, index) => (
                            <AnimatedTableRow key={e.employee_id} delay={index * 0.02} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-0 group">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center text-sm shadow-sm">
                                    {getInitials(e.employee_name)}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 dark:text-slate-100">{e.employee_name}</span>
                                    <span className="text-xs font-mono text-slate-500 mt-0.5 bg-slate-100 dark:bg-slate-800 px-1 rounded inline-block w-max">#{e.employee_code}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {e.department_name ? (
                                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                                    <Building2 className="h-4 w-4 text-slate-400" />
                                    {e.department_name}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </TableCell>
                            </AnimatedTableRow>
                          ))}
                        </TableBody>
                      </AnimatedTable>
                    </Card>
                  )
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Edit Session Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden bg-white/95 dark:bg-slate-950/95 border-slate-200/60 dark:border-slate-800/60 shadow-2xl">
            <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Edit className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">Edit Attendance Session</DialogTitle>
                  <DialogDescription className="mt-1 text-slate-500">
                    Update punch in/out time, status and admin remarks.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            {selectedSession && (
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Session Timing</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Punch In</Label>
                      <Input
                        type="datetime-local"
                        value={editForm.punch_in_at ?? ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, punch_in_at: e.target.value }))}
                        className="rounded-xl h-11 bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Punch Out</Label>
                      <Input
                        type="datetime-local"
                        value={editForm.punch_out_at ?? ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, punch_out_at: e.target.value }))}
                        className="rounded-xl h-11 bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Attendance Status</h4>
                  <div className="space-y-2">
                    <Select
                      value={editForm.status ?? "CLOSED"}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as AdminAttendanceSessionDto["status"] }))}
                    >
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                        <SelectItem value="AUTO_CLOSED">Auto closed</SelectItem>
                        <SelectItem value="SUSPICIOUS">Suspicious</SelectItem>
                        <SelectItem value="LEAVE_CONFLICT">Conflict</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Admin Remarks</h4>
                  <div className="space-y-2">
                    <Textarea
                      value={editForm.remarks ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, remarks: e.target.value }))}
                      placeholder="Add administrative notes..."
                      className="rounded-xl min-h-[100px] resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleSubmitEdit} disabled={submitting} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Session Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden bg-white/95 dark:bg-slate-950/95 border-slate-200/60 dark:border-slate-800/60 shadow-2xl">
            <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">Create Attendance Session</DialogTitle>
                  <DialogDescription className="mt-1 text-slate-500">
                    Add a manual session for an employee who missed both punches.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Employee *</Label>
                <Select
                  value={createForm.employee_id != null ? String(createForm.employee_id) : "select"}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, employee_id: v === "select" ? undefined : parseInt(v, 10) }))}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-[250px]">
                    <SelectItem value="select" disabled>Select an employee</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.name} ({e.emp_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Punch In *</Label>
                  <Input
                    type="datetime-local"
                    value={createForm.punch_in_at ?? ""}
                    onChange={(e) => setCreateForm((f) => ({ ...f, punch_in_at: e.target.value }))}
                    className="rounded-xl h-11 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Punch Out (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={createForm.punch_out_at ?? ""}
                    onChange={(e) => setCreateForm((f) => ({ ...f, punch_out_at: e.target.value }))}
                    className="rounded-xl h-11 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Initial Status</Label>
                  <Select
                    value={createForm.status ?? "CLOSED"}
                    onValueChange={(v) => setCreateForm((f) => ({ ...f, status: v as AdminAttendanceSessionDto["status"] }))}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                      <SelectItem value="AUTO_CLOSED">Auto closed</SelectItem>
                      <SelectItem value="SUSPICIOUS">Suspicious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Remarks</Label>
                <Textarea
                  value={createForm.remarks ?? ""}
                  onChange={(e) => setCreateForm((f) => ({ ...f, remarks: e.target.value }))}
                  placeholder="Reason for manual entry..."
                  className="rounded-xl min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                onClick={async () => {
                  if (!createForm.employee_id || !createForm.punch_in_at) {
                    toast({ variant: "destructive", title: "Missing fields", description: "Employee and Punch In are required" })
                    return
                  }
                  const toIsoUtc = (localDt?: string) => {
                    if (!localDt) return undefined
                    const d = new Date(localDt)
                    return isNaN(d.getTime()) ? localDt : d.toISOString()
                  }
                  const payload = {
                    employee_id: createForm.employee_id,
                    punch_in_at: toIsoUtc(createForm.punch_in_at)!,
                    punch_out_at: toIsoUtc(createForm.punch_out_at),
                    status: createForm.status,
                    remarks: createForm.remarks?.trim() || undefined,
                  }
                  try {
                    setSubmitting(true)
                    await api.post(`/api/v1/admin/attendance`, payload)
                    toast({ title: "Success", description: "Session created" })
                    setCreateOpen(false)
                    fetchSessions()
                  } catch (err) {
                    const msg = err instanceof ApiClientError ? err.data.detail || "Failed to create session" : "Failed to create session"
                    toast({ variant: "destructive", title: "Error", description: msg })
                  } finally {
                    setSubmitting(false)
                  }
                }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Session"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Force Close Confirmation Dialog */}
        <AlertDialog open={forceCloseOpen} onOpenChange={setForceCloseOpen}>
          <AlertDialogContent className="rounded-2xl border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/95 shadow-2xl p-0 overflow-hidden max-w-md">
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-500" />
                </div>
                <div>
                  <AlertDialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Force Close Session?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-500">
                    This will set punch-out to current time and mark the session as <strong className="text-slate-700 dark:text-slate-300">AUTO_CLOSED</strong>. The employee will see this as a system-closed session.
                  </AlertDialogDescription>
                </div>
              </div>
            </div>
            <AlertDialogFooter className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex-col sm:flex-row gap-3 sm:gap-0">
              <AlertDialogCancel disabled={submitting} className="rounded-xl border-slate-200 dark:border-slate-700 mt-0">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmForceClose}
                disabled={submitting}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Closing...
                  </>
                ) : (
                  "Force Close"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </PageContainer>
  )
}
