"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError, apiUpload } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { RequireRole } from "@/components/auth/RequireRole"
import { DebugPanel } from "@/components/debug/DebugPanel"
import { CompanyEvent, CompanyEventCreate, CompanyEventUpdate } from "@/types/models"
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
import { Plus, Edit, Trash2, Loader2, Search, Image as ImageIcon, MapPin } from "lucide-react"
import { format } from "date-fns"
import { Textarea } from "@/components/ui/textarea"

export default function CompanyEventsPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [events, setEvents] = useState<CompanyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterYear, setFilterYear] = useState<number | "ALL">(new Date().getFullYear())
  const [filterActive, setFilterActive] = useState<boolean | "ALL">("ALL")
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CompanyEvent | null>(null)
  const [formData, setFormData] = useState<CompanyEventCreate>({
    year: new Date().getFullYear(),
    date: new Date().toISOString().split("T")[0],
    name: "",
    description: "",
    image_url: "",
    location: "",
    active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string>("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string>("")

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchEvents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filterYear, filterActive])

  const fetchEvents = async () => {
    setLoading(true)
    setApiError("")
    try {
      const params = []
      if (filterYear !== "ALL") params.push(`year=${filterYear}`)
      if (filterActive !== "ALL") params.push(`active=${filterActive}`)
      const query = params.length ? `?${params.join("&")}` : ""
      const data = await api.get<CompanyEvent[]>(`/api/v1/events${query}`)
      setEvents(data || [])
    } catch (err) {
      if (err instanceof ApiClientError) {
        const errorMsg =
          err.status === 403
            ? "Admin access required to view company events"
            : err.data.detail || "Failed to fetch company events"
        setApiError(errorMsg)
        toast({ variant: "destructive", title: "Error", description: errorMsg })
      } else {
        const errorMsg = "An unexpected error occurred"
        setApiError(errorMsg)
        toast({ variant: "destructive", title: "Error", description: errorMsg })
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
      description: "",
      image_url: "",
      location: "",
      active: true,
    })
    setSelectedEvent(null)
    setImageFile(null)
    setImagePreview(null)
    setUploadError("")
    setCreateOpen(true)
  }

  const handleEdit = (ev: CompanyEvent) => {
    setSelectedEvent(ev)
    setFormData({
      year: ev.year,
      date: ev.date.split("T")[0],
      name: ev.name,
      description: ev.description ?? "",
      image_url: ev.image_url ?? "",
      location: ev.location ?? "",
      active: ev.active,
    })
    setImageFile(null)
    setImagePreview(ev.image_url ?? null)
    setUploadError("")
    setEditOpen(true)
  }

  const handleDelete = (ev: CompanyEvent) => {
    setSelectedEvent(ev)
    setDeleteOpen(true)
  }

  const handleSubmitCreate = async () => {
    if (!formData.name.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Event name is required" })
      return
    }
    if (!formData.date) {
      toast({ variant: "destructive", title: "Validation Error", description: "Event date is required" })
      return
    }

    setSubmitting(true)
    try {
      console.log("[Events] Creating event payload:", formData)
      const created = await api.post<CompanyEvent>("/api/v1/events", formData)
      if (created && imageFile) {
        setUploading(true)
        setUploadError("")
        try {
          const fd = new FormData()
          fd.append("file", imageFile)
          const uploaded = await apiUpload<CompanyEvent>(`/api/v1/events/${created.id}/image`, fd, "POST")
          console.log("[Events] Upload response image_url:", uploaded?.image_url)
          setFormData((prev) => ({ ...prev, image_url: uploaded?.image_url || prev.image_url }))
        } catch (err) {
          if (err instanceof ApiClientError) {
            setUploadError(err.data.detail || "Failed to upload image")
            toast({ variant: "destructive", title: "Upload Error", description: err.data.detail || "Failed to upload image" })
          } else {
            setUploadError("An unexpected error occurred during image upload")
            toast({ variant: "destructive", title: "Upload Error", description: "An unexpected error occurred during image upload" })
          }
        } finally {
          setUploading(false)
        }
      }
      toast({ title: "Success", description: "Event created successfully" })
      setCreateOpen(false)
      setImageFile(null)
      setImagePreview(null)
      await fetchEvents()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to create event",
        })
      } else {
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitEdit = async () => {
    if (!selectedEvent) return
    if (!formData.name.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Event name is required" })
      return
    }

    setSubmitting(true)
    try {
      const updateData: CompanyEventUpdate = {
        name: formData.name,
        active: formData.active,
        description: formData.description,
        image_url: formData.image_url,
        location: formData.location,
      }
      console.log("[Events] Updating event payload:", updateData)
      const updated = await api.patch<CompanyEvent>(`/api/v1/events/${selectedEvent.id}`, updateData)
      if (updated && imageFile) {
        setUploading(true)
        setUploadError("")
        try {
          const fd = new FormData()
          fd.append("file", imageFile)
          const uploaded = await apiUpload<CompanyEvent>(`/api/v1/events/${selectedEvent.id}/image`, fd, "POST")
          console.log("[Events] Upload response image_url:", uploaded?.image_url)
          setFormData((prev) => ({ ...prev, image_url: uploaded?.image_url || prev.image_url }))
          setImagePreview(uploaded?.image_url ?? imagePreview)
        } catch (err) {
          if (err instanceof ApiClientError) {
            setUploadError(err.data.detail || "Failed to upload image")
            toast({ variant: "destructive", title: "Upload Error", description: err.data.detail || "Failed to upload image" })
          } else {
            setUploadError("An unexpected error occurred during image upload")
            toast({ variant: "destructive", title: "Upload Error", description: "An unexpected error occurred during image upload" })
          }
        } finally {
          setUploading(false)
        }
      }
      toast({ title: "Success", description: "Event updated successfully" })
      setEditOpen(false)
      setSelectedEvent(null)
      setImageFile(null)
      await fetchEvents()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to update event",
        })
      } else {
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedEvent) return
    setSubmitting(true)
    try {
      await api.delete(`/api/v1/events/${selectedEvent.id}`)
      toast({ title: "Success", description: "Event deleted successfully" })
      setDeleteOpen(false)
      setSelectedEvent(null)
      await fetchEvents()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.data.detail || "Failed to delete event",
        })
      } else {
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.date.includes(searchQuery) ||
      (ev.location ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesActive = filterActive === "ALL" || ev.active === filterActive
    return matchesSearch && matchesActive
  })

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <RequireRole allowedRoles={["ADMIN"]}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Company Events</h1>
            <p className="text-muted-foreground">Manage company events and celebrations</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        <div className="mb-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, date, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Year</Label>
              <Select
                value={filterYear.toString()}
                onValueChange={(value) => setFilterYear(value === "ALL" ? "ALL" : parseInt(value))}
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
              <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
              <Select
                value={filterActive === "ALL" ? "ALL" : filterActive.toString()}
                onValueChange={(value) => setFilterActive(value === "ALL" ? "ALL" : value === "true")}
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

        {apiError && !loading && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">
              <strong>API Error:</strong> {apiError}
            </p>
          </div>
        )}

        {!loading && !apiError && events.length === 0 && user && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> No events returned by API. Check backend endpoint or filters.
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
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center border rounded-lg p-12">
            <p className="text-lg text-muted-foreground mb-4">
              {searchQuery || filterActive !== "ALL" ? "No events match your filters" : "No events found"}
            </p>
            {!searchQuery && filterActive === "ALL" && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Event
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
                  <TableHead>Location</TableHead>
                  <TableHead>Image URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="font-medium">{ev.year}</TableCell>
                    <TableCell>
                      {ev.date ? format(new Date(ev.date), "MMM dd, yyyy") : "-"}
                    </TableCell>
                    <TableCell>{ev.name}</TableCell>
                    <TableCell>{ev.location ?? "-"}</TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {ev.image_url ? (
                        <a href={ev.image_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {ev.image_url}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ev.active ? "default" : "secondary"}>
                        {ev.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(ev)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(ev)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
                description: "",
                image_url: "",
                location: "",
                active: true,
              })
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
              <DialogDescription>Add a new company event.</DialogDescription>
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
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Annual Day"
                  required
                  disabled={submitting}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-description">Description / Notes</Label>
                <Textarea
                  id="create-description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description for this event"
                  rows={3}
                  disabled={submitting}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-image-url">
                    Image URL <span className="text-xs text-muted-foreground">(optional)</span>
                  </Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="create-image-url"
                      value={formData.image_url || ""}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://example.com/event.jpg"
                      className="pl-10"
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-location">
                    Location <span className="text-xs text-muted-foreground">(optional)</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="create-location"
                      value={formData.location || ""}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., HQ Auditorium"
                      className="pl-10"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-image-file">Upload Image (optional)</Label>
                <Input
                  id="create-image-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    setImageFile(f)
                    setImagePreview(f ? URL.createObjectURL(f) : null)
                  }}
                  disabled={submitting || uploading}
                />
                {(imagePreview || formData.image_url) && (
                  <img
                    src={imagePreview || formData.image_url || ""}
                    alt="Preview"
                    className="mt-2 h-32 w-32 object-cover rounded-md border"
                  />
                )}
                {uploading && (
                  <div className="text-sm text-muted-foreground flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading image...
                  </div>
                )}
                {uploadError && (
                  <div className="text-sm text-destructive">{uploadError}</div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="create-active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  disabled={submitting}
                />
                <Label htmlFor="create-active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>
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
              setSelectedEvent(null)
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
              <DialogDescription>Update event information.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description / Notes</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description for this event"
                  rows={3}
                  disabled={submitting}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-image-url">
                    Image URL <span className="text-xs text-muted-foreground">(optional)</span>
                  </Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-image-url"
                      value={formData.image_url || ""}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://example.com/event.jpg"
                      className="pl-10"
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-location">
                    Location <span className="text-xs text-muted-foreground">(optional)</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-location"
                      value={formData.location || ""}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., HQ Auditorium"
                      className="pl-10"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-image-file">Upload Image (optional)</Label>
                <Input
                  id="edit-image-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    setImageFile(f)
                    setImagePreview(f ? URL.createObjectURL(f) : (selectedEvent?.image_url ?? null))
                  }}
                  disabled={submitting || uploading}
                />
                {(imagePreview || selectedEvent?.image_url || formData.image_url) && (
                  <img
                    src={imagePreview || selectedEvent?.image_url || formData.image_url || ""}
                    alt="Current"
                    className="mt-2 h-32 w-32 object-cover rounded-md border"
                  />
                )}
                {uploading && (
                  <div className="text-sm text-muted-foreground flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading image...
                  </div>
                )}
                {uploadError && (
                  <div className="text-sm text-destructive">{uploadError}</div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  disabled={submitting}
                />
                <Label htmlFor="edit-active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={submitting}>
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
              setSelectedEvent(null)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Event</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{selectedEvent?.name}</strong>? This action cannot be undone.
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
                    Deleting...
                  </>
                ) : (
                  "Delete"
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
