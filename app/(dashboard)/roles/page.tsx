"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { RoleDefinition } from "@/types/models"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Search,
  ShieldCheck,
  BadgeCheck,
  ArchiveX,
  XCircle,
  RotateCcw,
  AlertTriangle,
  CalendarDays,
  Network,
  KeyRound,
  Layers,
  Home
} from "lucide-react"
import { format } from "date-fns"

type RoleCreatePayload = {
  name: string
  role_rank: number
  wfh_enabled: boolean
  is_active: boolean
}

type RoleUpdatePayload = {
  name?: string
  role_rank?: number
  wfh_enabled?: boolean
  is_active?: boolean
}

export default function RolesPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleDefinition | null>(null)
  const [formData, setFormData] = useState<RoleCreatePayload>({
    name: "",
    role_rank: 10,
    wfh_enabled: false,
    is_active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string>("")

  useEffect(() => {
    if (user && (user.role === "HR" || user.role === "ADMIN")) {
      fetchRoles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchRoles = async () => {
    setLoading(true)
    setApiError("")
    try {
      const data = await api.get<RoleDefinition[]>("/api/v1/roles")
      setRoles(data || [])
    } catch (err) {
      if (err instanceof ApiClientError) {
        const message = err.data.detail || "Failed to fetch roles"
        setApiError(message)
        toast({
          variant: "destructive",
          title: "Error",
          description: message,
        })
      } else {
        const message = "An unexpected error occurred"
        setApiError(message)
        toast({
          variant: "destructive",
          title: "Error",
          description: message,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setFormData({
      name: "",
      role_rank: 10,
      wfh_enabled: false,
      is_active: true,
    })
    setSelectedRole(null)
    setCreateOpen(true)
  }

  const handleEdit = (role: RoleDefinition) => {
    setSelectedRole(role)
    setFormData({
      name: role.name,
      role_rank: role.role_rank,
      wfh_enabled: role.wfh_enabled,
      is_active: role.is_active,
    })
    setEditOpen(true)
  }

  const handleDelete = (role: RoleDefinition) => {
    setSelectedRole(role)
    setDeleteOpen(true)
  }

  const handleSubmitCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Role name is required",
      })
      return
    }

    if (!Number.isFinite(formData.role_rank) || formData.role_rank < 1) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Role rank must be a positive number (1 = highest)",
      })
      return
    }

    setSubmitting(true)
    try {
      await api.post<RoleDefinition>("/api/v1/roles", formData)
      toast({
        title: "Success",
        description: "Role created successfully",
      })
      setCreateOpen(false)
      setFormData({
        name: "",
        role_rank: 10,
        wfh_enabled: false,
        is_active: true,
      })
      await fetchRoles()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to create role",
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

  const handleSubmitEdit = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Role name is required",
      })
      return
    }
    if (!selectedRole) return

    if (!Number.isFinite(formData.role_rank) || formData.role_rank < 1) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Role rank must be a positive number (1 = highest)",
      })
      return
    }

    setSubmitting(true)
    try {
      const payload: RoleUpdatePayload = {
        name: formData.name,
        role_rank: formData.role_rank,
        wfh_enabled: formData.wfh_enabled,
        is_active: formData.is_active,
      }
      await api.patch<RoleDefinition>(
        `/api/v1/roles/${selectedRole.id}`,
        payload
      )
      toast({
        title: "Success",
        description: "Role updated successfully",
      })
      setEditOpen(false)
      setSelectedRole(null)
      await fetchRoles()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to update role",
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

  const handleConfirmDelete = async () => {
    if (!selectedRole) return

    setSubmitting(true)
    try {
      // Soft delete: mark inactive
      await api.patch<RoleDefinition>(`/api/v1/roles/${selectedRole.id}`, {
        is_active: false,
      } as RoleUpdatePayload)
      toast({
        title: "Success",
        description: "Role deactivated successfully",
      })
      setDeleteOpen(false)
      setSelectedRole(null)
      await fetchRoles()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to deactivate role",
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

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeRolesCount = roles.filter((r) => r.is_active).length
  const inactiveRolesCount = roles.filter((r) => !r.is_active).length
  const wfhRolesCount = roles.filter((r) => r.wfh_enabled).length

  return (
    <RequireRole allowedRoles={["ADMIN"]}>
      <div className="space-y-6">
        {/* 1. Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-8 shadow-xl">
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
            <ShieldCheck className="h-72 w-72 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 text-white">
              <h1 className="text-3xl font-bold tracking-tight">Role Control Center</h1>
              <p className="max-w-xl text-slate-300">
                Create and manage role hierarchy, authority rank, WFH access and active role configuration for ACS HRMS.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleCreate}
                className="bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl shadow-sm px-6 h-12"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Role
              </Button>
            </div>
          </div>
        </div>

        {/* 2. KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Roles</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{roles.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Roles</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeRolesCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Inactive Roles</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{inactiveRolesCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">WFH Enabled</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{wfhRolesCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Search Results</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{filteredRoles.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Search and Filter Card */}
        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Role Filters</h3>
            <p className="text-sm text-slate-500">Search and review role hierarchy, WFH enablement and active status.</p>
          </div>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-2 flex-1 w-full max-w-md">
                <Label className="text-xs font-medium text-slate-500 uppercase">Search Roles</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search roles by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-xl h-10 pl-9 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 w-full"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                className="rounded-xl h-10 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setSearchQuery("")}
              >
                <RotateCcw className="h-4 w-4 mr-2 text-slate-500" />
                Reset Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 4. Error and Warning Banners */}
        {apiError && !loading && (
          <Card className="rounded-2xl border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 shadow-sm overflow-hidden backdrop-blur-sm">
            <div className="p-6 flex items-start gap-4">
              <div className="h-10 w-10 shrink-0 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 mt-1">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-1">Failed to load roles</h3>
                <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
              </div>
            </div>
          </Card>
        )}

        {/* 5. Main Content Area */}
        {loading ? (
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
        ) : filteredRoles.length === 0 ? (
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md p-12 text-center flex flex-col items-center justify-center">
            <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {searchQuery ? "No roles match your search" : "No roles found"}
            </h3>
            <p className="text-slate-500 mb-6 max-w-md">
              {searchQuery 
                ? "Try using another role name or reset the search."
                : "Create your first role to start building HRMS role hierarchy."}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreate} className="rounded-xl px-6">
                <Plus className="h-4 w-4 mr-2" />
                Create First Role
              </Button>
            )}
          </Card>
        ) : (
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/60 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Role Master Register</h3>
                <p className="text-sm text-slate-500 mt-1">Master list of role hierarchy, authority rank, WFH enablement and role status.</p>
              </div>
              <Badge variant="secondary" className="rounded-lg px-3 py-1 bg-slate-100 dark:bg-slate-800 font-medium whitespace-nowrap self-start sm:self-auto text-slate-600 dark:text-slate-300 border-none">
                {filteredRoles.length} Records
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <AnimatedTable>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60">
                  <TableRow className="hover:bg-transparent border-0">
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Role</TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Rank</TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">WFH Access</TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Created</TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Updated</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((role, index) => (
                    <AnimatedTableRow key={role.id} delay={index * 0.03} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-0 group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold shadow-sm group-hover:scale-105 transition-transform">
                            <ShieldCheck className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{role.name}</span>
                            <span className="text-xs text-slate-500 font-medium mt-0.5">Role master record</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          {role.role_rank === 1 ? (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-400 font-medium px-2 py-0.5 rounded-lg shadow-none">
                              Highest Authority
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 font-medium px-2 py-0.5 rounded-lg shadow-none">
                              Level {role.role_rank}
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500 font-medium">Authority level</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {role.wfh_enabled ? (
                          <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium px-2 py-0.5 rounded-lg shadow-none">
                            WFH Enabled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-200 bg-transparent text-slate-500 dark:border-slate-700 dark:text-slate-400 font-medium px-2 py-0.5 rounded-lg shadow-none">
                            WFH Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {role.is_active ? (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-lg shadow-none">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-200 bg-transparent text-slate-500 dark:border-slate-700 dark:text-slate-400 font-medium px-2 py-0.5 rounded-lg shadow-none">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <CalendarDays className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium">
                            {role.created_at ? format(new Date(role.created_at), "dd MMM yyyy") : "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <CalendarDays className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium">
                            {role.updated_at ? format(new Date(role.updated_at), "dd MMM yyyy") : "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(role)}
                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(role)}
                            disabled={!role.is_active}
                            className={`h-8 w-8 rounded-lg ${role.is_active ? 'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30' : 'text-slate-300 cursor-not-allowed'}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </AnimatedTableRow>
                  ))}
                </TableBody>
              </AnimatedTable>
            </div>
          </Card>
        )}

        {/* Create/Edit Role Dialog */}
        <Dialog open={createOpen || editOpen} onOpenChange={(open) => {
          if (createOpen) setCreateOpen(open)
          if (editOpen) setEditOpen(open)
        }}>
          <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden bg-white/95 dark:bg-slate-950/95 border-slate-200/60 dark:border-slate-800/60 shadow-2xl">
            <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  {editOpen ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">
                    {editOpen ? "Edit Role" : "Create Role"}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-slate-500">
                    {editOpen 
                      ? "Update role name, authority rank, WFH access and active status."
                      : "Define a new HRMS role with hierarchy rank and WFH access permission."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Role Name</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="name"
                      placeholder="e.g. Senior Developer"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rank" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Authority Rank <span className="text-xs text-slate-400 font-normal ml-1">(1 = highest authority)</span>
                  </Label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="rank"
                      type="number"
                      min={1}
                      value={formData.role_rank}
                      onChange={(e) => setFormData({ ...formData, role_rank: Number(e.target.value) || 1 })}
                      className="pl-10 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Access Configuration</Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <Label htmlFor="wfh_enabled" className="text-sm font-medium text-slate-700 dark:text-slate-300">WFH Enabled</Label>
                      <p className="text-xs text-slate-500">Allow employees under this role to use WFH feature.</p>
                    </div>
                    <Switch
                      id="wfh_enabled"
                      checked={formData.wfh_enabled}
                      onCheckedChange={(c) => setFormData({ ...formData, wfh_enabled: c })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300">Active Role</Label>
                      <p className="text-xs text-slate-500">Active roles can be selected for employee assignment.</p>
                    </div>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  setCreateOpen(false)
                  setEditOpen(false)
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                onClick={editOpen ? handleSubmitEdit : handleSubmitCreate}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editOpen ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  editOpen ? "Update Role" : "Create Role"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deactivate Confirmation Dialog */}
        <AlertDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open)
            if (!open) {
              setSelectedRole(null)
            }
          }}
        >
          <AlertDialogContent className="rounded-2xl border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/95 shadow-2xl p-0 overflow-hidden max-w-md">
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-500" />
                </div>
                <div>
                  <AlertDialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Deactivate Role?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-500">
                    Are you sure you want to deactivate <strong className="text-slate-700 dark:text-slate-300">&quot;{selectedRole?.name}&quot;</strong>? Existing employees will keep their role, but this role will no longer be selectable for new assignments.
                  </AlertDialogDescription>
                </div>
              </div>
            </div>
            <AlertDialogFooter className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex-col sm:flex-row gap-3 sm:gap-0">
              <AlertDialogCancel disabled={submitting} className="rounded-xl border-slate-200 dark:border-slate-700 mt-0">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  "Yes, Deactivate"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Debug Panel */}
        <DebugPanel />
      </div>
    </RequireRole>
  )
}
