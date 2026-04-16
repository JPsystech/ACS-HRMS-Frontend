"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw, Save, Search } from "lucide-react"

import { RequireRole } from "@/components/auth/RequireRole"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageContainer } from "@/components/ui/page-container"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { ApiClientError } from "@/lib/api"
import {
  listPayrollEmployeeEmailMapping,
  updatePayrollEmployeeEmailMapping,
} from "@/services/payroll"
import { useAuthStore } from "@/store/auth-store"
import {
  PayrollEmployeeEmailMapping,
  PayrollEmployeeEmailMappingUpdate,
} from "@/types/payroll"

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.data?.detail || error.message || "Something went wrong."
  }
  if (error instanceof Error && error.message.trim()) return error.message
  return "Something went wrong."
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "ok") return "default"
  if (status === "invalid") return "destructive"
  return "secondary"
}

export default function PayrollEmployeeEmailMappingPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()

  const [items, setItems] = useState<PayrollEmployeeEmailMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [search, setSearch] = useState("")

  const [editing, setEditing] = useState<PayrollEmployeeEmailMapping | null>(null)
  const [editForm, setEditForm] = useState<PayrollEmployeeEmailMappingUpdate>({})
  const [saving, setSaving] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const rows = await listPayrollEmployeeEmailMapping({
        limit: 500,
        activeOnly: true,
        search: search.trim() || undefined,
      })
      setItems(rows)
    } catch (error) {
      setItems([])
      setErrorMessage(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    if (user && (user.role === "HR" || user.role === "ADMIN")) {
      fetchList()
    }
  }, [fetchList, user])

  const handleOpenEdit = useCallback((row: PayrollEmployeeEmailMapping) => {
    setEditing(row)
    setEditForm({
      official_email: row.official_email ?? "",
      personal_email: row.personal_email ?? "",
      preferred_email_type: row.preferred_email_type,
      email_notifications_enabled: row.email_notifications_enabled,
    })
  }, [])

  const canSave = useMemo(() => {
    if (!editing) return false
    return true
  }, [editing])

  const handleSave = useCallback(async () => {
    if (!editing) return
    setSaving(true)
    try {
      const payload: PayrollEmployeeEmailMappingUpdate = {
        official_email:
          typeof editForm.official_email === "string"
            ? editForm.official_email.trim() || null
            : undefined,
        personal_email:
          typeof editForm.personal_email === "string"
            ? editForm.personal_email.trim() || null
            : undefined,
        preferred_email_type: editForm.preferred_email_type ?? null,
        email_notifications_enabled:
          typeof editForm.email_notifications_enabled === "boolean"
            ? editForm.email_notifications_enabled
            : undefined,
      }

      const updated = await updatePayrollEmployeeEmailMapping(editing.employee_id, payload)
      setItems((prev) =>
        prev.map((row) => (row.employee_id === updated.employee_id ? updated : row))
      )
      setEditing(null)
      toast({
        title: "Employee email updated",
        description: `${updated.employee_name} (${updated.employee_code})`,
      })
    } catch (error) {
      toast({
        title: "Unable to update employee email",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [editForm.email_notifications_enabled, editForm.official_email, editForm.personal_email, editForm.preferred_email_type, editing, toast])

  return (
    <RequireRole allowedRoles={["HR", "ADMIN"]}>
      <PageContainer
        title="Employee Email Mapping"
        description="Configure employee email addresses used for payroll reminder emails."
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Employees</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={fetchList} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex w-full items-center gap-2 md:max-w-md">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code or name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button onClick={fetchList} disabled={loading}>
                Apply
              </Button>
            </div>

            {errorMessage ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Official Email</TableHead>
                    <TableHead>Personal Email</TableHead>
                    <TableHead>Preferred</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Resolved</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                        No employees found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((row) => (
                      <TableRow key={row.employee_id}>
                        <TableCell className="font-medium">
                          <div>{row.employee_name}</div>
                          <div className="text-xs text-muted-foreground">{row.employee_code}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{row.official_email || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{row.personal_email || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{row.preferred_email_type || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={row.email_notifications_enabled ? "default" : "secondary"}>
                            {row.email_notifications_enabled ? "On" : "Off"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(row.email_status)}>
                            {String(row.email_status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{row.resolved_send_email || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Dialog
                            open={editing?.employee_id === row.employee_id}
                            onOpenChange={(open) => {
                              if (!open) setEditing(null)
                              else handleOpenEdit(row)
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => handleOpenEdit(row)}>
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                              <DialogHeader>
                                <DialogTitle>
                                  Edit Email: {row.employee_name} ({row.employee_code})
                                </DialogTitle>
                              </DialogHeader>

                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="official-email">Official Email</Label>
                                  <Input
                                    id="official-email"
                                    value={String(editForm.official_email ?? "")}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        official_email: e.target.value,
                                      }))
                                    }
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="personal-email">Personal Email</Label>
                                  <Input
                                    id="personal-email"
                                    value={String(editForm.personal_email ?? "")}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        personal_email: e.target.value,
                                      }))
                                    }
                                  />
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>Preferred Email</Label>
                                    <Select
                                      value={editForm.preferred_email_type ?? "none"}
                                      onValueChange={(value) =>
                                        setEditForm((prev) => ({
                                          ...prev,
                                          preferred_email_type: value === "none" ? null : (value as "official" | "personal"),
                                        }))
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Auto" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Auto</SelectItem>
                                        <SelectItem value="official">Official</SelectItem>
                                        <SelectItem value="personal">Personal</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Email Notifications</Label>
                                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                      <div className="text-sm text-muted-foreground">Enable</div>
                                      <Switch
                                        checked={Boolean(editForm.email_notifications_enabled)}
                                        onCheckedChange={(checked) =>
                                          setEditForm((prev) => ({
                                            ...prev,
                                            email_notifications_enabled: checked,
                                          }))
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-md border bg-muted/20 p-3 text-sm">
                                  <div className="flex justify-between gap-3">
                                    <span className="text-muted-foreground">Resolved email</span>
                                    <span className="font-medium">{row.resolved_send_email || "—"}</span>
                                  </div>
                                  <div className="flex justify-between gap-3">
                                    <span className="text-muted-foreground">Current status</span>
                                    <span className="font-medium">{String(row.email_status)}</span>
                                  </div>
                                </div>
                              </div>

                              <DialogFooter>
                                <Button onClick={handleSave} disabled={!canSave || saving}>
                                  {saving ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                  )}
                                  Save
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </RequireRole>
  )
}

