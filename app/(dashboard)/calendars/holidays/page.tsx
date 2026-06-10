"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError, apiUpload } from "@/lib/api"
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
import { 
  Plus, Edit, Trash2, Loader2, Search, CalendarDays, 
  PartyPopper, BadgeCheck, XCircle, ImageIcon, Upload, 
  RefreshCw, RotateCcw, AlertTriangle, FileImage, Eye, Clock 
} from "lucide-react"
import { format } from "date-fns"
import { Textarea } from "@/components/ui/textarea"
import { normalizeImageUrl } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

function getInitials(name: string) {
  if (!name) return ""
  return name.substring(0, 2).toUpperCase()
}

function formatHolidayDate(value: string) {
  if (!value) return "-"
  return format(new Date(value), "MMM dd, yyyy")
}

function getDayName(value: string) {
  if (!value) return ""
  return format(new Date(value), "EEEE")
}

function renderStatusBadge(active: boolean) {
  if (active) {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 flex items-center gap-1">
        <BadgeCheck className="h-3 w-3" />
        Active
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-slate-500 border-slate-200 dark:border-slate-700 flex items-center gap-1 bg-slate-50 dark:bg-slate-900">
      <XCircle className="h-3 w-3" />
      Inactive
    </Badge>
  )
}

function renderMetricCard(label: string, value: string | number, icon: React.ReactNode, tone: "indigo" | "emerald" | "slate" | "amber" | "blue") {
  const toneClasses = {
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    slate: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  }
  
  return (
    <Card className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`p-3 rounded-xl ${toneClasses[tone]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</h3>
        </div>
      </CardContent>
    </Card>
  )
}

export default function HolidaysPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterYear, setFilterYear] = useState<number | "ALL">(new Date().getFullYear())
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
    description: "",
  })
  
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string>("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

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
      const yearParam = filterYear !== "ALL" ? `?year=${filterYear}` : ""
      const data = await api.get<Holiday[]>(`/api/v1/holidays${yearParam}`)
      setHolidays(data || [])
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

  const resetFilters = () => {
    setSearchQuery("")
    setFilterYear(new Date().getFullYear())
    setFilterActive("ALL")
  }

  const handleCreate = () => {
    setFormData({
      year: filterYear !== "ALL" ? filterYear : new Date().getFullYear(),
      date: new Date().toISOString().split("T")[0],
      name: "",
      active: true,
      description: "",
    })
    setSelectedHoliday(null)
    setImageFile(null)
    setImagePreview(null)
    setCreateOpen(true)
  }

  const handleEdit = (holiday: Holiday) => {
    setSelectedHoliday(holiday)
    setFormData({
      year: holiday.year,
      date: holiday.date.split("T")[0],
      name: holiday.name,
      active: holiday.active,
      description: holiday.description || "",
    })
    setImageFile(null)
    setImagePreview(normalizeImageUrl(holiday.image_url ?? "") || null)
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
      const created = await api.post<Holiday>("/api/v1/holidays", formData)
      if (created && created.id && imageFile) {
        const fd = new FormData()
        fd.append("file", imageFile)
        await apiUpload<Holiday>(`/api/v1/holidays/${created.id}/image`, fd, "POST")
      }
      toast({
        title: "Success",
        description: "Holiday created successfully",
      })
      setCreateOpen(false)
      setImageFile(null)
      setImagePreview(null)
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
        description: formData.description,
      }
      const updated = await api.patch<Holiday>(
        `/api/v1/holidays/${selectedHoliday.id}`,
        updateData
      )
      if (updated && imageFile) {
        const fd = new FormData()
        fd.append("file", imageFile)
        await apiUpload<Holiday>(`/api/v1/holidays/${selectedHoliday.id}/image`, fd, "POST")
      }
      toast({
        title: "Success",
        description: "Holiday updated successfully",
      })
      setEditOpen(false)
      setSelectedHoliday(null)
      setImageFile(null)
      setImagePreview(null)
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

  const renderLoadingSkeleton = () => (
    <Card className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="p-0">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-50 dark:border-slate-800/50">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </Card>
  )

  return (
    <RequireRole allowedRoles={["ADMIN"]}>
      <div className="space-y-6">
        
        {/* Premium Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-8 shadow-xl">
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
            <CalendarDays className="h-96 w-96 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border-0 rounded-lg backdrop-blur-sm">
                  ACS HRMS Holiday Calendar
                </Badge>
                <Badge variant="outline" className="border-slate-600 text-slate-300 rounded-lg backdrop-blur-sm">
                  Year {filterYear === "ALL" ? "All" : filterYear}
                </Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Holiday Control Center</h1>
              <p className="text-slate-300 text-sm md:text-base max-w-2xl">
                Create, manage and publish yearly holiday calendars with descriptions, status and announcement images.
              </p>
            </div>
            <Button 
              onClick={handleCreate}
              className="rounded-xl bg-white text-slate-900 hover:bg-slate-100 shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Holiday
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderMetricCard("Total Holidays", holidays.length, <CalendarDays className="h-6 w-6" />, "indigo")}
          {renderMetricCard("Active Holidays", holidays.filter(h => h.active).length, <BadgeCheck className="h-6 w-6" />, "emerald")}
          {renderMetricCard("Inactive Holidays", holidays.filter(h => !h.active).length, <XCircle className="h-6 w-6" />, "slate")}
          {renderMetricCard("Search Results", filteredHolidays.length, <Search className="h-6 w-6" />, "blue")}
        </div>

        {/* Premium Filter Card */}
        <Card className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Holiday Filters</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Search and filter holidays by year, active status and holiday name.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <div className="xl:col-span-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search holiday name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Year</Label>
                <Select
                  value={filterYear.toString()}
                  onValueChange={(value) => setFilterYear(value === "ALL" ? "ALL" : parseInt(value))}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">All Years</SelectItem>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Status</Label>
                <Select
                  value={filterActive === "ALL" ? "ALL" : filterActive.toString()}
                  onValueChange={(value) => setFilterActive(value === "ALL" ? "ALL" : value === "true")}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={resetFilters}
                  className="h-10 flex-1 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button 
                  variant="outline" 
                  onClick={fetchHolidays}
                  className="h-10 w-10 p-0 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-indigo-600 dark:text-indigo-400 shrink-0"
                  title="Refresh"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Error Card */}
        {apiError && !loading && (
          <Card className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 shadow-sm overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-xl text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-red-800 dark:text-red-300">Failed to load holidays</h4>
                  <p className="text-sm text-red-600 dark:text-red-400">{apiError}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={fetchHolidays} className="rounded-xl border-red-200 text-red-700 hover:bg-red-100 dark:border-red-800/50 dark:text-red-400">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {loading ? (
          renderLoadingSkeleton()
        ) : !apiError && filteredHolidays.length === 0 ? (
          <Card className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm p-12 flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-full mb-4">
              <CalendarDays className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No holidays found</h3>
            <p className="text-slate-500 max-w-md mb-6">
              {holidays.length === 0 
                ? "Create your first holiday to start building the company holiday calendar."
                : "No holidays match the selected year, status or search filters."}
            </p>
            {holidays.length === 0 && (
              <Button onClick={handleCreate} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Holiday
              </Button>
            )}
          </Card>
        ) : !apiError ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Card className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/60">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Holiday Register</h3>
                    <p className="text-sm text-slate-500">Year-wise company holidays with calendar date, description, image and active status.</p>
                  </div>
                  <Badge variant="secondary" className="rounded-lg px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border-0">
                    {filteredHolidays.length} Records
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-[950px]">
                    <Table>
                      <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                        <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800">
                          <TableHead className="font-semibold text-slate-600 dark:text-slate-300 py-4 pl-5">Holiday</TableHead>
                          <TableHead className="font-semibold text-slate-600 dark:text-slate-300 py-4">Date</TableHead>
                          <TableHead className="font-semibold text-slate-600 dark:text-slate-300 py-4">Year</TableHead>
                          <TableHead className="font-semibold text-slate-600 dark:text-slate-300 py-4">Description</TableHead>
                          <TableHead className="font-semibold text-slate-600 dark:text-slate-300 py-4">Image</TableHead>
                          <TableHead className="font-semibold text-slate-600 dark:text-slate-300 py-4">Status</TableHead>
                          <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300 py-4 pr-5">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHolidays.map((holiday) => (
                          <TableRow 
                            key={holiday.id} 
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-slate-100 dark:border-slate-800/60"
                          >
                            <TableCell className="py-4 pl-5">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                  {getInitials(holiday.name) || <CalendarDays className="h-4 w-4" />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900 dark:text-slate-100">{holiday.name}</span>
                                  <span className="text-[11px] text-slate-500">Holiday calendar record</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                                  <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
                                  {formatHolidayDate(holiday.date)}
                                </div>
                                <span className="text-xs text-slate-500 ml-5">{getDayName(holiday.date)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 rounded-lg">
                                {holiday.year}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="max-w-[320px] text-sm text-slate-600 dark:text-slate-300 line-clamp-2" title={holiday.description || ""}>
                                {holiday.description || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              {holiday.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img 
                                  src={normalizeImageUrl(holiday.image_url)} 
                                  alt={holiday.name}
                                  className="w-16 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-800"
                                />
                              ) : (
                                <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-900 text-slate-400 border-dashed border-slate-300 dark:border-slate-700">
                                  No image
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="py-4">
                              {renderStatusBadge(holiday.active)}
                            </TableCell>
                            <TableCell className="py-4 pr-5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(holiday)}
                                  className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(holiday)}
                                  disabled={!holiday.active}
                                  className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 text-slate-500 dark:text-slate-400 disabled:opacity-30"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </Card>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredHolidays.map((holiday) => (
                <Card key={holiday.id} className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
                  {holiday.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={normalizeImageUrl(holiday.image_url)} 
                      alt={holiday.name}
                      className="w-full h-32 object-cover border-b border-slate-100 dark:border-slate-800"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        {!holiday.image_url && (
                          <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                            {getInitials(holiday.name)}
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">{holiday.name}</span>
                          <Badge variant="outline" className="mt-1 bg-slate-50 dark:bg-slate-900 text-slate-500 text-[10px] rounded border-slate-200 dark:border-slate-700">
                            {holiday.year}
                          </Badge>
                        </div>
                      </div>
                      {renderStatusBadge(holiday.active)}
                    </div>
                    
                    <div className="flex flex-col gap-2 mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <CalendarDays className="h-4 w-4 text-indigo-500" />
                        <span className="font-medium">{formatHolidayDate(holiday.date)}</span>
                        <span className="text-xs text-slate-400 ml-auto">{getDayName(holiday.date)}</span>
                      </div>
                    </div>
                    
                    {holiday.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                        {holiday.description}
                      </p>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl h-9 text-xs font-medium border-slate-200 dark:border-slate-700"
                        onClick={() => handleEdit(holiday)}
                      >
                        <Edit className="h-3 w-3 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!holiday.active}
                        className="flex-1 rounded-xl h-9 text-xs font-medium border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/30"
                        onClick={() => handleDelete(holiday)}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Deactivate
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : null}

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
                description: "",
              })
              setImageFile(null)
              setImagePreview(null)
            }
          }}
        >
          <DialogContent className="max-w-2xl p-0 rounded-2xl bg-white/95 dark:bg-slate-950/95 overflow-hidden">
            <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <PartyPopper className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Create Holiday</DialogTitle>
                  <DialogDescription className="text-slate-500 mt-1">
                    Add a new holiday to the yearly ACS HRMS holiday calendar.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Holiday Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-year" className="text-xs font-semibold text-slate-500">Year *</Label>
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
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-date" className="text-xs font-semibold text-slate-500">Date *</Label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="create-date"
                        type="date"
                        value={formData.date}
                        onChange={(e) =>
                          setFormData({ ...formData, date: e.target.value })
                        }
                        required
                        disabled={submitting}
                        className="pl-10 h-10 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-name" className="text-xs font-semibold text-slate-500">Holiday Name *</Label>
                  <div className="relative">
                    <PartyPopper className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="create-name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Republic Day"
                      required
                      disabled={submitting}
                      className="pl-10 h-10 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-description" className="text-xs font-semibold text-slate-500">Description / Notes</Label>
                  <Textarea
                    id="create-description"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional notes about this holiday"
                    rows={3}
                    disabled={submitting}
                    className="rounded-xl resize-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Holiday Image</h4>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors relative">
                  <Input
                    id="create-image"
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null
                      setImageFile(f)
                      setImagePreview(f ? URL.createObjectURL(f) : null)
                    }}
                    disabled={submitting}
                  />
                  {imagePreview ? (
                    <div className="flex flex-col items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview} alt="Preview" className="w-full max-h-56 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm" />
                      <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg">
                        <RotateCcw className="h-4 w-4" />
                        <span>Change Image</span>
                      </div>
                      {imageFile && <span className="text-xs text-slate-500">{imageFile.name}</span>}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                        <Upload className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Upload holiday banner or announcement image</p>
                        <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP up to 5MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Status</h4>
                <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <div className="space-y-1">
                    <Label htmlFor="create-active" className="font-semibold text-slate-900 dark:text-slate-100">Active Holiday</Label>
                    <p className="text-xs text-slate-500 max-w-[280px]">Active holidays will be visible and available in the HRMS calendar.</p>
                  </div>
                  <Switch
                    id="create-active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20">
              <Button variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmitCreate} disabled={submitting} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Holiday
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
              setImageFile(null)
              setImagePreview(null)
            }
          }}
        >
          <DialogContent className="max-w-2xl p-0 rounded-2xl bg-white/95 dark:bg-slate-950/95 overflow-hidden">
            <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Edit className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Edit Holiday</DialogTitle>
                  <DialogDescription className="text-slate-500 mt-1">
                    Update holiday name, description, status and announcement image.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Holiday Details</h4>
                {/* Year/Date are read-only conceptually, but since the existing code allows editing description/name only, we show name/description. The existing handleEdit logic copies date and year but existing UI didn't have inputs for them in edit mode. I will leave them out of edit mode if they weren't there. But wait, I can add them as disabled fields just to show. */}
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-xs font-semibold text-slate-500">Holiday Name *</Label>
                  <div className="relative">
                    <PartyPopper className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      disabled={submitting}
                      className="pl-10 h-10 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description" className="text-xs font-semibold text-slate-500">Description / Notes</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    disabled={submitting}
                    className="rounded-xl resize-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Holiday Image</h4>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors relative">
                  <Input
                    id="edit-image"
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null
                      setImageFile(f)
                      setImagePreview(f ? URL.createObjectURL(f) : null)
                    }}
                    disabled={submitting}
                  />
                  {imagePreview ? (
                    <div className="flex flex-col items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview} alt="Preview" className="w-full max-h-56 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm" />
                      <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg">
                        <RotateCcw className="h-4 w-4" />
                        <span>Change Image</span>
                      </div>
                      {imageFile && <span className="text-xs text-slate-500">{imageFile.name}</span>}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                        <Upload className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Upload holiday banner or announcement image</p>
                        <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP up to 5MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Status</h4>
                <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <div className="space-y-1">
                    <Label htmlFor="edit-active" className="font-semibold text-slate-900 dark:text-slate-100">Active Holiday</Label>
                    <p className="text-xs text-slate-500 max-w-[280px]">Active holidays will be visible and available in the HRMS calendar.</p>
                  </div>
                  <Switch
                    id="edit-active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20">
              <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmitEdit} disabled={submitting} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent className="rounded-2xl border-red-200 dark:border-red-900/50 p-0 overflow-hidden bg-white/95 dark:bg-slate-950/95">
            <div className="p-6 border-b border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialogTitle className="text-xl">Deactivate Holiday?</AlertDialogTitle>
              <AlertDialogDescription className="text-center mt-2 max-w-sm">
                Are you sure you want to deactivate &quot;{selectedHoliday?.name}&quot;? This holiday will remain in records but will no longer be active in the holiday calendar.
              </AlertDialogDescription>
            </div>
            <AlertDialogFooter className="p-6 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800">
              <AlertDialogCancel className="rounded-xl" disabled={submitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                onClick={handleConfirmDelete}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Yes, Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
      </div>
    </RequireRole>
  )
}
