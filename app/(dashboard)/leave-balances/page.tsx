"use client"

import React, { useEffect, useState } from "react"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { PageContainer } from "@/components/ui/page-container"
import { EmptyState } from "@/components/ui/empty-state"
import {
  AnimatedTable,
  AnimatedTableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/animated-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDateTimeIST } from "@/lib/format-attendance"
import {
  Layers,
  Users,
  CalendarCheck,
  Building2,
  Filter,
  RotateCcw,
  Search,
  AlertTriangle,
  History,
  ReceiptText,
  BadgeCheck,
  BriefcaseBusiness,
  ShieldCheck,
  HeartPulse,
  WalletCards,
  CalendarDays,
  Plus,
  Minus
} from "lucide-react"

type AdminBalanceItem = {
  employee_id: number
  employee_name: string | null
  department_name: string | null
  emp_code: string | null
  leave_type: string
  allocated: number
  opening: number
  accrued: number
  used: number
  remaining: number
  eligible: boolean
}

type LeaveTransaction = {
  id: number
  employee_id: number
  leave_id: number | null
  year: number
  leave_type: string
  delta_days: number
  action: string
  remarks: string | null
  action_by_employee_id: number | null
  action_at: string
}

type EmployeeBalanceRow = {
  employee_id: number
  employee_name: string
  department_name: string
  emp_code: string
  cl_allocated: number
  cl_remaining: number
  cl_used: number
  sl_allocated: number
  sl_remaining: number
  sl_used: number
  pl_allocated: number
  pl_remaining: number
  pl_used: number
  fl_allocated: number
  fl_remaining: number
  fl_used: number
  rh_allocated: number
  rh_remaining: number
  rh_used: number
  pl_eligible: boolean
}

const currentYear = new Date().getFullYear()
const YEARS = [currentYear, currentYear - 1, currentYear + 1].sort((a, b) => b - a)

export default function LeaveBalancesPage() {
  const { toast } = useToast()
  const [year, setYear] = useState(currentYear)
  const [departmentId, setDepartmentId] = useState<string>("")
  const [employeeId, setEmployeeId] = useState<string>("")
  const [employeeSearch, setEmployeeSearch] = useState("")
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([])
  const [rows, setRows] = useState<EmployeeBalanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerEmployeeId, setDrawerEmployeeId] = useState<number | null>(null)
  const [drawerEmployeeName, setDrawerEmployeeName] = useState("")
  const [transactions, setTransactions] = useState<LeaveTransaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null)
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0)

  useEffect(() => {
    api.get<{ id: number; name: string }[]>("/api/v1/departments").then((r) => {
      setDepartments(Array.isArray(r) ? r : [])
    }).catch(() => { })
  }, [])

  // Refetch admin balances when a leave is approved/rejected/cancelled from the Leaves page
  useEffect(() => {
    const handler = () => setBalanceRefreshKey((k) => k + 1)
    window.addEventListener("leave-action-done", handler)
    return () => window.removeEventListener("leave-action-done", handler)
  }, [])

  useEffect(() => {
    setLoading(true)
    setMigrationMessage(null)
    const params = new URLSearchParams({ year: String(year) })
    if (departmentId) params.set("department_id", departmentId)
    const e = employeeId.trim()
    if (e && /^\d+$/.test(e)) params.set("employee_id", e)
    api.get<{ year: number; items: AdminBalanceItem[]; total: number }>(
      `/api/v1/admin/leaves/balances?${params}`
    )
      .then((res) => {
        const items = Array.isArray((res as { items?: AdminBalanceItem[] })?.items) ? (res as { items: AdminBalanceItem[] }).items : []
        const byEmployee = new Map<number, Partial<EmployeeBalanceRow>>()
        for (const i of items) {
          let row = byEmployee.get(i.employee_id)
          if (!row) {
            row = {
              employee_id: i.employee_id,
              employee_name: i.employee_name ?? `#${i.employee_id}`,
              department_name: i.department_name ?? "—",
              emp_code: i.emp_code ?? "—",
              cl_allocated: 0,
              cl_remaining: 0,
              cl_used: 0,
              sl_allocated: 0,
              sl_remaining: 0,
              sl_used: 0,
              pl_allocated: 0,
              pl_remaining: 0,
              pl_used: 0,
              fl_allocated: 0,
              fl_remaining: 0,
              fl_used: 0,
              rh_allocated: 0,
              rh_remaining: 0,
              rh_used: 0,
              pl_eligible: true,
            }
            byEmployee.set(i.employee_id, row)
          }
          const lt = String(i.leave_type).toUpperCase()
          if (lt === "CL") {
            row.cl_allocated = i.allocated
            row.cl_remaining = i.remaining
            row.cl_used = i.used
          } else if (lt === "SL") {
            row.sl_allocated = i.allocated
            row.sl_remaining = i.remaining
            row.sl_used = i.used
          } else if (lt === "PL") {
            row.pl_allocated = i.allocated
            row.pl_remaining = i.remaining
            row.pl_used = i.used
            row.pl_eligible = i.eligible
          } else if (lt === "FL") {
            row.fl_allocated = i.allocated
            row.fl_remaining = i.remaining
            row.fl_used = i.used
          } else if (lt === "RH") {
            row.rh_allocated = i.allocated
            row.rh_remaining = i.remaining
            row.rh_used = i.used
          }
        }
        setRows(Array.from(byEmployee.values()) as EmployeeBalanceRow[])
      })
      .catch((err: ApiClientError) => {
        const detail = typeof err.data?.detail === "string" ? err.data.detail : "Failed to load balances"
        if (err.status === 503) {
          setMigrationMessage(detail)
        } else {
          toast({ title: "Error", description: detail, variant: "destructive" })
        }
        setRows([])
      })
      .finally(() => setLoading(false))
  }, [year, departmentId, employeeId, toast, balanceRefreshKey])

  const openDrawer = (empId: number, name: string) => {
    setDrawerEmployeeId(empId)
    setDrawerEmployeeName(name)
    setDrawerOpen(true)
    setTransactionsLoading(true)
    setTransactions([])
    api.get<LeaveTransaction[]>(`/api/v1/admin/leaves/balances/transactions?employee_id=${empId}&year=${year}&limit=100`)
      .then((res) => setTransactions(Array.isArray(res) ? res : []))
      .catch(() => setTransactions([]))
      .finally(() => setTransactionsLoading(false))
  }

  const filteredRows = employeeSearch.trim()
    ? rows.filter(
      (r) =>
        r.employee_name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        (r.emp_code && r.emp_code.toLowerCase().includes(employeeSearch.toLowerCase()))
    )
    : rows

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  const renderLeaveWalletCell = (total: number, used: number, remaining: number, tone: 'blue' | 'emerald' | 'purple' | 'orange' | 'slate') => {
    const isExhausted = total > 0 && remaining === 0;

    let toneClasses = "";
    if (tone === 'blue') toneClasses = "text-blue-700 dark:text-blue-400";
    if (tone === 'emerald') toneClasses = "text-emerald-700 dark:text-emerald-400";
    if (tone === 'purple') toneClasses = "text-purple-700 dark:text-purple-400";
    if (tone === 'orange') toneClasses = "text-orange-700 dark:text-orange-400";
    if (tone === 'slate') toneClasses = "text-slate-700 dark:text-slate-400";

    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-lg font-bold leading-none ${isExhausted ? 'text-rose-600 dark:text-rose-500' : toneClasses}`}>
            {remaining}
          </span>
          {isExhausted && <span className="text-[9px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-900/40 px-1 py-0.5 rounded uppercase tracking-wider">Empty</span>}
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
          T: {total} <span className="mx-0.5 opacity-40">•</span> U: {used}
        </div>
      </div>
    )
  }

  const getTotalRemaining = (type: 'cl' | 'sl' | 'pl') => {
    return filteredRows.reduce((acc, row) => acc + (type === 'cl' ? row.cl_remaining : type === 'sl' ? row.sl_remaining : row.pl_remaining), 0)
  }
  const getEligibleCount = () => filteredRows.filter(r => r.pl_eligible).length

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* 1. Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-8 shadow-xl">
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
            <WalletCards className="h-64 w-64 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-0 rounded-lg">
                  HRMS Leave Wallet
                </Badge>
                <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-0 rounded-lg">
                  Admin View
                </Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Leave Balance Control Center</h1>
              <p className="max-w-xl text-slate-300">
                Monitor employee leave wallets, yearly allocations, used leave, remaining balance and transaction history.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-5 py-3 rounded-2xl border border-white/10 shadow-inner">
              <CalendarDays className="h-6 w-6 text-indigo-300" />
              <div>
                <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider">Selected Year</p>
                <p className="text-xl font-bold text-white">{year}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Employees</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{filteredRows.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Rem. CL</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{getTotalRemaining('cl')}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Rem. SL</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{getTotalRemaining('sl')}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Rem. PL</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{getTotalRemaining('pl')}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">PL Eligible</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{getEligibleCount()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Premium Filter Card */}
        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800/60 p-6 pb-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 mb-1">
              <Filter className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold">Leave Balance Filters</h3>
            </div>
            <p className="text-sm text-slate-500">Filter wallet records by year, department, employee ID or employee name/code.</p>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 uppercase">Year</Label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 uppercase">Department</Label>
                <Select value={departmentId || "all"} onValueChange={(v) => setDepartmentId(v === "all" ? "" : v)}>
                  <SelectTrigger className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 uppercase">Employee ID</Label>
                <Input
                  placeholder="ID Number"
                  value={employeeId}
                  onChange={(e) => {
                    const v = e.target.value
                    setEmployeeId(v)
                    const t = v.trim()
                    if (t && !/^\d+$/.test(t)) {
                      setEmployeeSearch(t)
                    }
                  }}
                  inputMode="numeric"
                  pattern="\d*"
                  className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label className="text-xs font-medium text-slate-500 uppercase">Search by Name/Code</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="e.g. John or EMP001"
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="rounded-xl h-10 pl-9 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl h-10 w-10 shrink-0 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setYear(currentYear)
                      setDepartmentId("")
                      setEmployeeId("")
                      setEmployeeSearch("")
                    }}
                    title="Reset Filters"
                  >
                    <RotateCcw className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Migration Warning */}
        {migrationMessage && (
          <Card className="rounded-2xl border-amber-200/50 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-900/50 shadow-sm overflow-hidden backdrop-blur-sm">
            <div className="p-6 flex items-start gap-4">
              <div className="h-10 w-10 shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mt-1">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-1">Migration Required</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-3 whitespace-pre-wrap leading-relaxed">{migrationMessage}</p>
                <div className="bg-amber-100/50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 flex items-center gap-3">
                  <code className="text-xs font-mono text-amber-900 dark:text-amber-300 font-semibold px-2 py-1 bg-amber-50 dark:bg-black/20 rounded">
                    alembic upgrade head
                  </code>
                  <span className="text-xs text-amber-700 dark:text-amber-400/80">
                    Run this from the hrms-backend folder with the server stopped.
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 5. Loading State */}
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
        ) : !migrationMessage && filteredRows.length === 0 ? (
          /* 6. Empty State */
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md p-12">
            <EmptyState
              icon={Layers}
              title="No balances"
              description="No leave balance records found for the selected filters."
            />
          </Card>
        ) : !migrationMessage && (
          /* 7. Leave Balance Table */
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/60 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Leave Wallet Register</h3>
                <p className="text-sm text-slate-500 mt-1">Year-wise leave allocation, used days, remaining balance and eligibility status.</p>
              </div>
              <Badge variant="secondary" className="rounded-lg px-3 py-1 bg-slate-100 dark:bg-slate-800 font-medium whitespace-nowrap self-start sm:self-auto text-slate-600 dark:text-slate-300 border-none">
                {filteredRows.length} Records
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[1100px]">
                <AnimatedTable>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60">
                    <TableRow className="hover:bg-transparent border-0">
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Employee</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Department</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Casual (CL)</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Sick (SL)</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Privilege (PL)</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Festival (FL)</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Restricted (RH)</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">PL Eligible</TableHead>
                      <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((r, index) => (
                      <AnimatedTableRow key={r.employee_id} delay={index * 0.03} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-0 group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                              {getInitials(r.employee_name)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{r.employee_name}</span>
                              {r.emp_code && r.emp_code !== "—" && (
                                <code className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                                  {r.emp_code}
                                </code>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span className="font-medium text-sm">{r.department_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{renderLeaveWalletCell(r.cl_allocated, r.cl_used, r.cl_remaining, 'blue')}</TableCell>
                        <TableCell>{renderLeaveWalletCell(r.sl_allocated, r.sl_used, r.sl_remaining, 'emerald')}</TableCell>
                        <TableCell>{renderLeaveWalletCell(r.pl_allocated, r.pl_used, r.pl_remaining, 'purple')}</TableCell>
                        <TableCell>{renderLeaveWalletCell(r.fl_allocated, r.fl_used, r.fl_remaining, 'orange')}</TableCell>
                        <TableCell>{renderLeaveWalletCell(r.rh_allocated, r.rh_used, r.rh_remaining, 'slate')}</TableCell>
                        <TableCell>
                          {r.pl_eligible ? (
                            <Badge variant="outline" className="border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-lg">
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-200 bg-transparent text-slate-500 dark:border-slate-700 dark:text-slate-400 font-medium px-2 py-0.5 rounded-lg">
                              No
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-300 dark:hover:bg-indigo-900/20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all font-medium"
                            onClick={() => openDrawer(r.employee_id, r.employee_name)}
                          >
                            <History className="h-4 w-4 mr-1.5" />
                            Transactions
                          </Button>
                        </TableCell>
                      </AnimatedTableRow>
                    ))}
                  </TableBody>
                </AnimatedTable>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* 8. Transaction Dialog */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-2xl border-slate-200/60 dark:border-slate-800/60 shadow-2xl">
          <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Leave Transactions</DialogTitle>
                <DialogDescription className="mt-1 text-slate-500">
                  Wallet transaction history for selected employee and year.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/10">
            {/* Employee Summary Card inside Modal */}
            <div className="flex items-center justify-between p-4 mb-6 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-950 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-lg shadow-sm">
                  {getInitials(drawerEmployeeName)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">{drawerEmployeeName}</h4>
                  <p className="text-xs text-slate-500 font-medium">Employee ID: {drawerEmployeeId}</p>
                </div>
              </div>
              <Badge variant="secondary" className="rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-none px-3 py-1 font-bold text-sm">
                Year {year}
              </Badge>
            </div>

            {transactionsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <History className="h-6 w-6 text-slate-400" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">No transactions found</h4>
                <p className="text-sm text-slate-500 mt-1">There is no wallet history for this employee in {year}.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 pl-6 space-y-6">
                {transactions.map((t) => (
                  <div key={t.id} className="relative">
                    {/* Timeline Node */}
                    <div className={`absolute -left-[35px] h-4 w-4 rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center ${t.delta_days >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                    <div className="bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/70 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{t.action}</span>
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300">
                              {t.leave_type}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{formatDateTimeIST(t.action_at)}</p>
                        </div>
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-sm ${t.delta_days >= 0
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          }`}>
                          {t.delta_days >= 0 ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {Math.abs(t.delta_days)} days
                        </div>
                      </div>
                      {t.remarks && (
                        <div className="mt-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                          <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{t.remarks}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
