"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { RequireRole } from "@/components/auth/RequireRole"
import { DebugPanel } from "@/components/debug/DebugPanel"
import { Holiday, HolidayCreate, HolidayUpdate } from "@/types/models"
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
import { Plus, Edit, Trash2, Loader2, Search } from "lucide-react"
import { format } from "date-fns"

export default function HolidaysPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterYear, setFilterYear] = useState<number | "ALL">(
    new Date().getFullYear()
  )
  const [filterActive, setFilterActive] = useState<boolean | "ALL">("ALL")
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null)
  const [formData, setFormData] = useState<HolidayCreate>({
    year: new Date().getFullYear(),
    date: new Date().toISOString().split("T")[0],
    name: "",
    active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string>("")

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchHolidays()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filterYear])

  const fetchHolidays = async () => {
    setLoading(true)
    setApiError("")
    try {
      const yearParam =
        filterYear !== "ALL" ? `?year=${filterYear}` : ""
      const data = await api.get<Holiday[]>(`/api/v1/holidays${yearParam}`)
      setHolidays(data || [])

      if (user && data && data.length === 0) {
        // No holidays returned by API. Check backend endpoint or filters.
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        let errorMsg
        if (err.status === 403) {
          errorMsg = "Admin access required to view holidays"
        } else {
          errorMsg = err.data.detail || "Failed to fetch holidays"
        }
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
    setFormData({
      year: filterYear !== "ALL" ? filterYear : new Date().getFullYear(),
      date: new Date().toISOString().split("T")[0],
      name: "",
      active: true,
    })
    setSelectedHoliday(null)
    setCreateOpen(true)
  }

  const handleEdit = (holiday: Holiday) => {
    setSelectedHoliday(holiday)
    setFormData({
      year: holiday.year,
      date: holiday.date.split("T")[0],
      name: holiday.name,
      active: holiday.active,
    })
    setEditOpen(true)
  }

  const handleDelete = (holiday: Holiday) => {
    setSelectedHoliday(holiday)
    setDeleteOpen(true)
  }

  const handleSubmitCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Holiday name is required",
      })
      return
    }
    if (!formData.date) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Holiday date is required",
      })
      return
    }

    setSubmitting(true)
    try {
      await api.post<Holiday>("/api/v1/holidays", formData)
      toast({
        title: "Success",
        description: "Holiday created successfully",
      })
      setCreateOpen(false)
      await fetchHolidays()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to create holiday",
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
        description: "Holiday name is required",
      })
      return
    }

    if (!selectedHoliday) return

    setSubmitting(true)
    try {
      const updateData: HolidayUpdate = {
        name: formData.name,
        active: formData.active,
      }
      await api.patch<Holiday>(
        `/api/v1/holidays/${selectedHoliday.id}`,
        updateData
      )
      toast({
        title: "Success",
        description: "Holiday updated successfully",
      })
      setEditOpen(false)
      setSelectedHoliday(null)
      await fetchHolidays()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to update holiday",
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
    if (!selectedHoliday) return

    setSubmitting(true)
    try {
      await api.patch<Holiday>(`/api/v1/holidays/${selectedHoliday.id}`, {
        active: false,
      })
      toast({
        title: "Success",
        description: "Holiday deactivated successfully",
      })
      setDeleteOpen(false)
      setSelectedHoliday(null)
      await fetchHolidays()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to deactivate holiday",
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

  // Filter holidays
  const filteredHolidays = holidays.filter((holiday) => {
    const matchesSearch =
      holiday.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      holiday.date.includes(searchQuery)
    const matchesActive =
      filterActive === "ALL" || holiday.active === filterActive

    return matchesSearch && matchesActive
  })

  // Generate year options (current year ± 2)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <RequireRole allowedRoles={["ADMIN"]}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Holidays</h1>
            <p className="text-muted-foreground">Manage holidays calendar</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Holiday
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Year
              </Label>
              <Select
                value={filterYear.toString()}
                onValueChange={(value) =>
                  setFilterYear(value === "ALL" ? "ALL" : parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Years</SelectItem>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
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
                  setFilterActive(value === "ALL" ? "ALL" : value === "true")
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

        {/* API Error Banner */}
        {apiError && !loading && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">
              <strong>API Error:</strong> {apiError}
            </p>
          </div>
        )}

        {/* Warning Banner if empty but authenticated */}
        {!loading && !apiError && holidays.length === 0 && user && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> No holidays returned by API. Check
              backend endpoint or filters.
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
        ) : filteredHolidays.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center border rounded-lg p-12">
            <p className="text-lg text-muted-foreground mb-4">
              {searchQuery || filterActive !== "ALL"
                ? "No holidays match your filters"
                : "No holidays found"}
            </p>
            {!searchQuery && filterActive === "ALL" && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Holiday
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-lg bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHolidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-medium">{holiday.year}</TableCell>
                    <TableCell>
                      {holiday.date
                        ? format(new Date(holiday.date), "MMM dd, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>{holiday.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={holiday.active ? "default" : "secondary"}
                      >
                        {holiday.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(holiday)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {holiday.active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(holiday)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
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
                year: filterYear !== "ALL" ? filterYear : new Date().getFullYear(),
                date: new Date().toISOString().split("T")[0],
                name: "",
                active: true,
              })
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Holiday</DialogTitle>
              <DialogDescription>
                Add a new holiday to the calendar.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-year">Year *</Label>
                  <Input
                    id="create-year"
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        year: parseInt(e.target.value) || new Date().getFullYear(),
                      })
                    }
                    required
                    disabled={submitting}
                    min="2020"
                    max="2100"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-date">Date *</Label>
                  <Input
                    id="create-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-name">Name *</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Republic Day"
                  required
                  disabled={submitting}
                />
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
              setSelectedHoliday(null)
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Holiday</DialogTitle>
              <DialogDescription>
                Update holiday information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
              setSelectedHoliday(null)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Holiday</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deactivate{" "}
                <strong>{selectedHoliday?.name}</strong>? This will mark the
                holiday as inactive.
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
      </div>
    </RequireRole>
  )
}
