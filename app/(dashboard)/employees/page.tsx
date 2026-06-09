"use client"

import React, { useEffect, useState, useRef } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { RequireRole } from "@/components/auth/RequireRole"
import { DebugPanel } from "@/components/debug/DebugPanel"
import {
  Employee,
  EmployeeCreate,
  EmployeeUpdate,
  Department,
  EmployeeRole,
  RoleDefinition,
  WorkMode,
  ManagerOptions,
  OfficeLocation,
  PunchLocationPolicy,
} from "@/types/models"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageContainer } from "@/components/ui/page-container"
import { EmptyState } from "@/components/ui/empty-state"
import { AnimatedTable, AnimatedTableRow, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/animated-table"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Edit, Trash2, Loader2, Search, Users, UserCheck, UserX, Building2, Filter, RotateCcw, Smartphone, CalendarDays, BadgeCheck, BriefcaseBusiness, ShieldCheck, KeyRound, AlertTriangle, UserPlus, MapPin } from "lucide-react"
import { format } from "date-fns"

const MIN_PASSWORD_LENGTH = 6
const MAX_PASSWORD_LENGTH = 50

// Utility function to check UTF-8 byte length
const getUtf8ByteLength = (str: string): number => {
  return new TextEncoder().encode(str).length
}

export default function EmployeesPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [officeLocations, setOfficeLocations] = useState<OfficeLocation[]>([])
  const [managerOptions, setManagerOptions] = useState<ManagerOptions[]>([])
  const [managerSearch, setManagerSearch] = useState("")
  const [managerLoading, setManagerLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState<EmployeeRole | "ALL">("ALL")
  const [filterDepartment, setFilterDepartment] = useState<number | "ALL">("ALL")
  const [filterActive, setFilterActive] = useState<boolean | "ALL">("ALL")
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState<EmployeeCreate>({
    emp_code: "",
    name: "",
    mobile_number: "",
    role: "EMPLOYEE",
    // still send legacy role string, but selection comes from role master
    department_id: 0,
    reporting_manager_id: null,
    work_mode: "OFFICE",
    join_date: new Date().toISOString().split("T")[0],
    password: "",
    active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string>("")
  const [passwordError, setPasswordError] = useState<string>("")
  // Reset password modal state
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmployee, setResetEmployee] = useState<Employee | null>(null)
  const [resetMode, setResetMode] = useState<"manual" | "generate">("generate")
  const [resetPassword, setResetPassword] = useState("")
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string>("")

  useEffect(() => {
    if (user?.role === "HR" || user?.role_rank === 1) {
      fetchData()
    } else {
      // User does not have HR or ADMIN role, cannot fetch data
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchData = async () => {
    setLoading(true)
    setApiError("")
    try {
      // Fetch employees, departments, roles, and office locations in parallel
      const [employeesData, departmentsData, rolesData, locationsData] = await Promise.all([
        api.get<Employee[]>("/api/v1/employees"),
        api.get<Department[]>("/api/v1/departments"),
        api.get<RoleDefinition[]>("/api/v1/roles").catch(() => []),
        api.get<OfficeLocation[]>("/api/v1/office-locations").catch(() => []),
      ])

      setEmployees(employeesData || [])
      setDepartments(departmentsData || [])
      setRoles(Array.isArray(rolesData) ? rolesData : [])
      setOfficeLocations(Array.isArray(locationsData) ? locationsData : [])

      // Debug logging to check what's being returned

      // Warning: If login works but API returns empty, show banner
      if (user && employeesData && employeesData.length === 0) {
        // No employees returned by API. Check backend endpoint or org scoping.
      }

      // Check if departments are empty but API call succeeded
      if (user && departmentsData && departmentsData.length === 0) {
        // No departments returned by API. Check backend endpoint or create departments first.
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        const errorMsg = err.data.detail || "Failed to fetch data"
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
    const defaultRole: EmployeeRole = "EMPLOYEE"
    const defaultRank = getRoleRank(defaultRole)
    setFormData({
      emp_code: "",
      name: "",
      mobile_number: "",
      role: defaultRole,
      department_id: departments[0]?.id || 0,
      reporting_manager_id: defaultRank === 1 ? null : null,
      work_mode: "OFFICE",
      punch_location_policy: "OFFICE_FIXED",
      office_location_id: null,
      join_date: new Date().toISOString().split("T")[0],
      password: "",
      active: true,
    })
    setPasswordError("")
    setManagerSearch("")

    setSelectedEmployee(null)
    setCreateOpen(true)
  }

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee)
    setFormData({
      emp_code: employee.emp_code,
      name: employee.name,
      mobile_number: employee.mobile_number ?? "",
      role: employee.role,
      department_id: employee.department_id || 0,
      reporting_manager_id: employee.reporting_manager_id,
      work_mode: employee.work_mode || "OFFICE",
      punch_location_policy: employee.punch_location_policy || "OFFICE_FIXED",
      office_location_id: employee.office_location_id || null,
      join_date: employee.join_date
        ? employee.join_date.split("T")[0]
        : new Date().toISOString().split("T")[0],
      password: "", // Don't pre-fill password
      active: employee.active,
    })
    setPasswordError("")
    setManagerSearch("")

    setEditOpen(true)
  }

  const getRoleRank = (roleName: EmployeeRole | string): number => {
    const def = roles.find(
      (r) => r.name.toUpperCase() === roleName.toString().toUpperCase()
    )
    return def?.role_rank ?? 99
  }

  // Helper function to get allowed manager ranks based on target rank
  const getAllowedManagerRanks = (targetRank: number): number[] => {
    if (targetRank <= 1 || targetRank > 5) return []

    switch (targetRank) {
      case 2: // MD → only ADMIN (rank 1)
        return [1]
      case 3: // VP → ADMIN or MD (rank 1-2)
        return [1, 2]
      case 4: // MANAGER → ADMIN/MD/VP (rank 1-3)
        return [1, 2, 3]
      case 5: // EMPLOYEE → prefer MANAGER (rank 4), then fallback to higher ranks (1-3)
        return [4, 3, 2, 1]
      default:
        return []
    }
  }

  // Request cancellation protection
  const latestRequestId = useRef(0)

  // Fetch manager options when role or department changes
  useEffect(() => {
    const fetchManagerOptions = async () => {
      const roleRank = getRoleRank(formData.role)

      // Guard: Only fetch if we have a valid role rank (2-5)
      if (roleRank <= 1 || roleRank > 5) {
        setManagerOptions([])
        return
      }

      setManagerLoading(true)

      // Request cancellation protection
      const requestId = ++latestRequestId.current

      try {
        const allowedRanks = getAllowedManagerRanks(roleRank)
        if (allowedRanks.length === 0) {
          setManagerOptions([])
          return
        }

        // Build query parameters for the new backend endpoint
        const params = new URLSearchParams({
          target_role_rank: roleRank.toString(),
        })

        // For EMPLOYEE rank (>=5): pass department_id for same-department preference
        // For ranks 2-4: don't pass department_id (backend handles without department filter)
        if (roleRank >= 5 && formData.department_id > 0) {
          params.append('department_id', formData.department_id.toString())
        }

        if (managerSearch) {
          params.append('search', managerSearch)
        }

        const response = await api.get<ManagerOptions[]>(`/api/v1/employees/manager-options?${params}`)

        // Only apply results if this is the latest request
        if (requestId !== latestRequestId.current) {
          return
        }

        // API returns array directly, no data property
        const managerList = Array.isArray(response) ? response : []
        setManagerOptions(managerList)

        // Auto-select current ADMIN user as reporting manager if:
        // 1. Current user is ADMIN
        // 2. No reporting manager is currently selected
        // 3. Current ADMIN user is in the manager options
        // This logic needs to be handled after setManagerOptions completes
        // We'll handle this in a separate useEffect or after state updates
      } catch (error) {
        console.error('Failed to fetch manager options:', error)
        // Only show error if this is the latest request
        if (requestId === latestRequestId.current) {
          if (error instanceof ApiClientError) {
            toast({
              variant: "destructive",
              title: "Error loading managers",
              description: error.data.detail || "Failed to load manager options",
            })
          }
          setManagerOptions([])
        }
      } finally {
        // Only update loading state if this is the latest request
        if (requestId === latestRequestId.current) {
          setManagerLoading(false)
        }
      }
    }

    // Debounce the search to avoid too many API calls
    const timeoutId = setTimeout(fetchManagerOptions, 300)
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.role, formData.department_id, managerSearch, user])

  // Auto-select current ADMIN user as reporting manager when options change
  useEffect(() => {
    if (user?.role_rank === 1 && !formData.reporting_manager_id && managerOptions.length > 0) {
      const currentAdminInOptions = managerOptions.find(manager => manager.id === user.id)
      if (currentAdminInOptions) {
        setFormData({
          ...formData,
          reporting_manager_id: user.id
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerOptions, user, formData.reporting_manager_id])


  const handleDelete = (employee: Employee) => {
    setSelectedEmployee(employee)
    setDeleteOpen(true)
  }

  const handleSubmitCreate = async () => {
    if (!formData.emp_code.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Employee code is required",
      })
      return
    }
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Employee name is required",
      })
      return
    }
    if (!formData.department_id || formData.department_id === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Department is required",
      })
      return
    }

    // Validate reporting manager based on role rank
    const roleRank = getRoleRank(formData.role)

    // ADMIN (rank 1) must have null reporting manager
    if (roleRank === 1 && formData.reporting_manager_id !== null) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Admin roles cannot have a reporting manager",
      })
      return
    }

    // Non-admin roles (rank 2-5) must have a reporting manager
    if (roleRank > 1 && !formData.reporting_manager_id) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Reporting manager is required for non-Admin roles",
      })
      return
    }



    // Handle password validation with proper trimming and UTF-8 byte checking
    let processedPassword: string | undefined = undefined

    if (formData.password) {
      // Trim whitespace
      const trimmedPassword = formData.password.trim()

      // If empty after trimming, treat as no password
      if (!trimmedPassword) {
        processedPassword = undefined
      } else {
        // Validate length
        if (trimmedPassword.length < MIN_PASSWORD_LENGTH) {
          const message = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
          setPasswordError(message)
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: message,
          })
          return
        }

        if (trimmedPassword.length > MAX_PASSWORD_LENGTH) {
          const message = `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`
          setPasswordError(message)
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: message,
          })
          return
        }

        // Validate UTF-8 byte length
        const byteLength = getUtf8ByteLength(trimmedPassword)
        if (byteLength > 72) {
          const message = `Password cannot be longer than 72 bytes when encoded as UTF-8`
          setPasswordError(message)
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: message,
          })
          return
        }

        processedPassword = trimmedPassword
      }
    }

    setPasswordError("")

    setSubmitting(true)
    try {
      // Build payload with conditional password inclusion
      const payload: EmployeeCreate = {
        emp_code: formData.emp_code,
        name: formData.name,
        mobile_number: formData.mobile_number?.trim() || null,
        role: formData.role,
        department_id: formData.department_id,
        reporting_manager_id: formData.reporting_manager_id,
        work_mode: formData.work_mode,
        punch_location_policy: formData.punch_location_policy,
        office_location_id: formData.office_location_id,
        join_date: formData.join_date,
        active: formData.active,
        // Only include password if provided and valid
        ...(processedPassword !== undefined && { password: processedPassword })
      }
      await api.post<Employee>("/api/v1/employees", payload)
      toast({
        title: "Success",
        description: "Employee created successfully",
      })
      setCreateOpen(false)
      await fetchData()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to create employee",
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
        description: "Employee name is required",
      })
      return
    }
    if (!formData.department_id || formData.department_id === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Department is required",
      })
      return
    }

    if (!selectedEmployee) return



    setSubmitting(true)
    try {
      const updateData: EmployeeUpdate = {
        name: formData.name,
        mobile_number: formData.mobile_number?.trim() || null,
        role: formData.role,
        department_id: formData.department_id,
        reporting_manager_id: formData.reporting_manager_id,
        work_mode: formData.work_mode,
        punch_location_policy: formData.punch_location_policy,
        office_location_id: formData.office_location_id,
        join_date: formData.join_date,
        active: formData.active,
      }
      await api.patch<Employee>(
        `/api/v1/employees/${selectedEmployee.id}`,
        updateData
      )
      toast({
        title: "Success",
        description: "Employee updated successfully",
      })
      setEditOpen(false)
      setSelectedEmployee(null)
      await fetchData()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to update employee",
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
    if (!selectedEmployee) return

    setSubmitting(true)
    try {
      await api.patch<Employee>(`/api/v1/employees/${selectedEmployee.id}`, {
        active: false,
      })
      toast({
        title: "Success",
        description: "Employee deactivated successfully",
      })
      setDeleteOpen(false)
      setSelectedEmployee(null)
      await fetchData()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to deactivate employee",
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

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.emp_code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === "ALL" || emp.role === filterRole
    const matchesDepartment =
      filterDepartment === "ALL" || emp.department_id === filterDepartment
    const matchesActive =
      filterActive === "ALL" || emp.active === filterActive

    return matchesSearch && matchesRole && matchesDepartment && matchesActive
  })

  const getDepartmentName = (departmentId: number | null) => {
    if (!departmentId) return "-"
    const dept = departments.find((d) => d.id === departmentId)
    return dept?.name || "-"
  }

  const getManagerName = (managerId: number | null) => {
    if (!managerId) return "-"
    const manager = employees.find((e) => e.id === managerId)
    return manager ? `${manager.name} (${manager.emp_code} - ${manager.role})` : "-"
  }

  return (
    <RequireRole allowedRoles={["HR", "ADMIN"]}>
      <PageContainer>
        <div className="space-y-6">
          {/* 2. Hero Section */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-8 shadow-xl">
            <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
              <Users className="h-64 w-64 text-white" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 text-white">
                <h1 className="text-3xl font-bold tracking-tight">Employee Control Center</h1>
                <p className="max-w-xl text-slate-300">
                  Manage employees, roles, departments, punch policy and account access from one place.
                </p>
              </div>
              {user?.role_rank === 1 && (
                <Button
                  onClick={handleCreate}
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-slate-100 shadow-sm transition-all whitespace-nowrap rounded-xl font-medium"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Create Employee
                </Button>
              )}
            </div>
          </div>

          {/* 3. KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Employees</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{employees.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Active</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{employees.filter(e => e.active).length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                  <UserX className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Inactive</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{employees.filter(e => !e.active).length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Departments</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{departments.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* API Error Banner */}
          {apiError && !loading && (
            <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <h4 className="font-semibold">Failed to load employees</h4>
                <p className="text-sm opacity-90">{apiError}</p>
              </div>
            </div>
          )}

          {/* 4. Filter Section */}
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
            <div className="border-b border-slate-100 dark:border-slate-800/60 p-6 pb-4">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 mb-1">
                <Filter className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold">Employee Filters</h3>
              </div>
              <p className="text-sm text-slate-500">Search and filter employees by role, department and status.</p>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Name, Code or Mobile"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-xl pl-9 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500"
                  />
                </div>
                <Select value={filterRole} onValueChange={(val) => setFilterRole(val as EmployeeRole | "ALL")}>
                  <SelectTrigger className="rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">All Roles</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterDepartment.toString()} onValueChange={(val) => setFilterDepartment(val === "ALL" ? "ALL" : parseInt(val))}>
                  <SelectTrigger className="rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Select value={filterActive.toString()} onValueChange={(val) => setFilterActive(val === "ALL" ? "ALL" : val === "true")}>
                    <SelectTrigger className="flex-1 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterRole("ALL");
                      setFilterDepartment("ALL");
                      setFilterActive("ALL");
                    }}
                    title="Reset Filters"
                  >
                    <RotateCcw className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Employee Register Table */}
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
          ) : filteredEmployees.length === 0 ? (
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
              <EmptyState
                icon={Users}
                title={
                  searchQuery || filterRole !== "ALL" || filterDepartment !== "ALL" || filterActive !== "ALL"
                    ? "No employees match your filters"
                    : "No employees found"
                }
                description={
                  searchQuery || filterRole !== "ALL" || filterDepartment !== "ALL" || filterActive !== "ALL"
                    ? "Try adjusting your search or filter criteria to see results."
                    : "You haven't added any employees yet. Get started by creating your first employee."
                }
                action={
                  !searchQuery && filterRole === "ALL" && filterDepartment === "ALL" && filterActive === "ALL" && user?.role_rank === 1
                    ? {
                        label: "Create First Employee",
                        onClick: handleCreate,
                      }
                    : undefined
                }
              />
            </Card>
          ) : (
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/60 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Employee Register</h3>
                  <p className="text-sm text-slate-500 mt-1">Complete employee list with role, department, punch policy and access status.</p>
                </div>
                <Badge variant="secondary" className="rounded-lg px-3 py-1 bg-slate-100 dark:bg-slate-800 font-medium whitespace-nowrap self-start sm:self-auto text-slate-600 dark:text-slate-300 border-none">
                  {filteredEmployees.length} {filteredEmployees.length === 1 ? 'Employee' : 'Employees'}
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[1050px]">
                  <AnimatedTable>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60">
                      <TableRow className="hover:bg-transparent border-0">
                        <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Employee</TableHead>
                        <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Mobile</TableHead>
                        <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Role & Dept</TableHead>
                        <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Reporting To</TableHead>
                        <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Policy</TableHead>
                        <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
                        <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee, index) => (
                        <AnimatedTableRow key={employee.id} delay={index * 0.03} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-0 group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                                {employee.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{employee.name}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <code className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {employee.emp_code}
                                  </code>
                                  {employee.join_date && (
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                                      {format(new Date(employee.join_date), 'MMM yyyy')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {employee.mobile_number ? (
                              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                <Smartphone className="h-4 w-4 text-slate-400" />
                                <span className="font-medium">{employee.mobile_number}</span>
                              </div>
                            ) : (
                              <span className="text-sm italic text-slate-400 dark:text-slate-500">Not added</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5 items-start">
                              <Badge
                                variant="outline"
                                className={
                                  employee.role === "ADMIN"
                                    ? "border-transparent bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-medium"
                                    : employee.role === "HR"
                                    ? "border-transparent bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium"
                                    : employee.role === "MANAGER" || employee.role === "VP" || employee.role === "MD"
                                    ? "border-transparent bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-medium"
                                    : "border-slate-200 bg-transparent text-slate-600 dark:border-slate-700 dark:text-slate-300 font-medium"
                                }
                              >
                                {employee.role}
                              </Badge>
                              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate max-w-[150px]" title={getDepartmentName(employee.department_id)}>
                                {getDepartmentName(employee.department_id)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              {employee.reporting_manager_id ? (
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={getManagerName(employee.reporting_manager_id)}>
                                  {getManagerName(employee.reporting_manager_id).split(' ')[0]}
                                </span>
                              ) : (
                                <span className="text-sm text-slate-400 italic">None</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5 items-start">
                              <Badge
                                variant="outline"
                                className={
                                  employee.work_mode === "SITE"
                                    ? "border-transparent bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 font-medium"
                                    : employee.work_mode === "OFFICE"
                                    ? "border-slate-200 bg-transparent text-slate-600 dark:border-slate-700 dark:text-slate-300 font-medium"
                                    : "border-transparent bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 font-medium" 
                                }
                              >
                                {employee.work_mode || "OFFICE"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                employee.active
                                  ? "border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium px-2.5 py-0.5"
                                  : "border-rose-200 bg-transparent text-rose-700 dark:border-rose-800 dark:text-rose-400 font-medium px-2.5 py-0.5"
                              }
                            >
                              {employee.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              {user?.role_rank === 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                                  onClick={() => handleEdit(employee)}
                                  title="Edit Employee"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {user?.role_rank === 1 && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 rounded-lg ml-1"
                                  onClick={() => {
                                    setResetEmployee(employee)
                                    setResetMode("generate")
                                    setResetPassword("")
                                    setTempPassword(null)
                                    setResetError("")
                                    setResetOpen(true)
                                  }}
                                  title="Reset Password"
                                >
                                  <KeyRound className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {user?.role_rank === 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg ml-1 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                  onClick={() => handleDelete(employee)}
                                  title={employee.active ? "Deactivate Employee" : "Already Inactive"}
                                  disabled={!employee.active}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </AnimatedTableRow>
                      ))}
                    </TableBody>
                  </AnimatedTable>
                </div>
              </div>
            </Card>
          )}

          {/* 9. Create Employee Dialog */}
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open)
              if (!open) {
                setFormData({
                  emp_code: "",
                  name: "",
                  mobile_number: "",
                  role: "EMPLOYEE",
                  department_id: departments[0]?.id || 0,
                  reporting_manager_id: null,
                  work_mode: "OFFICE",
                  join_date: new Date().toISOString().split("T")[0],
                  password: "",
                  active: true,
                })
              }
            }}
          >
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl border-slate-200/60 dark:border-slate-800/60 shadow-2xl">
              <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold">Create Employee</DialogTitle>
                    <DialogDescription className="mt-1 text-slate-500">
                      Add a new employee to the system with complete access details.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30 dark:bg-slate-900/10">
                {/* Section A: Basic Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <BadgeCheck className="h-4 w-4 text-slate-400" />
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">A. Basic Details</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="create-emp_code" className="text-sm font-medium">Employee Code *</Label>
                      <Input
                        id="create-emp_code"
                        value={formData.emp_code}
                        onChange={(e) => setFormData({ ...formData, emp_code: e.target.value })}
                        placeholder="EMP001"
                        required
                        disabled={submitting}
                        className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-name" className="text-sm font-medium">Full Name *</Label>
                      <Input
                        id="create-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        required
                        disabled={submitting}
                        className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-mobile" className="text-sm font-medium">Mobile Number</Label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="create-mobile"
                          type="tel"
                          value={formData.mobile_number ?? ""}
                          onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                          placeholder="+91 9876543210"
                          disabled={submitting}
                          className="pl-9 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-join_date" className="text-sm font-medium">Join Date *</Label>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="create-join_date"
                          type="date"
                          value={formData.join_date}
                          onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                          required
                          disabled={submitting}
                          className="pl-9 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section B: Organization Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <BriefcaseBusiness className="h-4 w-4 text-slate-400" />
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">B. Organization Details</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="create-role" className="text-sm font-medium">Role *</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) => {
                          const newRole = value as EmployeeRole
                          const rank = getRoleRank(newRole)
                          setFormData({
                            ...formData,
                            role: newRole,
                            reporting_manager_id: rank === 1 ? null : formData.reporting_manager_id
                          })
                          setManagerSearch("")
                        }}
                        disabled={submitting || roles.length === 0}
                      >
                        <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                          <SelectValue placeholder={roles.length === 0 ? "No roles found" : "Select role"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {roles.length === 0 ? (
                            <div className="py-2 px-3 text-sm text-muted-foreground">No roles available</div>
                          ) : (
                            roles.filter((r) => r.is_active).map((role) => (
                              <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-department" className="text-sm font-medium">Department *</Label>
                      <Select
                        value={formData.department_id.toString()}
                        onValueChange={(value) => {
                          const newDeptId = parseInt(value)
                          setFormData({
                            ...formData,
                            department_id: newDeptId,
                            reporting_manager_id: null
                          })
                          setManagerSearch("")
                          setManagerOptions([])
                        }}
                        disabled={submitting || departments.length === 0}
                      >
                        <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                          <SelectValue placeholder={departments.length === 0 ? "No departments found" : "Select department"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {departments.length === 0 ? (
                            <div className="py-2 px-3 text-sm text-muted-foreground">No departments available</div>
                          ) : (
                            departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {getRoleRank(formData.role) > 1 ? (
                      <div className="space-y-2 sm:col-span-2 p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                        <Label className="text-sm font-medium">Reporting Manager</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              placeholder="Search manager..."
                              value={managerSearch}
                              onChange={(e) => setManagerSearch(e.target.value)}
                              disabled={submitting}
                              className="pl-9 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                            />
                          </div>
                          <Select
                            onValueChange={(value) => setFormData({ ...formData, reporting_manager_id: value ? parseInt(value) : null })}
                            disabled={submitting || managerLoading}
                          >
                            <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                              <SelectValue placeholder={managerLoading ? "Loading..." : "Select manager"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {managerLoading ? (
                                <div className="py-2 px-3 text-sm text-muted-foreground">Loading managers...</div>
                              ) : managerOptions.length === 0 ? (
                                <div className="py-2 px-3 text-sm text-muted-foreground">
                                  {managerSearch ? 'No matches found' : 'No eligible managers'}
                                </div>
                              ) : (
                                managerOptions.map((manager) => (
                                  <SelectItem key={manager.id} value={manager.id.toString()}>
                                    {manager.name} ({manager.role_name})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 sm:col-span-2">
                         <Label className="text-sm font-medium text-slate-400">Reporting Manager</Label>
                         <p className="text-sm text-slate-500 italic">Admin roles do not require a reporting manager.</p>
                      </div>
                    )}
                    
                  </div>
                </div>

                {/* Section C: Attendance Location Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">C. Attendance Location Settings</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="create-work_mode" className="text-sm font-medium">Work Mode</Label>
                      <Select
                        value={formData.work_mode || "OFFICE"}
                        onValueChange={(value: WorkMode) => {
                          const newPolicy = value === "SITE" ? "FIELD_ANYWHERE" : "OFFICE_FIXED"
                          setFormData({ ...formData, work_mode: value, punch_location_policy: newPolicy, office_location_id: value === "SITE" ? null : formData.office_location_id })
                        }}
                        disabled={submitting}
                      >
                        <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                          <SelectValue placeholder="Select work mode" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="OFFICE">Office Employee</SelectItem>
                          <SelectItem value="SITE">Site / Field Employee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-punch_policy" className="text-sm font-medium">Punch Location Policy</Label>
                      <Select
                        value={formData.punch_location_policy || "OFFICE_FIXED"}
                        onValueChange={(value: PunchLocationPolicy) => setFormData({ ...formData, punch_location_policy: value })}
                        disabled={submitting || formData.work_mode === "SITE"}
                      >
                        <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                          <SelectValue placeholder="Select punch policy" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="OFFICE_FIXED">Strict Office Geofence</SelectItem>
                          <SelectItem value="FIELD_ANYWHERE">Anywhere (Field)</SelectItem>
                          <SelectItem value="HYBRID">Hybrid (Office + Field)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="create-office" className="text-sm font-medium">
                        Default Office Location 
                        {(formData.punch_location_policy === "OFFICE_FIXED" || formData.punch_location_policy === "HYBRID") && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Select
                        value={formData.office_location_id?.toString() || "none"}
                        onValueChange={(value) => setFormData({ ...formData, office_location_id: value === "none" ? null : parseInt(value) })}
                        disabled={submitting || formData.punch_location_policy === "FIELD_ANYWHERE"}
                      >
                        <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                          <SelectValue placeholder="Select office location" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="none">No Office Assigned</SelectItem>
                          {officeLocations.filter(loc => loc.is_active).map(loc => (
                            <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {formData.office_location_id && (
                        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-xs text-slate-500">
                          {(() => {
                            const selectedLoc = officeLocations.find(l => l.id === formData.office_location_id);
                            if (!selectedLoc) return null;
                            return (
                              <div className="grid grid-cols-2 gap-2">
                                <div><span className="font-semibold text-slate-700 dark:text-slate-300">Radius:</span> {selectedLoc.radius_meters}m</div>
                                <div><span className="font-semibold text-slate-700 dark:text-slate-300">Address:</span> <span className="line-clamp-1">{selectedLoc.address || "N/A"}</span></div>
                                <div className="col-span-2"><span className="font-semibold text-slate-700 dark:text-slate-300">Coordinates:</span> {selectedLoc.latitude}, {selectedLoc.longitude}</div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section D: Account Access */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">D. Account Access</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="create-password" className="text-sm font-medium">Initial Password</Label>
                      <Input
                        id="create-password"
                        type="password"
                        maxLength={MAX_PASSWORD_LENGTH}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value.slice(0, MAX_PASSWORD_LENGTH) })}
                        placeholder="Leave empty for auto-generated"
                        disabled={submitting}
                        className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                      />
                      {passwordError ? (
                        <p className="text-xs text-destructive">{passwordError}</p>
                      ) : (
                        <p className="text-xs text-slate-500">Optional. User forced to change on first login.</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <Switch
                        id="create-active"
                        checked={formData.active}
                        onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                        disabled={submitting}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      <div className="space-y-0.5">
                        <Label htmlFor="create-active" className="text-sm font-medium cursor-pointer">Active Account</Label>
                        <p className="text-xs text-slate-500">Allow login access</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="p-6 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10 flex sm:justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting} className="rounded-xl">
                  Cancel
                </Button>
                <Button onClick={handleSubmitCreate} disabled={submitting} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px] shadow-md shadow-indigo-600/20">
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    "Create Employee"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 9. Edit Employee Dialog */}
          <Dialog
            open={editOpen}
            onOpenChange={(open) => {
              setEditOpen(open)
              if (!open) setSelectedEmployee(null)
            }}
          >
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl border-slate-200/60 dark:border-slate-800/60 shadow-2xl">
              <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Edit className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold">Edit Employee</DialogTitle>
                    <DialogDescription className="mt-1 text-slate-500">
                      Update details for {formData.emp_code}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30 dark:bg-slate-900/10">
                {/* Section A: Basic Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <BadgeCheck className="h-4 w-4 text-slate-400" />
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">A. Basic Details</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="edit-emp_code" className="text-sm font-medium text-slate-500">Employee Code</Label>
                      <Input
                        id="edit-emp_code"
                        value={formData.emp_code}
                        disabled
                        className="rounded-xl bg-slate-100/50 dark:bg-slate-900/50 font-mono text-slate-500 border-slate-200 dark:border-slate-800"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-name" className="text-sm font-medium">Full Name *</Label>
                      <Input
                        id="edit-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        disabled={submitting}
                        className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-mobile" className="text-sm font-medium">Mobile Number</Label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="edit-mobile"
                          type="tel"
                          value={formData.mobile_number ?? ""}
                          onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                          placeholder="+91 9876543210"
                          disabled={submitting}
                          className="pl-9 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-join_date" className="text-sm font-medium">Join Date *</Label>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="edit-join_date"
                          type="date"
                          value={formData.join_date}
                          onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                          required
                          disabled={submitting}
                          className="pl-9 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section B: Organization Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <BriefcaseBusiness className="h-4 w-4 text-slate-400" />
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">B. Organization Details</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="edit-role" className="text-sm font-medium">Role *</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) => {
                          const newRole = value as EmployeeRole
                          setFormData({ ...formData, role: newRole })
                          setManagerSearch("")
                        }}
                        disabled={submitting}
                      >
                        <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {roles.length === 0 ? (
                            <>
                              <SelectItem value="EMPLOYEE">Employee</SelectItem>
                              <SelectItem value="MANAGER">Manager</SelectItem>
                              <SelectItem value="HR">HR</SelectItem>
                            </>
                          ) : (
                            roles.filter((r) => r.is_active).map((role) => (
                              <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-department" className="text-sm font-medium">Department *</Label>
                      <Select
                        value={formData.department_id.toString()}
                        onValueChange={(value) => setFormData({ ...formData, department_id: parseInt(value) })}
                        disabled={submitting}
                      >
                        <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {getRoleRank(formData.role) > 1 && (
                      <div className="space-y-2 sm:col-span-2 p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                        <Label className="text-sm font-medium">Reporting Manager</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              placeholder="Search manager..."
                              value={managerSearch}
                              onChange={(e) => setManagerSearch(e.target.value)}
                              disabled={submitting}
                              className="pl-9 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                            />
                          </div>
                          <Select
                            value={formData.reporting_manager_id ? formData.reporting_manager_id.toString() : undefined}
                            onValueChange={(value) => setFormData({ ...formData, reporting_manager_id: value ? parseInt(value) : null })}
                            disabled={submitting || managerLoading}
                          >
                            <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                              <SelectValue placeholder={managerLoading ? "Loading..." : "Select manager"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {managerLoading ? (
                                <div className="py-2 px-3 text-sm text-muted-foreground">Loading managers...</div>
                              ) : managerOptions.length === 0 ? (
                                <div className="py-2 px-3 text-sm text-muted-foreground">
                                  {managerSearch ? 'No matches found' : 'No eligible managers'}
                                </div>
                              ) : (
                                managerOptions.map((manager) => (
                                  <SelectItem key={manager.id} value={manager.id.toString()}>
                                    {manager.name} ({manager.role_name})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    
                  </div>
                </div>

                {/* Section C: Attendance Location Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">C. Attendance Location Settings</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="edit-work_mode" className="text-sm font-medium">Work Mode</Label>
                      <Select
                        value={formData.work_mode || "OFFICE"}
                        onValueChange={(value: WorkMode) => {
                          const newPolicy = value === "SITE" ? "FIELD_ANYWHERE" : "OFFICE_FIXED"
                          setFormData({ ...formData, work_mode: value, punch_location_policy: newPolicy, office_location_id: value === "SITE" ? null : formData.office_location_id })
                        }}
                        disabled={submitting}
                      >
                        <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                          <SelectValue placeholder="Select work mode" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="OFFICE">Office Employee</SelectItem>
                          <SelectItem value="SITE">Site / Field Employee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-punch_policy" className="text-sm font-medium">Punch Location Policy</Label>
                      <Select
                        value={formData.punch_location_policy || "OFFICE_FIXED"}
                        onValueChange={(value: PunchLocationPolicy) => setFormData({ ...formData, punch_location_policy: value })}
                        disabled={submitting || formData.work_mode === "SITE"}
                      >
                        <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                          <SelectValue placeholder="Select punch policy" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="OFFICE_FIXED">Strict Office Geofence</SelectItem>
                          <SelectItem value="FIELD_ANYWHERE">Anywhere (Field)</SelectItem>
                          <SelectItem value="HYBRID">Hybrid (Office + Field)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="edit-office" className="text-sm font-medium">
                        Default Office Location 
                        {(formData.punch_location_policy === "OFFICE_FIXED" || formData.punch_location_policy === "HYBRID") && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Select
                        value={formData.office_location_id?.toString() || "none"}
                        onValueChange={(value) => setFormData({ ...formData, office_location_id: value === "none" ? null : parseInt(value) })}
                        disabled={submitting || formData.punch_location_policy === "FIELD_ANYWHERE"}
                      >
                        <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                          <SelectValue placeholder="Select office location" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="none">No Office Assigned</SelectItem>
                          {officeLocations.filter(loc => loc.is_active || loc.id === formData.office_location_id).map(loc => (
                            <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name} {!loc.is_active && "(Inactive)"}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {formData.office_location_id && (
                        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-xs text-slate-500">
                          {(() => {
                            const selectedLoc = officeLocations.find(l => l.id === formData.office_location_id);
                            if (!selectedLoc) return null;
                            return (
                              <div className="grid grid-cols-2 gap-2">
                                <div><span className="font-semibold text-slate-700 dark:text-slate-300">Radius:</span> {selectedLoc.radius_meters}m</div>
                                <div><span className="font-semibold text-slate-700 dark:text-slate-300">Address:</span> <span className="line-clamp-1">{selectedLoc.address || "N/A"}</span></div>
                                <div className="col-span-2"><span className="font-semibold text-slate-700 dark:text-slate-300">Coordinates:</span> {selectedLoc.latitude}, {selectedLoc.longitude}</div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section D: Account Access */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">D. Account Access</h4>
                  </div>
                  <div className="flex items-center space-x-3 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Switch
                      id="edit-active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                      disabled={submitting}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="edit-active" className="text-sm font-medium cursor-pointer">Active Account</Label>
                      <p className="text-xs text-slate-500">Allow login access</p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="p-6 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10 flex sm:justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={submitting} className="rounded-xl">
                  Cancel
                </Button>
                <Button onClick={handleSubmitEdit} disabled={submitting} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px] shadow-md shadow-indigo-600/20">
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating...</>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 10. Reset Password Dialog */}
          <Dialog
            open={resetOpen}
            onOpenChange={(open) => {
              setResetOpen(open)
              if (!open) {
                setResetEmployee(null)
                setResetMode("generate")
                setResetPassword("")
                setTempPassword(null)
                setResetError("")
              }
            }}
          >
            <DialogContent className="max-w-md p-0 rounded-2xl overflow-hidden border-slate-200/60 dark:border-slate-800/60 shadow-xl">
              <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold">Reset Password</DialogTitle>
                    <DialogDescription className="mt-1 text-slate-500">
                      User will be forced to change password on next login.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="p-6 space-y-6">
                {resetEmployee && (
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shadow-sm shrink-0">
                      {resetEmployee.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{resetEmployee.name}</p>
                      <code className="text-xs font-mono text-slate-500 bg-slate-200/50 dark:bg-slate-800 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {resetEmployee.emp_code}
                      </code>
                    </div>
                  </div>
                )}
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                  <button
                    type="button"
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${resetMode === "generate" ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                    onClick={() => setResetMode("generate")}
                  >
                    Generate Temporary
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${resetMode === "manual" ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                    onClick={() => setResetMode("manual")}
                  >
                    Set Manually
                  </button>
                </div>
                {resetMode === "manual" && (
                  <div className="space-y-2">
                    <Label htmlFor="reset-password">New Password</Label>
                    <Input
                      id="reset-password"
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="Enter a strong password"
                      disabled={resetSubmitting || !!tempPassword}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-slate-500">
                      Must be at least 8 characters with uppercase, number and special character.
                    </p>
                  </div>
                )}
                {resetError && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}
                {tempPassword && (
                  <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 space-y-3">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Generated Password (shown once):</p>
                    <div className="flex items-center gap-2">
                      <Input value={tempPassword} readOnly className="bg-white dark:bg-slate-950 rounded-xl font-mono border-emerald-200 dark:border-emerald-800" />
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                        onClick={() => {
                          navigator.clipboard.writeText(tempPassword)
                          toast({ title: "Copied", description: "Temporary password copied to clipboard" })
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex sm:justify-end gap-2">
                <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetSubmitting} className="rounded-xl">
                  Close
                </Button>
                <Button
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px] shadow-sm shadow-indigo-600/20"
                  onClick={async () => {
                    if (!resetEmployee) return
                    setResetSubmitting(true)
                    setResetError("")
                    try {
                      const payload =
                        resetMode === "generate"
                          ? { generate_random: true }
                          : { generate_random: false, new_password: resetPassword }
                      const resp = await api.post<{ temp_password?: string }>(
                        `/api/v1/admin/users/${resetEmployee.id}/reset-password`,
                        payload
                      )
                      const tmp = (resp && (resp as any).temp_password) || undefined
                      if (tmp) {
                        setTempPassword(tmp)
                      }
                      toast({
                        title: "Password reset",
                        description: tmp ? "Temporary password generated." : "Password set successfully.",
                      })
                    } catch (err) {
                      if (err instanceof ApiClientError) {
                        setResetError(err.data.detail || "Failed to reset password")
                      } else {
                        setResetError("An unexpected error occurred")
                      }
                    } finally {
                      setResetSubmitting(false)
                    }
                  }}
                  disabled={resetSubmitting || (resetMode === "manual" && resetPassword.length === 0) || !!tempPassword}
                >
                  {resetSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : resetMode === "generate" ? "Generate Password" : "Set Password"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 11. Delete Confirmation Dialog */}
          <AlertDialog
            open={deleteOpen}
            onOpenChange={(open) => {
              setDeleteOpen(open)
              if (!open) setSelectedEmployee(null)
            }}
          >
            <AlertDialogContent className="rounded-2xl p-0 overflow-hidden max-w-md border-slate-200/60 dark:border-slate-800/60 shadow-xl">
              <div className="p-8 bg-rose-50/80 dark:bg-rose-950/20 flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center mb-5 text-rose-600 dark:text-rose-400 ring-8 ring-rose-50 dark:ring-rose-950/30">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <AlertDialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Deactivate Employee?
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-3 text-slate-600 dark:text-slate-400">
                  Are you sure you want to deactivate <strong className="text-slate-900 dark:text-slate-200">{selectedEmployee?.name} ({selectedEmployee?.emp_code})</strong>? This will revoke their access to the system immediately. Historical data is preserved.
                </AlertDialogDescription>
              </div>
              <AlertDialogFooter className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex sm:justify-between gap-2">
                <AlertDialogCancel disabled={submitting} className="rounded-xl flex-1 sm:flex-none border-slate-200 dark:border-slate-800">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                  className="rounded-xl flex-1 sm:flex-none bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/20 border-0"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deactivating</>
                  ) : (
                    "Yes, Deactivate"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <DebugPanel />
        </div>
      </PageContainer>
    </RequireRole>
  )
}
