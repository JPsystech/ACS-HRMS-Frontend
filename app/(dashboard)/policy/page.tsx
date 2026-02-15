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
import { Loader2, Settings2, CalendarOff, AlertCircle } from "lucide-react"

type Policy = {
  id: number
  year: number
  annual_pl: number
  annual_cl: number
  annual_sl: number
  annual_rh: number
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
  annual_pl: 7,
  annual_cl: 5,
  annual_sl: 6,
  annual_rh: 1,
  pl_eligibility_months: 6,
  backdated_max_days: 7,
  carry_forward_pl_max: 4,
  sandwich_enabled: true,
  allow_hr_override: true,
  monthly_credit_pl: 7 / 12,
  monthly_credit_cl: 5 / 12,
  monthly_credit_sl: 0,
  public_holiday_total: 14,
}

function policyToForm(p: Policy) {
  return {
    annual_pl: p.annual_pl,
    annual_cl: p.annual_cl,
    annual_sl: p.annual_sl,
    annual_rh: p.annual_rh,
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
    annual_pl: 7,
    annual_cl: 5,
    annual_sl: 6,
    annual_rh: 1,
    public_holiday_total: 14,
    monthly_credit_pl: 7 / 12,
    monthly_credit_cl: 5 / 12,
    monthly_credit_sl: 0,
    pl_eligibility_months: 6,
    backdated_max_days: 7,
    carry_forward_pl_max: 4,
    sandwich_enabled: true,
    allow_hr_override: true,
  })

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
            monthly_credit_pl: DEFAULT_POLICY.annual_pl / 12,
            monthly_credit_cl: DEFAULT_POLICY.annual_cl / 12,
            monthly_credit_sl: 0,
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
        public_holiday_total: 14,
        monthly_credit_pl: DEFAULT_POLICY.annual_pl / 12,
        monthly_credit_cl: DEFAULT_POLICY.annual_cl / 12,
        monthly_credit_sl: 0,
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

  return (
    <RequireRole allowedRoles={["ADMIN"]}>
      <PageContainer>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Leave Policy Management</h1>
              <p className="text-muted-foreground mt-1">
                Configure yearly leave entitlements, rules, and accruals.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="policy-year" className="text-sm font-medium">
                Year
              </Label>
              <Select
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
                disabled={loading}
              >
                <SelectTrigger id="policy-year" className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading policy…
                </div>
                <Skeleton className="mt-4 h-48 w-full rounded-md" />
              </CardContent>
            </Card>
          )}

          {!loading && error && (
            <Card className="border-destructive/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Check your connection and try again, or select another year.
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && !policy && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">
                  No policy configured for this year.
                </p>
                <Button
                  className="mt-4"
                  onClick={handleCreateDefault}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    "Create Default Policy"
                  )}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  PL: 7, CL: 5, SL: 6, RH: 1 · PL eligibility: 6 months · Backdated limit: 7 days · Carry forward: 4 · Sandwich &amp; Auto LWP enabled
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && policy && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Leave Entitlements
                  </CardTitle>
                  <CardDescription>
                    Annual days per leave type for the selected year.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="annual_pl">PL (Paid Leave)</Label>
                      <Input
                        id="annual_pl"
                        type="number"
                        min={0}
                        max={99}
                        value={form.annual_pl}
                        onChange={(e) =>
                          setNum("annual_pl", e.target.value, 0, 99)
                        }
                        disabled={saving}
                      />
                      <p className="text-xs text-muted-foreground">
                        Days per year
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annual_cl">CL (Casual Leave)</Label>
                      <Input
                        id="annual_cl"
                        type="number"
                        min={0}
                        max={99}
                        value={form.annual_cl}
                        onChange={(e) =>
                          setNum("annual_cl", e.target.value, 0, 99)
                        }
                        disabled={saving}
                      />
                      <p className="text-xs text-muted-foreground">
                        Days per year
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annual_sl">SL (Sick Leave)</Label>
                      <Input
                        id="annual_sl"
                        type="number"
                        min={0}
                        max={99}
                        value={form.annual_sl}
                        onChange={(e) =>
                          setNum("annual_sl", e.target.value, 0, 99)
                        }
                        disabled={saving}
                      />
                      <p className="text-xs text-muted-foreground">
                        Days per year
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annual_rh">RH (Restricted Holiday)</Label>
                      <Input
                        id="annual_rh"
                        type="number"
                        min={0}
                        max={99}
                        value={form.annual_rh}
                        onChange={(e) =>
                          setNum("annual_rh", e.target.value, 0, 99)
                        }
                        disabled={saving}
                      />
                      <p className="text-xs text-muted-foreground">
                        Days per year
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rules</CardTitle>
                  <CardDescription>
                    Eligibility, backdated leave, carry forward, and validation rules.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="pl_eligibility_months">
                        PL Eligibility (months)
                      </Label>
                      <Input
                        id="pl_eligibility_months"
                        type="number"
                        min={0}
                        max={24}
                        value={form.pl_eligibility_months}
                        onChange={(e) =>
                          setNum(
                            "pl_eligibility_months",
                            e.target.value,
                            0,
                            24
                          )
                        }
                        disabled={saving}
                      />
                      <p className="text-xs text-muted-foreground">
                        PL allowed only after this many months (default 6).
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backdated_max_days">
                        Backdated Leave Limit (days)
                      </Label>
                      <Input
                        id="backdated_max_days"
                        type="number"
                        min={0}
                        max={31}
                        value={form.backdated_max_days}
                        onChange={(e) =>
                          setNum(
                            "backdated_max_days",
                            e.target.value,
                            0,
                            31
                          )
                        }
                        disabled={saving}
                      />
                      <p className="text-xs text-muted-foreground">
                        Max days for emergency backdated leave (default 7).
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carry_forward_pl_max">
                        Carry Forward Limit for PL (days)
                      </Label>
                      <Input
                        id="carry_forward_pl_max"
                        type="number"
                        min={0}
                        max={31}
                        value={form.carry_forward_pl_max}
                        onChange={(e) =>
                          setNum(
                            "carry_forward_pl_max",
                            e.target.value,
                            0,
                            31
                          )
                        }
                        disabled={saving}
                      />
                      <p className="text-xs text-muted-foreground">
                        Max PL carried to next year (default 4).
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-6 pt-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sandwich_enabled"
                        checked={form.sandwich_enabled}
                        onCheckedChange={(checked) =>
                          setForm((f) => ({ ...f, sandwich_enabled: checked }))
                        }
                        disabled={saving}
                      />
                      <Label htmlFor="sandwich_enabled">
                        Sandwich Rule Enabled
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="allow_hr_override"
                        checked={form.allow_hr_override}
                        onCheckedChange={(checked) =>
                          setForm((f) => ({ ...f, allow_hr_override: checked }))
                        }
                        disabled={saving}
                      />
                      <Label htmlFor="allow_hr_override">
                        Auto Convert Shortage to LWP / Allow HR Override
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Accrual</CardTitle>
                  <CardDescription>
                    Monthly credit rates (can be derived from annual or set manually).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="monthly_credit_pl">
                        Monthly PL Accrual
                      </Label>
                      <Input
                        id="monthly_credit_pl"
                        type="number"
                        min={0}
                        step={0.01}
                        value={num(form.monthly_credit_pl).toFixed(2)}
                        onChange={(e) =>
                          setNum("monthly_credit_pl", e.target.value, 0, 10)
                        }
                        disabled={saving}
                      />
                      <p className="text-xs text-muted-foreground">
                        e.g. {form.annual_pl}/12 ≈ {(form.annual_pl / 12).toFixed(2)} days/month
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthly_credit_cl">
                        Monthly CL Accrual
                      </Label>
                      <Input
                        id="monthly_credit_cl"
                        type="number"
                        min={0}
                        step={0.01}
                        value={num(form.monthly_credit_cl).toFixed(2)}
                        onChange={(e) =>
                          setNum("monthly_credit_cl", e.target.value, 0, 10)
                        }
                        disabled={saving}
                      />
                      <p className="text-xs text-muted-foreground">
                        e.g. {form.annual_cl}/12 ≈ {(form.annual_cl / 12).toFixed(2)} days/month
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthly_credit_sl">
                        Monthly SL Accrual
                      </Label>
                      <Input
                        id="monthly_credit_sl"
                        type="number"
                        min={0}
                        step={0.01}
                        value={num(form.monthly_credit_sl).toFixed(2)}
                        onChange={(e) =>
                          setNum("monthly_credit_sl", e.target.value, 0, 10)
                        }
                        disabled={saving}
                      />
                      <p className="text-xs text-muted-foreground">
                        SL is often annual grant (0 here).
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="public_holiday_total">
                      Public Holidays (display only)
                    </Label>
                    <Input
                      id="public_holiday_total"
                      type="number"
                      min={0}
                      max={31}
                      value={form.public_holiday_total}
                      onChange={(e) =>
                        setNum(
                          "public_holiday_total",
                          e.target.value,
                          0,
                          31
                        )
                      }
                      disabled={saving}
                    />
                    <p className="text-xs text-muted-foreground">
                      Not deducted from balance; for calendar display.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-4">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save Policy"
                  )}
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarOff className="h-5 w-5" />
                    Year End Actions
                  </CardTitle>
                  <CardDescription>
                    Year Close will: lapse unused CL &amp; SL; carry forward PL (max carry limit); create encashment records if applicable.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={() => setYearCloseOpen(true)}
                    disabled={yearCloseSending}
                  >
                    {yearCloseSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running…
                      </>
                    ) : (
                      "Run Year Close"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <AlertDialog open={yearCloseOpen} onOpenChange={setYearCloseOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Run Year Close?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. It will lapse unused CL &amp; SL, carry forward PL (up to {form.carry_forward_pl_max} days), and create encashment records for the year {year}. Continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={yearCloseSending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleYearClose}
                disabled={yearCloseSending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {yearCloseSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running…
                  </>
                ) : (
                  "Continue"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </RequireRole>
  )
}
