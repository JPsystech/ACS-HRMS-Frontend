"use client"

import React, { useEffect, useState, useCallback } from "react"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { RequireRole } from "@/components/auth/RequireRole"
import { PageContainer } from "@/components/ui/page-container"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Loader2,
  Settings2,
  CalendarOff,
  AlertCircle,
  CalendarDays,
  RefreshCw,
  BadgeCheck,
  Clock,
  WalletCards,
  ShieldCheck,
  Play,
  Save,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Info,
  RotateCcw
} from "lucide-react"

type Policy = {
  id: number
  year: number
  annual_pl: number
  annual_cl: number
  annual_sl: number
  annual_rh: number
  annual_fl: number
  public_holiday_total: number | null
  monthly_credit_pl: number
  monthly_credit_cl: number
  monthly_credit_sl: number
  pl_eligibility_months: number
  backdated_max_days: number
  carry_forward_pl_max: number
  sandwich_enabled: boolean
  allow_hr_override: boolean
  created_at?: string
  updated_at?: string
}

const currentYear = new Date().getFullYear()
const YEARS = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2]

const DEFAULT_POLICY = {
  annual_pl: 6,
  annual_cl: 5,
  annual_sl: 6,
  annual_rh: 1,
  annual_fl: 1,
  pl_eligibility_months: 6,
  backdated_max_days: 7,
  carry_forward_pl_max: 4,
  sandwich_enabled: true,
  allow_hr_override: true,
  monthly_credit_pl: 0.5,
  monthly_credit_cl: 0.5,
  monthly_credit_sl: 0.5,
  public_holiday_total: 14,
}

function policyToForm(p: Policy) {
  return {
    annual_pl: p.annual_pl,
    annual_cl: p.annual_cl,
    annual_sl: p.annual_sl,
    annual_rh: p.annual_rh,
    annual_fl: p.annual_fl,
    public_holiday_total: p.public_holiday_total ?? 14,
    monthly_credit_pl: p.monthly_credit_pl,
    monthly_credit_cl: p.monthly_credit_cl,
    monthly_credit_sl: p.monthly_credit_sl,
    pl_eligibility_months: p.pl_eligibility_months,
    backdated_max_days: p.backdated_max_days,
    carry_forward_pl_max: p.carry_forward_pl_max,
    sandwich_enabled: p.sandwich_enabled,
    allow_hr_override: p.allow_hr_override,
  }
}

// Helpers for UI
function formatDateSafe(value?: string) {
  if (!value) return "—"
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return value
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true
    }).format(d)
  } catch {
    return value
  }
}

const renderMetricCard = (label: string, value: React.ReactNode, icon: React.ElementType, tone: string) => {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-800/50",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 border-purple-100 dark:border-purple-800/50",
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-800/50",
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

const renderEnabledBadge = (enabled: boolean) => {
  return enabled ? (
    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 shadow-none">
      Enabled
    </Badge>
  ) : (
    <Badge variant="outline" className="text-slate-500 border-slate-200 dark:border-slate-700 shadow-none">
      Disabled
    </Badge>
  )
}

export default function PolicyPage() {
  const { toast } = useToast()
  const [year, setYear] = useState(currentYear)
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [yearCloseOpen, setYearCloseOpen] = useState(false)
  const [yearCloseSending, setYearCloseSending] = useState(false)

  const [form, setForm] = useState({
    annual_pl: 6,
    annual_cl: 5,
    annual_sl: 6,
    annual_rh: 1,
    annual_fl: 1,
    public_holiday_total: 14,
    monthly_credit_pl: 0.5,
    monthly_credit_cl: 0.5,
    monthly_credit_sl: 0.5,
    pl_eligibility_months: 6,
    backdated_max_days: 7,
    carry_forward_pl_max: 4,
    sandwich_enabled: true,
    allow_hr_override: true,
  })

  const annualTotal = form.annual_pl + form.annual_cl + form.annual_sl + form.annual_rh + form.annual_fl
  const monthlyTotal = Number(form.monthly_credit_pl || 0) + Number(form.monthly_credit_cl || 0) + Number(form.monthly_credit_sl || 0)

  const fetchPolicy = useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .get<Policy>(`/api/v1/policy/${year}`)
      .then((data) => {
        setPolicy(data)
        setForm(policyToForm(data))
      })
      .catch((err: ApiClientError) => {
        if (err.status === 404) {
          setPolicy(null)
          setForm({
            ...DEFAULT_POLICY,
            public_holiday_total: 14,
            monthly_credit_pl: 0.5,
            monthly_credit_cl: 0.5,
            monthly_credit_sl: 0.5,
          })
        } else if (err.status === 403) {
          const msg = "Admin access required to view policy settings"
          setError(msg)
          setPolicy(null)
        } else {
          const msg =
            typeof err.data?.detail === "string"
              ? err.data.detail
              : "Failed to load policy"
          setError(msg)
          setPolicy(null)
        }
      })
      .finally(() => setLoading(false))
  }, [year])

  useEffect(() => {
    fetchPolicy()
  }, [fetchPolicy])

  const handleSave = () => {
    setSaving(true)
    api
      .put<Policy>(`/api/v1/policy/${year}`, {
        annual_pl: Math.round(form.annual_pl),
        annual_cl: Math.round(form.annual_cl),
        annual_sl: Math.round(form.annual_sl),
        annual_rh: Math.round(form.annual_rh),
        annual_fl: Math.round(form.annual_fl),
        public_holiday_total: Math.round(form.public_holiday_total),
        monthly_credit_pl: form.monthly_credit_pl,
        monthly_credit_cl: form.monthly_credit_cl,
        monthly_credit_sl: form.monthly_credit_sl,
        pl_eligibility_months: Math.round(form.pl_eligibility_months),
        backdated_max_days: Math.round(form.backdated_max_days),
        carry_forward_pl_max: Math.round(form.carry_forward_pl_max),
        sandwich_enabled: form.sandwich_enabled,
        allow_hr_override: form.allow_hr_override,
      })
      .then((data) => {
        setPolicy(data)
        setForm(policyToForm(data))
        toast({ title: "Policy updated successfully" })
      })
      .catch((err: ApiClientError) => {
        let msg
        if (err.status === 403) {
          msg = "Admin access required to modify policy settings"
        } else {
          msg =
            typeof err.data?.detail === "string"
              ? err.data.detail
              : "Failed to save policy"
        }
        toast({ title: "Error", description: msg, variant: "destructive" })
      })
      .finally(() => setSaving(false))
  }

  const handleCreateDefault = () => {
    setSaving(true)
    api
      .put<Policy>(`/api/v1/policy/${year}`, {
        annual_pl: DEFAULT_POLICY.annual_pl,
        annual_cl: DEFAULT_POLICY.annual_cl,
        annual_sl: DEFAULT_POLICY.annual_sl,
        annual_rh: DEFAULT_POLICY.annual_rh,
        annual_fl: DEFAULT_POLICY.annual_fl,
        public_holiday_total: 14,
        monthly_credit_pl: 0.5,
        monthly_credit_cl: 0.5,
        monthly_credit_sl: 0.5,
        pl_eligibility_months: DEFAULT_POLICY.pl_eligibility_months,
        backdated_max_days: DEFAULT_POLICY.backdated_max_days,
        carry_forward_pl_max: DEFAULT_POLICY.carry_forward_pl_max,
        sandwich_enabled: DEFAULT_POLICY.sandwich_enabled,
        allow_hr_override: DEFAULT_POLICY.allow_hr_override,
      })
      .then((data) => {
        setPolicy(data)
        setForm(policyToForm(data))
        toast({ title: "Default policy created" })
      })
      .catch((err: ApiClientError) => {
        const msg =
          typeof err.data?.detail === "string"
            ? err.data.detail
            : "Failed to create policy"
        toast({ title: "Error", description: msg, variant: "destructive" })
      })
      .finally(() => setSaving(false))
  }

  const handleYearClose = () => {
    setYearCloseSending(true)
    api
      .post<unknown>(`/api/v1/policy/year-close?year=${year}`)
      .then(() => {
        setYearCloseOpen(false)
        toast({ title: "Year close completed successfully" })
        fetchPolicy()
      })
      .catch((err: ApiClientError) => {
        const msg =
          typeof err.data?.detail === "string"
            ? err.data.detail
            : "Year close failed"
        toast({ title: "Error", description: msg, variant: "destructive" })
      })
      .finally(() => setYearCloseSending(false))
  }

  const num = (v: number) => (Number.isFinite(v) ? v : 0)
  const setNum = (
    key: keyof typeof form,
    value: string,
    min: number = 0,
    max: number = 999
  ) => {
    const n = Math.min(max, Math.max(min, parseFloat(value) || 0))
    if (!Number.isNaN(n)) setForm((f) => ({ ...f, [key]: n }))
  }

  const renderEntitlementInput = (id: keyof typeof form, label: string, helperText: string, tone: string) => {
    const tones: Record<string, string> = {
      purple: "bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800/30",
      blue: "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30",
      emerald: "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30",
      slate: "bg-slate-50/50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800/30",
      orange: "bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800/30",
    }
    const cls = tones[tone] || tones.slate

    return (
      <div className={`space-y-2 p-4 rounded-xl border ${cls}`}>
        <Label htmlFor={id} className="font-semibold text-slate-700 dark:text-slate-300">{label}</Label>
        <Input
          id={id}
          type="number"
          min={0}
          max={99}
          value={form[id] as number}
          onChange={(e) => setNum(id, e.target.value, 0, 99)}
          disabled={saving}
          className="rounded-xl h-10 bg-white/80 dark:bg-slate-950/50 font-bold"
        />
        <p className="text-[11px] font-medium text-slate-500">
          {helperText}
        </p>
      </div>
    )
  }

  const renderRuleInput = (id: keyof typeof form, label: string, helperText: string, maxLimit: number = 31) => (
    <div className="space-y-2 p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/50">
      <Label htmlFor={id} className="font-semibold text-slate-700 dark:text-slate-300">{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        max={maxLimit}
        value={form[id] as number}
        onChange={(e) => setNum(id, e.target.value, 0, maxLimit)}
        disabled={saving}
        className="rounded-xl h-10 bg-white/80 dark:bg-slate-950/50 font-bold"
      />
      <p className="text-[11px] font-medium text-slate-500">
        {helperText}
      </p>
    </div>
  )

  const renderSwitchRule = (id: 'sandwich_enabled' | 'allow_hr_override', label: string, desc: string, icon: React.ReactNode) => (
    <div className="flex items-start justify-between space-x-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-indigo-500 dark:text-indigo-400">
          {icon}
        </div>
        <div className="flex flex-col">
          <Label htmlFor={id} className="font-semibold text-slate-900 dark:text-slate-100 leading-snug cursor-pointer">
            {label}
          </Label>
          <span className="text-xs text-slate-500 mt-1 max-w-[200px]">
            {desc}
          </span>
        </div>
      </div>
      <Switch
        id={id}
        checked={form[id]}
        onCheckedChange={(checked) => setForm((f) => ({ ...f, [id]: checked }))}
        disabled={saving}
        className="data-[state=checked]:bg-emerald-500 mt-1 shrink-0"
      />
    </div>
  )

  return (
    <RequireRole allowedRoles={["ADMIN"]}>
      <PageContainer>
        <div className="space-y-6">

          {/* 1. Hero Section */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-8 shadow-xl">
            <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
              <ShieldCheck className="h-72 w-72 text-white" />
            </div>
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 text-white">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm shadow-sm">
                    Admin Policy Engine
                  </Badge>
                  <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-indigo-200 border-none backdrop-blur-sm font-semibold shadow-sm">
                    Year {year}
                  </Badge>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Leave Policy Control Center</h1>
                <p className="max-w-xl text-slate-300">
                  Configure yearly leave entitlements, eligibility rules, monthly accrual, HR override and year-end closing actions.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-white/10 dark:bg-slate-900/50 backdrop-blur-md border border-white/10 p-2 rounded-2xl shadow-inner w-max">
                <Label htmlFor="hero-year" className="text-sm font-semibold text-white ml-2">Policy Year</Label>
                <Select
                  value={String(year)}
                  onValueChange={(v) => setYear(Number(v))}
                  disabled={loading}
                >
                  <SelectTrigger id="hero-year" className="w-[120px] rounded-xl bg-white text-slate-900 border-none font-bold h-10 shadow-sm focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)} className="font-medium">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 2. KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {renderMetricCard("Annual Leave Total", annualTotal, CalendarDays, "indigo")}
            {renderMetricCard("Monthly Accrual Total", monthlyTotal.toFixed(2), RefreshCw, "blue")}
            {renderMetricCard("PL Eligibility", `${form.pl_eligibility_months} Months`, BadgeCheck, "emerald")}
            {renderMetricCard("Backdated Limit", `${form.backdated_max_days} Days`, Clock, "amber")}
            {renderMetricCard("Carry Forward PL", `${form.carry_forward_pl_max} Days`, WalletCards, "purple")}
          </div>

          {/* 3. Loading & Error & No Policy States */}
          {loading && (
            <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-semibold">Loading leave policy...</span>
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/4 rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && error && (
            <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 p-6 shadow-sm">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-red-800 dark:text-red-300">Failed to load policy</h4>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1 font-medium">{error}</p>
                <p className="text-sm text-red-500/80 dark:text-red-400/80 mt-1">Check your connection and try again, or select another year.</p>
                <Button variant="outline" size="sm" onClick={fetchPolicy} className="mt-4 rounded-lg border-red-200 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/50">
                  <RotateCcw className="h-3 w-3 mr-2" /> Retry
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && !policy && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 p-10 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
              <div className="h-20 w-20 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center mb-6 shadow-inner z-10">
                <CalendarOff className="h-10 w-10 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-amber-900 dark:text-amber-100 mb-3 z-10">No policy configured for {year}</h2>
              <p className="text-amber-700 dark:text-amber-300/80 max-w-lg mb-8 font-medium z-10">
                Create a default ACS leave policy for this year and then adjust entitlements, rules and accrual settings.
              </p>

              <Button
                className="rounded-xl h-12 px-8 text-base bg-amber-600 hover:bg-amber-700 text-white shadow-md z-10"
                onClick={handleCreateDefault}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Default Policy...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Create Default Policy
                  </>
                )}
              </Button>

              <div className="mt-10 flex flex-wrap justify-center gap-2 max-w-2xl z-10">
                <Badge variant="outline" className="bg-white/60 dark:bg-slate-950/40 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200">PL {DEFAULT_POLICY.annual_pl}</Badge>
                <Badge variant="outline" className="bg-white/60 dark:bg-slate-950/40 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200">CL {DEFAULT_POLICY.annual_cl}</Badge>
                <Badge variant="outline" className="bg-white/60 dark:bg-slate-950/40 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200">SL {DEFAULT_POLICY.annual_sl}</Badge>
                <Badge variant="outline" className="bg-white/60 dark:bg-slate-950/40 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200">RH {DEFAULT_POLICY.annual_rh}</Badge>
                <Badge variant="outline" className="bg-white/60 dark:bg-slate-950/40 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200">FL {DEFAULT_POLICY.annual_fl}</Badge>
                <Badge variant="outline" className="bg-white/60 dark:bg-slate-950/40 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200">PL Eligibility {DEFAULT_POLICY.pl_eligibility_months} Months</Badge>
                <Badge variant="outline" className="bg-white/60 dark:bg-slate-950/40 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200">Backdated {DEFAULT_POLICY.backdated_max_days} Days</Badge>
                <Badge variant="outline" className="bg-white/60 dark:bg-slate-950/40 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200">Carry Forward PL {DEFAULT_POLICY.carry_forward_pl_max} Days</Badge>
                <Badge variant="outline" className="bg-white/60 dark:bg-slate-950/40 border-amber-200 dark:border-amber-900/50 text-emerald-700 dark:text-emerald-400 border-emerald-200">Sandwich Enabled</Badge>
                <Badge variant="outline" className="bg-white/60 dark:bg-slate-950/40 border-amber-200 dark:border-amber-900/50 text-emerald-700 dark:text-emerald-400 border-emerald-200">HR Override Enabled</Badge>
              </div>
            </div>
          )}

          {/* 4. Main Configuration Area */}
          {!loading && !error && policy && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              <div className="xl:col-span-2 space-y-6">

                {/* Entitlements Panel */}
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 p-6 flex flex-row justify-between items-start gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shadow-sm">
                        <WalletCards className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">Leave Entitlements</CardTitle>
                        <CardDescription className="text-sm text-slate-500 mt-1">
                          Annual days per leave type for the selected policy year.
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3 py-1 font-semibold shadow-sm">
                      Annual Setup
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                      {renderEntitlementInput("annual_pl", "PL", "Paid Leave per year", "purple")}
                      {renderEntitlementInput("annual_cl", "CL", "Casual Leave per year", "blue")}
                      {renderEntitlementInput("annual_sl", "SL", "Sick Leave per year", "emerald")}
                      {renderEntitlementInput("annual_rh", "RH", "Restricted Holiday per year", "slate")}
                      {renderEntitlementInput("annual_fl", "FL", "Flexi Leave for Nov-Dec accrual", "orange")}
                    </div>
                  </CardContent>
                </Card>

                {/* Rules Panel */}
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 p-6 flex flex-row justify-between items-start gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shadow-sm">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">Leave Rules</CardTitle>
                        <CardDescription className="text-sm text-slate-500 mt-1">
                          Eligibility, backdated leave, carry forward and validation rules.
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3 py-1 font-semibold shadow-sm">
                      Rule Engine
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {renderRuleInput("pl_eligibility_months", "PL Eligibility Months", "PL allowed only after this many months (default 6)", 24)}
                      {renderRuleInput("backdated_max_days", "Backdated Leave Limit Days", "Max days for emergency backdated leave (default 7)")}
                      {renderRuleInput("carry_forward_pl_max", "Carry Forward Limit for PL", "Max PL carried to next year (default 4)")}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {renderSwitchRule(
                        "sandwich_enabled",
                        "Sandwich Rule Enabled",
                        "Automatically apply sandwich rule where policy conditions match.",
                        <CheckCircle className="h-5 w-5" />
                      )}
                      {renderSwitchRule(
                        "allow_hr_override",
                        "Auto Convert Shortage to LWP / Allow HR Override",
                        "Allow HR/admin override and auto-convert leave shortage to LWP.",
                        <Settings2 className="h-5 w-5" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Accrual Panel */}
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 p-6 flex flex-row justify-between items-start gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shadow-sm">
                        <RefreshCw className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">Monthly Accrual</CardTitle>
                        <CardDescription className="text-sm text-slate-500 mt-1">
                          Monthly credit rates for PL, CL and SL.
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3 py-1 font-semibold shadow-sm">
                      Accrual Setup
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="monthly_credit_pl" className="font-semibold text-slate-700 dark:text-slate-300">Monthly PL Accrual</Label>
                        <Input
                          id="monthly_credit_pl"
                          type="number"
                          min={0}
                          step={0.01}
                          value={num(form.monthly_credit_pl).toFixed(2)}
                          onChange={(e) => setNum("monthly_credit_pl", e.target.value, 0, 10)}
                          disabled={saving}
                          className="rounded-xl h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="monthly_credit_cl" className="font-semibold text-slate-700 dark:text-slate-300">Monthly CL Accrual</Label>
                        <Input
                          id="monthly_credit_cl"
                          type="number"
                          min={0}
                          step={0.01}
                          value={num(form.monthly_credit_cl).toFixed(2)}
                          onChange={(e) => setNum("monthly_credit_cl", e.target.value, 0, 10)}
                          disabled={saving}
                          className="rounded-xl h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="monthly_credit_sl" className="font-semibold text-slate-700 dark:text-slate-300">Monthly SL Accrual</Label>
                        <Input
                          id="monthly_credit_sl"
                          type="number"
                          min={0}
                          step={0.01}
                          value={num(form.monthly_credit_sl).toFixed(2)}
                          onChange={(e) => setNum("monthly_credit_sl", e.target.value, 0, 10)}
                          disabled={saving}
                          className="rounded-xl h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="public_holiday_total" className="font-semibold text-slate-700 dark:text-slate-300">Public Holidays</Label>
                        <Input
                          id="public_holiday_total"
                          type="number"
                          min={0}
                          max={31}
                          value={form.public_holiday_total}
                          onChange={(e) => setNum("public_holiday_total", e.target.value, 0, 31)}
                          disabled={saving}
                          className="rounded-xl h-10"
                        />
                      </div>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
                        <Info className="h-4 w-4" /> Accrual Preview
                      </div>
                      <div className="flex flex-col md:flex-row gap-4 md:gap-8 text-sm font-medium text-indigo-900/80 dark:text-indigo-200/80">
                        <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-950/50 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                          <span className="font-bold text-indigo-800 dark:text-indigo-300">Jan–Oct:</span> PL {num(form.monthly_credit_pl).toFixed(2)} + CL {num(form.monthly_credit_cl).toFixed(2)} + SL {num(form.monthly_credit_sl).toFixed(2)} = {(num(form.monthly_credit_pl) + num(form.monthly_credit_cl) + num(form.monthly_credit_sl)).toFixed(2)} days/month
                        </div>
                        <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-950/50 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                          <span className="font-bold text-indigo-800 dark:text-indigo-300">Nov–Dec:</span> PL {num(form.monthly_credit_pl).toFixed(2)} + FL {(form.annual_fl / 2).toFixed(2)} + SL {num(form.monthly_credit_sl).toFixed(2)} = {(num(form.monthly_credit_pl) + (form.annual_fl / 2) + num(form.monthly_credit_sl)).toFixed(2)} days/month
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        variant="outline"
                        className="rounded-xl bg-white dark:bg-slate-950 shadow-sm"
                        onClick={() => {
                          api.post(`/api/v1/accrual/run?year=${year}`)
                            .then(() => toast({ title: "Accrual run completed" }))
                            .catch((err: ApiClientError) => {
                              const msg = typeof err.data?.detail === "string" ? err.data.detail : "Accrual run failed"
                              toast({ title: "Error", description: msg, variant: "destructive" })
                            })
                        }}
                        disabled={saving}
                      >
                        <Play className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        Run Accrual for {year}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6 xl:sticky xl:top-6">

                {/* Policy Summary / Save Panel */}
                <Card className="rounded-2xl border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 p-5">
                    <CardTitle className="text-lg font-bold">Policy Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-5">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Selected Year</span>
                        <span className="font-bold">{year}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Policy Status</span>
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none shadow-none">Configured</Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Annual Total Leave</span>
                        <span className="font-bold">{annualTotal} Days</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Monthly Credit Total</span>
                        <span className="font-bold">{monthlyTotal.toFixed(2)} Days</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 font-medium">Sandwich Rule</span>
                        {renderEnabledBadge(form.sandwich_enabled)}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">HR Override</span>
                        {renderEnabledBadge(form.allow_hr_override)}
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 font-medium">Last Updated</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">{formatDateSafe(policy.updated_at)}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 shadow-md"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving Policy...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-5 w-5" /> Save Policy
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Year End Actions Panel */}
                <Card className="rounded-2xl border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10 shadow-sm overflow-hidden">
                  <CardHeader className="p-5 pb-3">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-amber-900 dark:text-amber-100">
                      <AlertTriangle className="h-5 w-5 text-amber-500" /> Year End Actions
                    </CardTitle>
                    <CardDescription className="text-amber-700/80 dark:text-amber-300/80 text-xs mt-2">
                      Year Close will lapse unused CL & SL, carry forward PL up to the configured limit, and create encashment records if applicable.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-white/60 dark:bg-slate-950/40 border-amber-200 text-amber-800 dark:border-amber-800 dark:text-amber-200 shadow-none text-[10px]">CL/SL WILL LAPSE</Badge>
                      <Badge variant="outline" className="bg-white/60 dark:bg-slate-950/40 border-amber-200 text-amber-800 dark:border-amber-800 dark:text-amber-200 shadow-none text-[10px]">PL CARRY FORWARD MAX {form.carry_forward_pl_max}</Badge>
                      <Badge variant="outline" className="bg-white/60 dark:bg-slate-950/40 border-amber-200 text-amber-800 dark:border-amber-800 dark:text-amber-200 shadow-none text-[10px]">ENCASHMENT RECORDS MAY BE CREATED</Badge>
                    </div>
                    <Button
                      variant="destructive"
                      className="w-full rounded-xl h-10"
                      onClick={() => setYearCloseOpen(true)}
                      disabled={yearCloseSending}
                    >
                      {yearCloseSending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...</>
                      ) : (
                        "Run Year Close"
                      )}
                    </Button>
                  </CardContent>
                </Card>

              </div>
            </div>
          )}
        </div>

        {/* Year Close Dialog */}
        <AlertDialog open={yearCloseOpen} onOpenChange={setYearCloseOpen}>
          <AlertDialogContent className="rounded-2xl border-red-200 dark:border-red-900/50 p-0 overflow-hidden sm:max-w-md">
            <div className="bg-red-50 dark:bg-red-950/30 p-6 flex items-start gap-4 border-b border-red-100 dark:border-red-900/50">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold text-red-900 dark:text-red-100">Run Year Close?</AlertDialogTitle>
                <AlertDialogDescription className="text-red-700 dark:text-red-300/80 mt-1">
                  This action cannot be undone. It will permanently perform year-end processing for {year}.
                </AlertDialogDescription>
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-slate-950">
              <div className="rounded-xl border border-red-100 dark:border-red-900/50 p-4 bg-red-50/50 dark:bg-red-950/10 space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-500">Target Year:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{year}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-500">Carry Forward PL Max:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{form.carry_forward_pl_max} Days</span>
                </div>
                <div className="flex justify-between text-sm border-t border-red-100 dark:border-red-900/50 pt-3">
                  <span className="font-medium text-slate-500">Action:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">Lapse unused leaves & create encashment</span>
                </div>
              </div>

              <AlertDialogFooter className="gap-2 sm:gap-0">
                <AlertDialogCancel disabled={yearCloseSending} className="rounded-xl">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleYearClose}
                  disabled={yearCloseSending}
                  className="rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md"
                >
                  {yearCloseSending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...</>
                  ) : (
                    "Continue Year Close"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </RequireRole>
  )
}
