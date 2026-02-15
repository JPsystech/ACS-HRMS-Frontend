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
import { Plus, Edit, Trash2, Loader2, Search, Users } from "lucide-react"
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
      // Fetch employees, departments, and roles in parallel
      const [employeesData, departmentsData, rolesData] = await Promise.all([
        api.get<Employee[]>("/api/v1/employees"),
        api.get<Department[]>("/api/v1/departments"),
        api.get<RoleDefinition[]>("/api/v1/roles").catch(() => []),
      ])

      setEmployees(employeesData || [])
      setDepartments(departmentsData || [])
      setRoles(Array.isArray(rolesData) ? rolesData : [])

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

        work_mode: formData.work_mode,
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
      <PageContainer
        title="Employees"
        description="Manage employee information, roles, and departments"
        action={
          user?.role_rank === 1 && (
            <Button onClick={handleCreate} className="shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Employee
            </Button>
          )
        }
      >
        {/* Search and Filters */}
        <Card className="border-0 shadow-sm mb-4">
          <CardContent className="pt-6">
            <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or employee code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Role
              </Label>
              <Select
                value={filterRole}
                onValueChange={(value) =>
                  setFilterRole(value as EmployeeRole | "ALL")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Department
              </Label>
              <Select
                value={filterDepartment.toString()}
                onValueChange={(value) =>
                  setFilterDepartment(value === "ALL" ? "ALL" : parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Status
              </Label>
              <Select
                value={filterActive === "ALL" ? "ALL" : filterActive.toString()}
                onValueChange={(value) =>
                  setFilterActive(
                    value === "ALL" ? "ALL" : value === "true"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          </div>
        </CardContent>
        </Card>

        {/* API Error Banner */}
        {apiError && !loading && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">
              <strong>API Error:</strong> {apiError}
            </p>
          </div>
        )}

        {/* Warning Banner if empty but authenticated */}
        {!loading && !apiError && employees.length === 0 && user && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> No employees returned by API. Check
              backend endpoint or org scoping.
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
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              searchQuery || filterRole !== "ALL" || filterDepartment !== "ALL" || filterActive !== "ALL"
                ? "No employees match your filters"
                : "No employees found"
            }
            description={
              searchQuery || filterRole !== "ALL" || filterDepartment !== "ALL" || filterActive !== "ALL"
                ? "Try adjusting your search or filter criteria"
                : "Get started by creating your first employee"
            }
            action={
              !searchQuery &&
              filterRole === "ALL" &&
              filterDepartment === "ALL" &&
              filterActive === "ALL"
                ? {
                    label: "Create First Employee",
                    onClick: handleCreate,
                  }
                : undefined
            }
          />
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <AnimatedTable>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Emp Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>

                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee, index) => (
                      <AnimatedTableRow key={employee.id} delay={index * 0.03}>
                    <TableCell className="font-medium">
                      {employee.emp_code}
                    </TableCell>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.mobile_number || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          employee.role === "HR"
                            ? "default"
                            : employee.role === "MANAGER"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {employee.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getDepartmentName(employee.department_id)}
                    </TableCell>
                    <TableCell>
                      {/* {employee.reporting_manager ? `${employee.reporting_manager.emp_code} - ${employee.reporting_manager.name}` : "None"} */}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={employee.active ? "default" : "secondary"}
                        className={employee.active ? "animate-pulse" : ""}
                      >
                        {employee.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user?.role_rank === 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {user?.role_rank === 1 && employee.active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(employee)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                      </AnimatedTableRow>
                    ))}
                  </TableBody>
                </AnimatedTable>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Dialog */}
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

                join_date: new Date().toISOString().split("T")[0],
                password: "",
                active: true,
              })
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Employee</DialogTitle>
              <DialogDescription>
                Add a new employee to the system.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-emp_code">Employee Code *</Label>
                  <Input
                    id="create-emp_code"
                    value={formData.emp_code}
                    onChange={(e) =>
                      setFormData({ ...formData, emp_code: e.target.value })
                    }
                    placeholder="EMP001"
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-name">Name *</Label>
                  <Input
                    id="create-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="John Doe"
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-mobile">Mobile Number</Label>
                  <Input
                    id="create-mobile"
                    type="tel"
                    value={formData.mobile_number ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile_number: e.target.value })
                    }
                    placeholder="+91 9876543210"
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => {
                      const newRole = value as EmployeeRole
                      const rank = getRoleRank(newRole)
                      setFormData({
                        ...formData,
                        role: newRole,
                        reporting_manager_id: getRoleRank(newRole) === 1 ? null : formData.reporting_manager_id
                      })
                      setManagerSearch("")

                    }}
                    disabled={submitting || roles.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={roles.length === 0 ? "No roles found" : "Select role"} />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.length === 0 ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">
                          No roles available
                        </div>
                      ) : (
                        roles
                          .filter((r) => r.is_active)
                          .map((role) => (
                            <SelectItem key={role.id} value={role.name}>
                              {role.name} (Rank: {role.role_rank})
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-department">Department *</Label>
                  <Select
                    value={formData.department_id.toString()}
                    onValueChange={(value) => {
                      const newDeptId = parseInt(value)
                      setFormData({
                        ...formData,
                        department_id: newDeptId,
                        reporting_manager_id: null // Clear manager when department changes
                      })
                      setManagerSearch("")
                      setManagerOptions([])
                    }}
                    disabled={submitting || departments.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={departments.length === 0 ? "No departments found" : "Select department"} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.length === 0 ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">
                          No departments available
                        </div>
                      ) : (
                        departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id.toString()}>
                            {dept.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {departments.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      <a href="/departments" className="text-blue-500 hover:underline">
                        Create departments first
                      </a>
                    </p>
                  )}
                </div>
              </div>
              {getRoleRank(formData.role) > 1 ? (
                <div className="grid gap-2">

                  <div className="flex gap-2">
                    <Input
                      id="create-manager-search"
                      placeholder="Search by name or code..."
                      value={managerSearch}
                      onChange={(e) => {
                        const value = e.target.value
                        setManagerSearch(value)

                      }}
                      disabled={submitting}
                    />
                  </div>
                  <Select

                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        reporting_manager_id: value ? parseInt(value) : null
                      })
                    }
                    disabled={submitting || managerLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={managerLoading ? "Loading..." : "Select manager"} />
                    </SelectTrigger>
                    <SelectContent>
                      {managerLoading ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">
                          Loading managers...
                        </div>
                      ) : managerOptions.length === 0 ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">
                          {managerSearch ? 'No managers found matching your search' : 'No eligible reporting managers found'}
                        </div>
                      ) : (
                        managerOptions.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id.toString()}>
                            {manager.emp_code} - {manager.name} ({manager.role_name})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only employees with a higher role rank than the selected role are listed.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="create-reporting-manager">Reporting Manager</Label>
                  <p className="text-xs text-muted-foreground">
                    No reporting manager required for Admin role (rank 1)
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-join_date">Join Date *</Label>
                  <Input
                    id="create-join_date"
                    type="date"
                    value={formData.join_date}
                    onChange={(e) =>
                      setFormData({ ...formData, join_date: e.target.value })
                    }
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-password">Password</Label>
                  <Input
                    id="create-password"
                    type="password"
                    maxLength={MAX_PASSWORD_LENGTH}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        password: e.target.value.slice(0, MAX_PASSWORD_LENGTH),
                      })
                    }
                    placeholder="Leave empty for default"
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. 6-{MAX_PASSWORD_LENGTH} characters; leave empty to
                    let backend assign a default password.
                  </p>
                  {passwordError && (
                    <p className="text-xs text-destructive">{passwordError}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-work_mode">Work Mode</Label>
                <Select
                  value={formData.work_mode || "OFFICE"}
                  onValueChange={(value: WorkMode) =>
                    setFormData({ ...formData, work_mode: value })
                  }
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select work mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFFICE">Office</SelectItem>
                    <SelectItem value="SITE">Site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="create-active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                  disabled={submitting}
                />
                <Label htmlFor="create-active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitCreate} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) {
              setSelectedEmployee(null)
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription>
                Update employee information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-emp_code">Employee Code</Label>
                  <Input
                    id="edit-emp_code"
                    value={formData.emp_code}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Employee code cannot be changed
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-mobile">Mobile Number</Label>
                  <Input
                    id="edit-mobile"
                    type="tel"
                    value={formData.mobile_number ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile_number: e.target.value })
                    }
                    placeholder="+91 9876543210"
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => {
                      const newRole = value as EmployeeRole
                      const rank = getRoleRank(newRole)
                      setFormData({
                        ...formData,
                        role: newRole,

                      })
                      setManagerSearch("")

                    }}
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.length === 0 ? (
                        <>
                          <SelectItem value="EMPLOYEE">Employee</SelectItem>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                        </>
                      ) : (
                        roles
                          .filter((r) => r.is_active)
                          .map((role) => (
                            <SelectItem key={role.id} value={role.name}>
                              {role.name}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-department">Department *</Label>
                  <Select
                    value={formData.department_id.toString()}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        department_id: parseInt(value),
                      })
                    }
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {getRoleRank(formData.role) > 1 && (
                <div className="grid gap-2">

                  <div className="flex gap-2">
                    <Input
                      id="edit-manager-search"
                      placeholder="Search by name or code..."
                      value={managerSearch}
                      onChange={(e) => {
                        const value = e.target.value
                        setManagerSearch(value)

                      }}
                      disabled={submitting}
                    />
                  </div>
                  <Select

                    onValueChange={(value) =>
                      setFormData({
                        ...formData,

                      })
                    }
                    disabled={submitting || managerLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={managerLoading ? "Loading..." : "Select manager"} />
                    </SelectTrigger>
                    <SelectContent>
                      {managerLoading ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">
                          Loading managers...
                        </div>
                      ) : managerOptions.length === 0 ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">
                          {managerSearch ? 'No managers found matching your search' : 'No eligible reporting managers found'}
                        </div>
                      ) : (
                        managerOptions.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id.toString()}>
                            {manager.emp_code} - {manager.name} ({manager.role_name})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only employees with a higher role rank than the selected role are listed.
                  </p>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="edit-join_date">Join Date *</Label>
                <Input
                  id="edit-join_date"
                  type="date"
                  value={formData.join_date}
                  onChange={(e) =>
                    setFormData({ ...formData, join_date: e.target.value })
                  }
                  required
                  disabled={submitting}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-work_mode">Work Mode</Label>
                <Select
                  value={formData.work_mode || "OFFICE"}
                  onValueChange={(value: WorkMode) =>
                    setFormData({ ...formData, work_mode: value })
                  }
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select work mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFFICE">Office</SelectItem>
                    <SelectItem value="SITE">Site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                  disabled={submitting}
                />
                <Label htmlFor="edit-active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitEdit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open)
            if (!open) {
              setSelectedEmployee(null)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deactivate{" "}
                <strong>
                  {selectedEmployee?.name} ({selectedEmployee?.emp_code})
                </strong>
                ? This will mark the employee as inactive.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  "Deactivate"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Debug Panel */}
        <DebugPanel />
      </PageContainer>
    </RequireRole>
  )
}
