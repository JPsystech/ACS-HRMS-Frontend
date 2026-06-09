"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { OfficeLocation, OfficeLocationCreate, OfficeLocationUpdate } from "@/types/models"
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
  XCircle,
  RotateCcw,
  AlertTriangle,
  CalendarDays,
  MapPin
} from "lucide-react"
import { format } from "date-fns"

export default function OfficeLocationsPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [locations, setLocations] = useState<OfficeLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<OfficeLocation | null>(null)
  const [formData, setFormData] = useState<OfficeLocationCreate>({
    name: "",
    address: "",
    latitude: 0,
    longitude: 0,
    radius_meters: 150,
    is_active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string>("")

  useEffect(() => {
    if (user && (user.role === "HR" || user.role === "ADMIN")) {
      fetchLocations()
    }
  }, [user])

  const fetchLocations = async () => {
    setLoading(true)
    setApiError("")
    try {
      const data = await api.get<OfficeLocation[]>("/api/v1/office-locations")
      setLocations(data || [])
    } catch (err) {
      if (err instanceof ApiClientError) {
        const message = err.data.detail || "Failed to fetch office locations"
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
      address: "",
      latitude: 0,
      longitude: 0,
      radius_meters: 150,
      is_active: true,
    })
    setSelectedLocation(null)
    setCreateOpen(true)
  }

  const handleEdit = (loc: OfficeLocation) => {
    setSelectedLocation(loc)
    setFormData({
      name: loc.name,
      address: loc.address || "",
      latitude: loc.latitude,
      longitude: loc.longitude,
      radius_meters: loc.radius_meters,
      is_active: loc.is_active,
    })
    setEditOpen(true)
  }

  const handleDelete = (loc: OfficeLocation) => {
    setSelectedLocation(loc)
    setDeleteOpen(true)
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Office name is required" })
      return false
    }
    if (!formData.latitude || isNaN(formData.latitude)) {
      toast({ variant: "destructive", title: "Validation Error", description: "Valid latitude is required" })
      return false
    }
    if (!formData.longitude || isNaN(formData.longitude)) {
      toast({ variant: "destructive", title: "Validation Error", description: "Valid longitude is required" })
      return false
    }
    if (!formData.radius_meters || formData.radius_meters <= 0) {
      toast({ variant: "destructive", title: "Validation Error", description: "Radius must be a positive number" })
      return false
    }
    return true
  }

  const handleSubmitCreate = async () => {
    if (!validateForm()) return

    setSubmitting(true)
    try {
      await api.post<OfficeLocation>("/api/v1/office-locations", formData)
      toast({
        title: "Success",
        description: "Office location created successfully",
      })
      setCreateOpen(false)
      await fetchLocations()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({ variant: "destructive", title: "Error", description: err.data.detail || "Failed to create location" })
      } else {
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitEdit = async () => {
    if (!validateForm() || !selectedLocation) return

    setSubmitting(true)
    try {
      const payload: OfficeLocationUpdate = {
        name: formData.name,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        radius_meters: formData.radius_meters,
        is_active: formData.is_active,
      }
      await api.put<OfficeLocation>(
        `/api/v1/office-locations/${selectedLocation.id}`,
        payload
      )
      toast({
        title: "Success",
        description: "Office location updated successfully",
      })
      setEditOpen(false)
      setSelectedLocation(null)
      await fetchLocations()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({ variant: "destructive", title: "Error", description: err.data.detail || "Failed to update location" })
      } else {
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedLocation) return

    setSubmitting(true)
    try {
      // API expects DELETE method
      await api.delete(`/api/v1/office-locations/${selectedLocation.id}`)
      toast({
        title: "Success",
        description: "Office location deleted successfully",
      })
      setDeleteOpen(false)
      setSelectedLocation(null)
      await fetchLocations()
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({ variant: "destructive", title: "Error", description: err.data.detail || "Failed to delete location" })
      } else {
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const filteredLocations = locations.filter((loc) =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (loc.address && loc.address.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const activeCount = locations.filter((r) => r.is_active).length
  const inactiveCount = locations.filter((r) => !r.is_active).length

  return (
    <RequireRole allowedRoles={["ADMIN", "HR"]}>
      <div className="space-y-6">
        {/* 1. Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 to-indigo-800 p-8 shadow-xl">
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
            <MapPin className="h-72 w-72 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 text-white">
              <h1 className="text-3xl font-bold tracking-tight">Office Locations Control Center</h1>
              <p className="max-w-xl text-indigo-200">
                Manage office geographical boundaries for field and office staff location-based attendance punching.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleCreate}
                className="bg-white text-indigo-900 hover:bg-indigo-50 font-bold rounded-xl shadow-sm px-6 h-12"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Office Location
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
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Locations</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{locations.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Locations</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Inactive Locations</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{inactiveCount}</p>
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
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{filteredLocations.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Search and Filter Card */}
        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Location Filters</h3>
            <p className="text-sm text-slate-500">Search locations by name or address.</p>
          </div>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-2 flex-1 w-full max-w-md">
                <Label className="text-xs font-medium text-slate-500 uppercase">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search locations..."
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
                <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-1">Failed to load locations</h3>
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
        ) : filteredLocations.length === 0 ? (
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md p-12 text-center flex flex-col items-center justify-center">
            <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <MapPin className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {searchQuery ? "No locations match your search" : "No office locations found"}
            </h3>
            <p className="text-slate-500 mb-6 max-w-md">
              {searchQuery 
                ? "Try using another name or address, or reset the search."
                : "Create your first office location to establish punch geofences."}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreate} className="rounded-xl px-6 bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Office Location
              </Button>
            )}
          </Card>
        ) : (
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/60 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Office Location Register</h3>
                <p className="text-sm text-slate-500 mt-1">Master list of offices and allowed punching zones.</p>
              </div>
              <Badge variant="secondary" className="rounded-lg px-3 py-1 bg-slate-100 dark:bg-slate-800 font-medium whitespace-nowrap self-start sm:self-auto text-slate-600 dark:text-slate-300 border-none">
                {filteredLocations.length} Records
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <AnimatedTable>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60">
                  <TableRow className="hover:bg-transparent border-0">
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Office Name</TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Address</TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Coordinates</TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Radius</TableHead>
                    <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.map((loc, index) => (
                    <AnimatedTableRow key={loc.id} delay={index * 0.03} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-0 group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/40 dark:to-indigo-800/40 border border-indigo-200 dark:border-indigo-700 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold shadow-sm group-hover:scale-105 transition-transform">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{loc.name}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[200px]">{loc.address || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs text-slate-500 font-medium font-mono">
                          <span>Lat: {loc.latitude}</span>
                          <span>Lng: {loc.longitude}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 font-medium px-2 py-0.5 rounded-lg shadow-none">
                          {loc.radius_meters}m
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {loc.is_active ? (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-lg shadow-none">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-200 bg-transparent text-slate-500 dark:border-slate-700 dark:text-slate-400 font-medium px-2 py-0.5 rounded-lg shadow-none">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(loc)}
                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(loc)}
                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
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

        {/* Create/Edit Location Dialog */}
        <Dialog open={createOpen || editOpen} onOpenChange={(open) => {
          if (createOpen) setCreateOpen(open)
          if (editOpen) setEditOpen(open)
        }}>
          <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden bg-white/95 dark:bg-slate-950/95 border-slate-200/60 dark:border-slate-800/60 shadow-2xl">
            <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  {editOpen ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">
                    {editOpen ? "Edit Office Location" : "Create Office Location"}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-slate-500">
                    Define the geofence perimeter for this office.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Office Name <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="name"
                      placeholder="e.g. Headquarters"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Address</Label>
                  <Input
                    id="address"
                    placeholder="Full office address"
                    value={formData.address || ""}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="latitude" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Latitude <span className="text-red-500">*</span></Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="0.00000001"
                    placeholder="e.g. 28.6139"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                    className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Longitude <span className="text-red-500">*</span></Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="0.00000001"
                    placeholder="e.g. 77.2090"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                    className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="radius_meters" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Radius (Meters) <span className="text-red-500">*</span></Label>
                  <Input
                    id="radius_meters"
                    type="number"
                    min={10}
                    placeholder="e.g. 150"
                    value={formData.radius_meters}
                    onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value) || 0 })}
                    className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                  <p className="text-xs text-slate-500">Allowed punching distance from center.</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Settings</Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300">Active Location</Label>
                      <p className="text-xs text-slate-500">Only active locations can be assigned to employees.</p>
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
                  editOpen ? "Update Location" : "Create Location"
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
              setSelectedLocation(null)
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
                    Delete Location?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-500">
                    Are you sure you want to delete <strong className="text-slate-700 dark:text-slate-300">&quot;{selectedLocation?.name}&quot;</strong>? This action cannot be undone. Employees assigned to this location will lose their geofence boundaries.
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
                    Deleting...
                  </>
                ) : (
                  "Yes, Delete"
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
