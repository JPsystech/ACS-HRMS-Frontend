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
import { format } from "date-fns"
import {
  Layers,
  Users,
  Home,
  Laptop,
  CalendarCheck,
  WalletCards,
  AlertTriangle,
  Building2,
  Filter,
  Search,
  RotateCcw,
  ArrowDownUp,
  History,
  ReceiptText,
  BadgeCheck,
  TrendingUp,
  Plus,
  Minus
} from "lucide-react"

type AdminWfhBalanceItem = {
  employee_id: number
  employee_name: string | null
  department_name: string | null
  emp_code: string | null
  entitled: number
  accrued: number
  used: number
  remaining: number
}

type WfhTransaction = {
  id: number
  employee_id: number
  year?: number
  date: string
  day_value: number
  action: string
  remarks: string | null
  action_by_employee_id: number | null
  action_at: string
}

type WfhBalanceRow = {
  employee_id: number
  employee_name: string
  department_name: string
  emp_code: string
  entitled: number
  accrued: number
  used: number
  remaining: number
}

const currentYear = new Date().getFullYear()
const YEARS = [currentYear, currentYear - 1, currentYear + 1].sort((a, b) => b - a)

export default function WfhBalancesPage() {
  const { toast } = useToast()
  const [year, setYear] = useState(currentYear)
  const [rows, setRows] = useState<WfhBalanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"remaining" | "used">("remaining")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerEmployeeId, setDrawerEmployeeId] = useState<number | null>(null)
  const [drawerEmployeeName, setDrawerEmployeeName] = useState("")
  const [transactions, setTransactions] = useState<WfhTransaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0)

  useEffect(() => {
    // Refetch balances when WFH approvals change anything
    const handler = () => setBalanceRefreshKey((k) => k + 1)
    window.addEventListener("wfh-action-done", handler)
    return () => window.removeEventListener("wfh-action-done", handler)
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ year: String(year) })
    api
      .get<{ year: number; items: AdminWfhBalanceItem[]; total: number }>(
        `/api/v1/admin/wfh/balances?${params}`,
      )
      .then((res) => {
        const items = Array.isArray((res as { items?: AdminWfhBalanceItem[] })?.items)
          ? (res as { items: AdminWfhBalanceItem[] }).items
          : []
        const mapped: WfhBalanceRow[] = items.map((i) => ({
          employee_id: i.employee_id,
          employee_name: i.employee_name ?? `#${i.employee_id}`,
          department_name: i.department_name ?? "—",
          emp_code: i.emp_code ?? "—",
          entitled: i.entitled,
          accrued: i.accrued,
          used: i.used,
          remaining: i.remaining,
        }))
        setRows(mapped)
      })
      .catch((err: ApiClientError) => {
        const detail =
          typeof err.data?.detail === "string"
            ? err.data.detail
            : "Failed to load WFH balances"
        toast({ title: "Error", description: detail, variant: "destructive" })
        setRows([])
      })
      .finally(() => setLoading(false))
  }, [year, toast, balanceRefreshKey])

  const openDrawer = (empId: number, name: string) => {
    setDrawerEmployeeId(empId)
    setDrawerEmployeeName(name)
    setDrawerOpen(true)
    setTransactionsLoading(true)
    setTransactions([])
    const params = new URLSearchParams({
      employee_id: String(empId),
      year: String(year),
      limit: "100",
    })
    api
      .get<WfhTransaction[]>(
        `/api/v1/admin/wfh/balances/transactions?${params.toString()}`,
      )
      .then((res) => setTransactions(Array.isArray(res) ? res : []))
      .catch(() => setTransactions([]))
      .finally(() => setTransactionsLoading(false))
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.employee_name.toLowerCase().includes(q) ||
      (r.emp_code && r.emp_code.toLowerCase().includes(q))
    )
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "remaining") {
      return b.remaining - a.remaining
    }
    // sortBy used
    return b.used - a.used
  })

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  const getTotal = (field: "entitled" | "accrued" | "used" | "remaining") => {
    return sorted.reduce((acc, row) => acc + row[field], 0)
  }

  const getUsagePercent = (row: WfhBalanceRow) => {
    return row.entitled > 0 ? Math.min(100, Math.round((row.used / row.entitled) * 100)) : 0
  }

  const getHealthTone = (row: WfhBalanceRow) => {
    const p = getUsagePercent(row)
    if (p <= 50) return "green"
    if (p <= 80) return "amber"
    return "red"
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* 1. Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-8 shadow-xl">
          <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
            <Home className="h-64 w-64 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-0 rounded-lg">
                  HRMS WFH Wallet
                </Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">WFH Balance Control Center</h1>
              <p className="max-w-xl text-slate-300">
                Monitor employee Work From Home entitlement, usage, remaining balance and transaction history by year.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-5 py-3 rounded-2xl border border-white/10 shadow-inner">
              <CalendarCheck className="h-6 w-6 text-indigo-300" />
              <div>
                <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider">Selected Year</p>
                <p className="text-xl font-bold text-white">{year}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Employees</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{sorted.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Laptop className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Entitled</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{getTotal('entitled')}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Used</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{getTotal('used')}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <WalletCards className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Remaining</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{getTotal('remaining')}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Exhausted WFH</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{sorted.filter(r => r.remaining <= 0).length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Premium Filter Card */}
        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800/60 p-6 pb-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 mb-1">
              <Filter className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold">WFH Balance Filters</h3>
            </div>
            <p className="text-sm text-slate-500">Filter WFH wallet records by year, employee name/code and usage priority.</p>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 uppercase">Year</Label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 lg:col-span-1">
                <Label className="text-xs font-medium text-slate-500 uppercase">Search by Name/Code</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="e.g. John or EMP001"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="rounded-xl h-10 pl-9 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 w-full"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 uppercase">Sort By</Label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as "remaining" | "used")}>
                    <SelectTrigger className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 flex-1">
                      <div className="flex items-center gap-2">
                        <ArrowDownUp className="h-3.5 w-3.5 text-slate-400" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="remaining">Remaining (high to low)</SelectItem>
                      <SelectItem value="used">Used (high to low)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl h-10 w-10 shrink-0 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setYear(currentYear)
                      setSearch("")
                      setSortBy("remaining")
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

        {/* 4. Loading State */}
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
        ) : sorted.length === 0 ? (
          /* 5. Empty State */
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md p-12">
            <EmptyState
              icon={Layers}
              title="No WFH balances"
              description="No WFH usage records found for the selected year or active filters."
            />
          </Card>
        ) : (
          /* 6. WFH Balance Table */
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/60 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">WFH Wallet Register</h3>
                <p className="text-sm text-slate-500 mt-1">Year-wise WFH entitlement, accrued days, used days and remaining balance.</p>
              </div>
              <Badge variant="secondary" className="rounded-lg px-3 py-1 bg-slate-100 dark:bg-slate-800 font-medium whitespace-nowrap self-start sm:self-auto text-slate-600 dark:text-slate-300 border-none">
                {sorted.length} Records
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                <AnimatedTable>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60">
                    <TableRow className="hover:bg-transparent border-0">
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Employee</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Department</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Entitled</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Accrued</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Used</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Remaining</TableHead>
                      <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Usage Health</TableHead>
                      <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((r, index) => (
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
                        <TableCell>
                          <div className="flex flex-col items-start">
                            <span className="text-lg font-bold text-slate-700 dark:text-slate-300">{r.entitled}</span>
                            <span className="text-[10px] text-slate-500 font-medium">Entitled days</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start">
                            <span className="text-lg font-bold text-slate-700 dark:text-slate-300">{r.accrued}</span>
                            <span className="text-[10px] text-slate-500 font-medium">Accrued days</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start">
                            <span className="text-lg font-bold text-slate-700 dark:text-slate-300">{r.used}</span>
                            <span className="text-[10px] text-slate-500 font-medium">Used days</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.remaining <= 0 ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-lg font-bold text-red-600 dark:text-red-500">{r.remaining}</span>
                              <Badge variant="destructive" className="text-[9px] uppercase tracking-wider px-1 py-0 shadow-none rounded">Exhausted</Badge>
                            </div>
                          ) : r.remaining < r.entitled / 2 ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-lg font-bold text-amber-600 dark:text-amber-500">{r.remaining}</span>
                              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 text-[9px] uppercase tracking-wider px-1 py-0 border-none shadow-none rounded">Low Balance</Badge>
                            </div>
                          ) : (
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-500">{r.remaining}</span>
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] uppercase tracking-wider px-1 py-0 shadow-none rounded">Available</Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5 w-[120px]">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-slate-500 dark:text-slate-400">Usage</span>
                              <span className={getHealthTone(r) === 'red' ? 'text-red-600 dark:text-red-400 font-bold' : getHealthTone(r) === 'amber' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                                {getUsagePercent(r)}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  getHealthTone(r) === 'red' ? 'bg-red-500' : 
                                  getHealthTone(r) === 'amber' ? 'bg-amber-500' : 
                                  'bg-emerald-500'
                                }`} 
                                style={{ width: `${getUsagePercent(r)}%` }}
                              />
                            </div>
                          </div>
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

      {/* 7. Transaction Dialog */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-2xl border-slate-200/60 dark:border-slate-800/60 shadow-2xl bg-white/95 dark:bg-slate-950/95">
          <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">WFH Transactions</DialogTitle>
                <DialogDescription className="mt-1 text-slate-500">
                  Work From Home transaction history for selected employee and year.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/10">
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
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <History className="h-6 w-6 text-slate-400" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">No WFH transactions found</h4>
                <p className="text-sm text-slate-500 mt-1">There is no WFH transaction history for this employee in {year}.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 pl-6 space-y-6">
                {transactions.map((t) => (
                  <div key={t.id} className="relative">
                    {/* Timeline Node */}
                    <div className={`absolute -left-[35px] h-4 w-4 rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center ${t.day_value > 0 ? 'bg-emerald-500' : t.day_value < 0 ? 'bg-rose-500' : 'bg-slate-400'}`} />
                    
                    <div className="bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/70 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{t.action}</span>
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300">
                              {format(new Date(t.date), "dd MMM yyyy")}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{format(new Date(t.action_at), "dd MMM yyyy, hh:mm a")}</p>
                        </div>
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-sm whitespace-nowrap ${
                          t.day_value > 0 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                            : t.day_value < 0 
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {t.day_value > 0 ? <Plus className="h-3 w-3" /> : t.day_value < 0 ? <Minus className="h-3 w-3" /> : null}
                          {Math.abs(t.day_value)} {Math.abs(t.day_value) === 1 ? 'day' : 'days'}
                        </div>
                      </div>
                      <div className="mt-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                        <p className={`text-sm italic ${t.remarks ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                          {t.remarks ? `"${t.remarks}"` : "No remarks"}
                        </p>
                      </div>
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

