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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Edit, Trash2, Loader2, Search } from "lucide-react"
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

  return (
    <RequireRole allowedRoles={["ADMIN"]}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Roles</h1>
            <p className="text-muted-foreground">
              Manage role master and WFH enablement.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Role
          </Button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search roles..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : apiError ? (
          <p className="text-sm text-destructive">{apiError}</p>
        ) : filteredRoles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No roles found. Try adjusting your search or create a new role.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>WFH Enabled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>{role.role_rank}</TableCell>
                    <TableCell>
                      <Badge
                        variant={role.wfh_enabled ? "default" : "outline"}
                      >
                        {role.wfh_enabled ? "WFH enabled" : "WFH disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.is_active ? "default" : "outline"}>
                        {role.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {role.created_at
                        ? format(new Date(role.created_at), "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {role.updated_at
                        ? format(new Date(role.updated_at), "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleEdit(role)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleDelete(role)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Create Dialog */}
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open)
            if (!open) {
              setFormData({
                name: "",
                role_rank: 10,
                wfh_enabled: false,
                is_active: true,
              })
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Role</DialogTitle>
              <DialogDescription>
                Define a new role and whether WFH is allowed for it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="role-name">Name *</Label>
                <Input
                  id="role-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. EMPLOYEE, MANAGER, HR"
                  disabled={submitting}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role-rank">
                  Rank *{" "}
                  <span className="text-xs text-muted-foreground">
                    (1 = highest authority)
                  </span>
                </Label>
                <Input
                  id="role-rank"
                  type="number"
                  min={1}
                  value={formData.role_rank}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role_rank: Number(e.target.value) || 1,
                    })
                  }
                  disabled={submitting}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="role-wfh"
                  checked={formData.wfh_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, wfh_enabled: checked })
                  }
                  disabled={submitting}
                />
                <Label htmlFor="role-wfh">WFH enabled for this role</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="role-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                  disabled={submitting}
                />
                <Label htmlFor="role-active">Active</Label>
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
              setSelectedRole(null)
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>
                Update role name or WFH configuration.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-role-name">Name *</Label>
                <Input
                  id="edit-role-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={submitting}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-role-rank">
                  Rank *{" "}
                  <span className="text-xs text-muted-foreground">
                    (1 = highest authority)
                  </span>
                </Label>
                <Input
                  id="edit-role-rank"
                  type="number"
                  min={1}
                  value={formData.role_rank}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role_rank: Number(e.target.value) || 1,
                    })
                  }
                  disabled={submitting}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-role-wfh"
                  checked={formData.wfh_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, wfh_enabled: checked })
                  }
                  disabled={submitting}
                />
                <Label htmlFor="edit-role-wfh">WFH enabled for this role</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-role-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                  disabled={submitting}
                />
                <Label htmlFor="edit-role-active">Active</Label>
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
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deactivate dialog */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate role?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the role as inactive. Existing employees will
                keep their role, but it will no longer be selectable for new
                assignments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} disabled={submitting}>
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

        <DebugPanel />
      </div>
    </RequireRole>
  )
}

