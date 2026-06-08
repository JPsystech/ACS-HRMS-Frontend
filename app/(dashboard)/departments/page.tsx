"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Department, DepartmentCreate, DepartmentUpdate } from "@/types/models"
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
  Building2,
  BadgeCheck,
  ArchiveX,
  XCircle,
  RotateCcw,
  AlertTriangle,
  CalendarDays,
  Network,
  Layers
} from "lucide-react"
import { format } from "date-fns"

export default function DepartmentsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [formData, setFormData] = useState<DepartmentCreate>({
    name: "",
    active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string>("")

  useEffect(() => {
    if (user?.role === "HR" || user?.role === "ADMIN") {
      fetchDepartments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchDepartments = async () => {
    setLoading(true)
    setApiError("")
    try {
      const data = await api.get<Department[]>("/api/v1/departments")
      setDepartments(data || [])
      
      // Warning: If login works but API returns empty, show banner
      if (user && data && data.length === 0) {
        // No departments returned by API. Check backend endpoint or org scoping.
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        const errorMsg = err.data.detail || "Failed to fetch departments"
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

  const handleCreate = () => {
    setFormData({ name: "", active: true })
    setSelectedDepartment(null)
    setCreateOpen(true)
  }

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department)
    setFormData({
      name: department.name,
      active: department.active,
    })
    setEditOpen(true)
  }

  const handleDelete = (department: Department) => {
    setSelectedDepartment(department)
    setDeleteOpen(true)
  }

  const handleSubmitCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Department name is required",
      })
      return
    }

    setSubmitting(true)
    try {
      await api.post<Department>("/api/v1/departments", formData)
      toast({
        title: "Success",
        description: "Department created successfully",
      })
      setCreateOpen(false)
      setFormData({ name: "", active: true })
      await fetchDepartments()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to create department",
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
        description: "Department name is required",
      })
      return
    }

    if (!selectedDepartment) return

    setSubmitting(true)
    try {
      const updateData: DepartmentUpdate = {
        name: formData.name,
        active: formData.active,
      }
      await api.patch<Department>(
        `/api/v1/departments/${selectedDepartment.id}`,
        updateData
      )
      toast({
        title: "Success",
        description: "Department updated successfully",
      })
      setEditOpen(false)
      setSelectedDepartment(null)
      await fetchDepartments()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to update department",
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
    if (!selectedDepartment) return

    setSubmitting(true)
    try {
      await api.patch<Department>(
        `/api/v1/departments/${selectedDepartment.id}`,
        { active: false }
      )
      toast({
        title: "Success",
        description: "Department deactivated successfully",
      })
      setDeleteOpen(false)
      setSelectedDepartment(null)
      await fetchDepartments()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to deactivate department",
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

  // Filter departments by search query
  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <RequireRole allowedRoles={["HR", "ADMIN"]}>
      <div className="space-y-6">
        {/* 1. Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-8 shadow-xl">
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
            <Network className="h-72 w-72 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 text-white">
              <h1 className="text-3xl font-bold tracking-tight">Department Control Center</h1>
              <p className="max-w-xl text-slate-300">
                Create, manage, activate and organize company departments for employee mapping and HRMS access control.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleCreate}
                className="bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl shadow-sm px-6 h-12"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Department
              </Button>
            </div>
          </div>
        </div>

        {/* 2. KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Departments</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{departments.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Departments</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{departments.filter(d => d.active).length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Inactive Departments</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{departments.filter(d => !d.active).length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Search Results</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{filteredDepartments.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Premium Search / Filter Card */}
        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800/60 p-6 pb-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 mb-1">
              <Search className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold">Department Filters</h3>
            </div>
            <p className="text-sm text-slate-500">Search and review departments by name and active status.</p>
          </div>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-2 flex-1 w-full max-w-md">
                <Label className="text-xs font-medium text-slate-500 uppercase">Search Departments</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search departments by name..."
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
                <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-1">Failed to load departments</h3>
                <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
              </div>
            </div>
          </Card>
        )}

        {!loading && !apiError && departments.length === 0 && user && (
          <Card className="rounded-2xl border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 shadow-sm overflow-hidden backdrop-blur-sm">
            <div className="p-6 flex items-start gap-4">
              <div className="h-10 w-10 shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mt-1">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-1">No departments returned by API</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  No departments were returned. Please check backend endpoint, organization scoping, or create your first department.
                </p>
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
        ) : filteredDepartments.length === 0 ? (
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md p-12 text-center flex flex-col items-center justify-center">
            <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <Building2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {searchQuery ? "No departments match your search" : "No departments found"}
            </h3>
            <p className="text-slate-500 mb-6 max-w-md">
              {searchQuery 
                ? "Try using another department name or reset the search."
                : "Create your first department to start employee mapping."}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreate} className="rounded-xl px-6">
                <Plus className="h-4 w-4 mr-2" />
                Create First Department
              </Button>
            )}
          </Card>
        ) : (
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/60 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Department Register</h3>
                <p className="text-sm text-slate-500 mt-1">Master list of company departments used for employee assignment and HRMS organization structure.</p>
              </div>
              <Badge variant="secondary" className="rounded-lg px-3 py-1 bg-slate-100 dark:bg-slate-800 font-medium whitespace-nowrap self-start sm:self-auto text-slate-600 dark:text-slate-300 border-none">
                {filteredDepartments.length} Records
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <AnimatedTable>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60">
                  <TableRow className="hover:bg-transparent border-0">
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Department</TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Created At</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepartments.map((dept, index) => (
                    <AnimatedTableRow key={dept.id} delay={index * 0.03} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-0 group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold shadow-sm group-hover:scale-105 transition-transform">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{dept.name}</span>
                            <span className="text-xs text-slate-500 font-medium mt-0.5">Department master record</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {dept.active ? (
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
                            {dept.created_at ? format(new Date(dept.created_at), "MMM dd, yyyy") : "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(dept)}
                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(dept)}
                            disabled={!dept.active}
                            className={`h-8 w-8 rounded-lg ${dept.active ? 'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30' : 'text-slate-300 cursor-not-allowed'}`}
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

        {/* Create/Edit Department Dialog */}
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
                    {editOpen ? "Edit Department" : "Create Department"}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-slate-500">
                    {editOpen 
                      ? "Update department name and active status."
                      : "Add a new department to the HRMS organization structure."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Department Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="name"
                    placeholder="e.g. Engineering"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <Label htmlFor="active" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Active Department</Label>
                  <p className="text-xs text-slate-500">Active departments can be assigned to employees.</p>
                </div>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(c) => setFormData({ ...formData, active: c })}
                />
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
                  editOpen ? "Update Department" : "Create Department"
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
              setSelectedDepartment(null)
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
                    Deactivate Department?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-500">
                    Are you sure you want to deactivate <strong className="text-slate-700 dark:text-slate-300">&quot;{selectedDepartment?.name}&quot;</strong>? This will mark the department as inactive and prevent it from being used for new employee assignment, but existing records will remain available.
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
