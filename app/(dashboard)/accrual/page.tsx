"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { RequireRole } from "@/components/auth/RequireRole"
import { PageContainer } from "@/components/ui/page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { 
  Calendar, 
  Play, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Users,
  CalendarCheck,
  HeartPulse,
  BriefcaseBusiness,
  WalletCards,
  BadgeCheck,
  Building2,
  Clock,
  TrendingUp,
  ShieldCheck
} from "lucide-react"

interface AccrualRunResult {
  month?: string
  year?: number
  months_run?: number
  total_employees_processed: number
  credited_count: number
  skipped_not_eligible: number
  skipped_inactive: number
  details: Array<{
    employee_id: number
    emp_code: string
    name: string
    cl_remaining?: number
    sl_remaining?: number
    pl_remaining?: number
  }>
  credit: string
}

interface AccrualStatus {
  year: number
  employees: Array<{
    employee_id: number
    emp_code: string
    name: string
    join_date: string
    cl_remaining: number
    sl_remaining: number
    pl_remaining: number
    cl_used: number
    sl_used: number
    pl_used: number
  }>
  total: number
  credit: string
}

// Helpers
function getInitials(name: string) {
  if (!name) return "??"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
}

function formatDateSafe(value?: string) {
  if (!value) return "—"
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return value
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit", month: "short", year: "numeric"
    }).format(d)
  } catch {
    return value
  }
}

export default function AccrualPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [runResult, setRunResult] = useState<AccrualRunResult | null>(null)
  const [statusData, setStatusData] = useState<AccrualStatus | null>(null)
  const [apiError, setApiError] = useState<string>("")
  const [runType, setRunType] = useState<"month" | "year">("month")
  const [month, setMonth] = useState<string>(getCurrentMonth())
  const [year, setYear] = useState<number>(new Date().getFullYear())

  function getCurrentMonth(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const sumField = (field: "cl_remaining" | "sl_remaining" | "pl_remaining" | "cl_used" | "sl_used" | "pl_used") => {
    return statusData?.employees.reduce((acc, emp) => acc + (emp[field] || 0), 0) || 0
  }

  const runAccrual = async () => {
    if (!user || user.role !== "ADMIN") return

    setRunning(true)
    setApiError("")
    
    try {
      let result: AccrualRunResult
      
      if (runType === "month") {
        result = await api.post<AccrualRunResult>(`/api/v1/accrual/run?month=${month}`)
      } else {
        result = await api.post<AccrualRunResult>(`/api/v1/accrual/run?year=${year}`)
      }
      
      setRunResult(result)
      toast({
        title: "Accrual Completed",
        description: `Processed ${result.total_employees_processed} employees, credited ${result.credited_count}`,
      })
      
      // Refresh status after running
      fetchAccrualStatus()
      
    } catch (err) {
      console.error("Accrual run failed:", err)
      let errorMsg = "Failed to run accrual"
      
      if (err instanceof ApiClientError) {
        if (err.status === 403) {
          errorMsg = "Admin access required to run accrual"
        } else {
          errorMsg = err.data.detail || errorMsg
        }
      }
      
      setApiError(errorMsg)
      toast({
        variant: "destructive",
        title: "Accrual Failed",
        description: errorMsg,
      })
    } finally {
      setRunning(false)
    }
  }

  const fetchAccrualStatus = useCallback(async () => {
    if (!user || user.role !== "ADMIN") return

    setStatusLoading(true)
    setApiError("")
    
    try {
      const status = await api.get<AccrualStatus>(`/api/v1/accrual/status?year=${year}`)
      setStatusData(status)
    } catch (err) {
      console.error("Accrual status fetch failed:", err)
      let errorMsg = "Failed to fetch accrual status"
      
      if (err instanceof ApiClientError) {
        if (err.status === 403) {
          errorMsg = "Admin access required to view accrual status"
        } else {
          errorMsg = err.data.detail || errorMsg
        }
      }
      
      setApiError(errorMsg)
    } finally {
      setStatusLoading(false)
    }
  }, [user, year])

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchAccrualStatus()
    }
  }, [user, year, fetchAccrualStatus])

  const renderMetricCard = (label: string, value: React.ReactNode, icon: React.ElementType, tone: string) => {
    const tones: Record<string, string> = {
      blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-800/50",
      emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50",
      purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 border-purple-100 dark:border-purple-800/50",
      indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50",
      slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
    }
    const colorClass = tones[tone] || tones.slate
    const Icon = icon

    return (
      <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm backdrop-blur-md">
        <CardContent className="flex items-center gap-4 p-5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderLeaveWalletCell = (remaining: number, used: number, tone: "blue" | "emerald" | "purple") => {
    const tones = {
      blue: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800/50",
      emerald: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/50",
      purple: "text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-800/50",
      exhausted: "text-slate-500 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700"
    }
    const isActive = remaining > 0
    const colorClass = isActive ? tones[tone] : tones.exhausted

    return (
      <div className="flex flex-col gap-1">
        <div className={`flex flex-col border rounded-xl p-2.5 shadow-sm ${colorClass}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Remaining</span>
            <span className="text-lg font-bold leading-none">{remaining}</span>
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-black/10 dark:border-white/10">
            <span className="text-[10px] font-medium opacity-80">Used: {used}</span>
            {isActive ? (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shadow-none uppercase border-current opacity-80">Available</Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shadow-none uppercase border-current opacity-80">Exhausted</Badge>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <RequireRole allowedRoles={["ADMIN"]}>
      <PageContainer>
        <div className="space-y-6">
          
          {/* 1. Hero Section */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-8 shadow-xl">
            <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
              <WalletCards className="h-72 w-72 text-white" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 text-white">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm shadow-sm">
                    ACS HRMS Accrual Engine
                  </Badge>
                  <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-indigo-200 border-none backdrop-blur-sm font-semibold shadow-sm">
                    Year {year}
                  </Badge>
                  {runType === "month" ? (
                    <Badge variant="secondary" className="bg-indigo-500/30 text-indigo-100 border-none backdrop-blur-sm font-semibold shadow-sm">
                      Month {month}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-emerald-500/30 text-emerald-100 border-none backdrop-blur-sm font-semibold shadow-sm">
                      Yearly Run
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Accrual Control Center</h1>
                <p className="max-w-xl text-slate-300">
                  Run monthly or yearly leave accrual, credit eligible employees and monitor CL, SL and PL balances.
                </p>
              </div>
            </div>
          </div>

          {/* 2. KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {renderMetricCard("Employees in Status", statusData?.total || statusData?.employees.length || 0, Users, "slate")}
            {renderMetricCard("Total CL Remaining", sumField("cl_remaining"), HeartPulse, "blue")}
            {renderMetricCard("Total SL Remaining", sumField("sl_remaining"), BriefcaseBusiness, "emerald")}
            {renderMetricCard("Total PL Remaining", sumField("pl_remaining"), CalendarCheck, "purple")}
            {renderMetricCard("Last Credited Count", runResult?.credited_count || 0, CheckCircle, "indigo")}
          </div>

          {/* 3. API Error Card */}
          {apiError && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 p-4 shadow-sm">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-800 dark:text-red-300">Accrual action failed</h4>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{apiError}</p>
              </div>
            </div>
          )}

          {/* 4. Run Accrual Panel */}
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shadow-sm">
                  {running ? <RefreshCw className="h-6 w-6 animate-spin" /> : <Play className="h-6 w-6" />}
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Run Accrual</CardTitle>
                  <CardDescription className="text-sm text-slate-500 mt-1 max-w-xl">
                    Monthly accrual follows policy: Jan–Oct CL accrues; from Nov CL stops and FL accrues with PL as per policy.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="rounded-lg bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 px-3 py-1 font-semibold flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                <ShieldCheck className="h-3.5 w-3.5" /> Admin Only
              </Badge>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Run Type</Label>
                  <Select value={runType} onValueChange={(value: "month" | "year") => setRunType(value)} disabled={running}>
                    <SelectTrigger className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {runType === "month" ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Month (YYYY-MM)</Label>
                    <Input
                      type="text"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      placeholder="2026-02"
                      className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50 font-mono text-sm"
                      disabled={running}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Year</Label>
                    <Input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      placeholder="2026"
                      className="rounded-xl h-10 bg-slate-50/50 dark:bg-slate-900/50 font-mono text-sm"
                      disabled={running}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-transparent uppercase tracking-wider hidden md:block">&nbsp;</Label>
                  <Button 
                    onClick={runAccrual} 
                    disabled={running || loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 shadow-sm transition-all"
                  >
                    {running ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Running Accrual...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Run Accrual
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-xl p-4 text-indigo-800 dark:text-indigo-300 shadow-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">
                  Accrual should be run carefully. Re-run only when policy and employee eligibility are verified.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 5. Accrual Result Card */}
          {runResult && (
            <Card className="rounded-2xl border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-emerald-100 dark:border-emerald-900/30 flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">Accrual Completed Successfully</h3>
                  <p className="text-emerald-600 dark:text-emerald-400/80 text-sm mt-1">
                    Latest run processed employee eligibility and credited leave balances.
                  </p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="rounded-xl bg-white/70 dark:bg-slate-950/40 border border-emerald-100 dark:border-emerald-900/30 p-3 shadow-sm">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Processed</p>
                    <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{runResult.total_employees_processed}</p>
                  </div>
                  <div className="rounded-xl bg-white/70 dark:bg-slate-950/40 border border-emerald-100 dark:border-emerald-900/30 p-3 shadow-sm">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Credited</p>
                    <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{runResult.credited_count}</p>
                  </div>
                  <div className="rounded-xl bg-white/70 dark:bg-slate-950/40 border border-emerald-100 dark:border-emerald-900/30 p-3 shadow-sm">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Skip (Ineligible)</p>
                    <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{runResult.skipped_not_eligible}</p>
                  </div>
                  <div className="rounded-xl bg-white/70 dark:bg-slate-950/40 border border-emerald-100 dark:border-emerald-900/30 p-3 shadow-sm">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Skip (Inactive)</p>
                    <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{runResult.skipped_inactive}</p>
                  </div>
                  <div className="rounded-xl bg-white/70 dark:bg-slate-950/40 border border-emerald-100 dark:border-emerald-900/30 p-3 shadow-sm">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Credit Type</p>
                    <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100 truncate mt-1">{runResult.credit}</p>
                  </div>
                </div>

                {runResult.details && runResult.details.length > 0 && (
                  <div className="mt-6 border border-emerald-100 dark:border-emerald-900/30 rounded-xl overflow-hidden bg-white/50 dark:bg-slate-950/20">
                    <div className="px-4 py-2 bg-emerald-100/50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900/30">
                      <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Credited Employees Preview</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-white/30 dark:bg-slate-950/30 text-emerald-700 dark:text-emerald-400 border-b border-emerald-100 dark:border-emerald-900/30 text-left">
                          <tr>
                            <th className="px-4 py-2 font-medium">Employee</th>
                            <th className="px-4 py-2 font-medium">Emp Code</th>
                            <th className="px-4 py-2 font-medium">CL</th>
                            <th className="px-4 py-2 font-medium">SL</th>
                            <th className="px-4 py-2 font-medium">PL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {runResult.details.slice(0, 5).map((d) => (
                            <tr key={d.employee_id} className="border-b border-emerald-50/50 dark:border-emerald-900/10 last:border-0 hover:bg-white/40 dark:hover:bg-slate-950/40">
                              <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{d.name}</td>
                              <td className="px-4 py-2 font-mono text-slate-500">{d.emp_code}</td>
                              <td className="px-4 py-2 font-mono text-blue-600 dark:text-blue-400">{d.cl_remaining !== undefined ? d.cl_remaining : "-"}</td>
                              <td className="px-4 py-2 font-mono text-emerald-600 dark:text-emerald-400">{d.sl_remaining !== undefined ? d.sl_remaining : "-"}</td>
                              <td className="px-4 py-2 font-mono text-purple-600 dark:text-purple-400">{d.pl_remaining !== undefined ? d.pl_remaining : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {runResult.details.length > 5 && (
                      <div className="px-4 py-2 bg-white/30 dark:bg-slate-950/30 text-xs text-emerald-600 dark:text-emerald-400 text-center font-medium">
                        Showing 5 of {runResult.details.length} credited employees.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* 6. Accrual Status Card */}
          <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-indigo-500" /> Accrual Status Register - {year}
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 mt-1 max-w-xl">
                  Current leave balances and used leave summary for employees in the selected accrual year.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
                  <Label htmlFor="status-year" className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-2">Status Year</Label>
                  <Input
                    type="number"
                    id="status-year"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-24 h-8 rounded-lg border-none bg-slate-50 dark:bg-slate-900 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <Badge variant="outline" className="rounded-lg bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50 px-3 py-2 font-semibold shadow-sm h-10 flex items-center">
                  {statusData?.total || 0} Employees
                </Badge>
                <Button variant="outline" size="icon" onClick={fetchAccrualStatus} disabled={statusLoading} className="rounded-xl h-10 w-10 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                  <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {statusLoading ? (
                <div className="p-6">
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-950">
                    <Skeleton className="h-10 w-full mb-4 rounded-lg" />
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full mb-2 rounded-xl" />
                    ))}
                  </div>
                </div>
              ) : statusData && statusData.employees.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto p-6">
                    <div className="min-w-[950px] border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
                      <AnimatedTable>
                        <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60">
                          <TableRow className="hover:bg-transparent border-0">
                            <TableHead className="font-semibold text-slate-600 dark:text-slate-300 w-[250px]">Employee</TableHead>
                            <TableHead className="font-semibold text-slate-600 dark:text-slate-300 w-[120px]">Join Date</TableHead>
                            <TableHead className="font-semibold text-slate-600 dark:text-slate-300 w-[140px]">CL Wallet</TableHead>
                            <TableHead className="font-semibold text-slate-600 dark:text-slate-300 w-[140px]">SL Wallet</TableHead>
                            <TableHead className="font-semibold text-slate-600 dark:text-slate-300 w-[140px]">PL Wallet</TableHead>
                            <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Total Remaining</TableHead>
                            <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Usage Summary</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statusData.employees.slice(0, 10).map((emp, index) => {
                            const totalRem = emp.cl_remaining + emp.sl_remaining + emp.pl_remaining
                            const totalUsed = emp.cl_used + emp.sl_used + emp.pl_used
                            const totalOverall = totalRem + totalUsed
                            const progressPercent = totalOverall > 0 ? (totalUsed / totalOverall) * 100 : 0

                            return (
                              <AnimatedTableRow key={emp.employee_id} delay={index * 0.02} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-0 group">
                                <TableCell>
                                  <div className="flex items-center gap-3 py-1">
                                    <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center text-sm shadow-sm">
                                      {getInitials(emp.name)}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-900 dark:text-slate-100">{emp.name}</span>
                                      <span className="text-xs font-mono text-slate-500 mt-0.5">Emp #{emp.emp_code}</span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                    {formatDateSafe(emp.join_date)}
                                  </div>
                                </TableCell>
                                <TableCell>{renderLeaveWalletCell(emp.cl_remaining, emp.cl_used, "blue")}</TableCell>
                                <TableCell>{renderLeaveWalletCell(emp.sl_remaining, emp.sl_used, "emerald")}</TableCell>
                                <TableCell>{renderLeaveWalletCell(emp.pl_remaining, emp.pl_used, "purple")}</TableCell>
                                <TableCell>
                                  <div className={`inline-flex items-center justify-center h-10 min-w-[3rem] px-3 rounded-xl border font-bold text-lg shadow-sm ${totalRem > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800/50 dark:text-indigo-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400'}`}>
                                    {totalRem}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1.5 w-full max-w-[120px]">
                                    <div className="flex justify-between text-xs font-medium">
                                      <span className="text-slate-500">Used</span>
                                      <span className="text-slate-900 dark:text-slate-100">{totalUsed} days</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                                    </div>
                                  </div>
                                </TableCell>
                              </AnimatedTableRow>
                            )
                          })}
                        </TableBody>
                      </AnimatedTable>
                    </div>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden p-4 space-y-4">
                    {statusData.employees.slice(0, 10).map((emp) => {
                      const totalRem = emp.cl_remaining + emp.sl_remaining + emp.pl_remaining
                      const totalUsed = emp.cl_used + emp.sl_used + emp.pl_used
                      const totalOverall = totalRem + totalUsed
                      const progressPercent = totalOverall > 0 ? (totalUsed / totalOverall) * 100 : 0

                      return (
                        <Card key={emp.employee_id} className="rounded-2xl border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
                          <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center text-sm shadow-sm">
                                {getInitials(emp.name)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 dark:text-slate-100">{emp.name}</span>
                                <span className="text-xs font-mono text-slate-500 mt-0.5">#{emp.emp_code}</span>
                              </div>
                            </div>
                            <div className={`inline-flex items-center justify-center h-8 min-w-[2.5rem] px-2 rounded-lg border font-bold shadow-sm ${totalRem > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                              {totalRem} Rem
                            </div>
                          </div>
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                              {renderLeaveWalletCell(emp.cl_remaining, emp.cl_used, "blue")}
                              {renderLeaveWalletCell(emp.sl_remaining, emp.sl_used, "emerald")}
                              {renderLeaveWalletCell(emp.pl_remaining, emp.pl_used, "purple")}
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                              <div className="flex justify-between text-xs font-medium mb-1.5">
                                <span className="text-slate-500">Total Usage Summary</span>
                                <span className="text-slate-900 dark:text-slate-100">{totalUsed} days used</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>

                  {statusData.employees.length > 10 && (
                    <div className="px-6 pb-6">
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 p-4 text-center">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          Showing 10 of {statusData.total} employees. Use the Leave Balances page for full detailed wallet analysis.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-6">
                  <div className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/50 dark:bg-slate-950/40 p-12 flex flex-col items-center justify-center text-center">
                    <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4 shadow-sm">
                      <Calendar className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No Accrual Data</h3>
                    <p className="text-slate-500 max-w-md mb-6">Run accrual to see employee leave balances for the selected year.</p>
                    <Button onClick={runAccrual} disabled={running || loading} className="rounded-xl shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white">
                      {running ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                      Run Accrual Now
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </PageContainer>
    </RequireRole>
  )
}
