"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  PayrollSettings,
  PayrollSettingsUpdate,
  PayrollWeekday,
  payrollWeekdayOptions,
  salaryDivisorOptions,
  SalaryDivisorType,
} from "@/types/payroll"

type PayrollSettingsFormValues = {
  weekly_off_day: PayrollWeekday
  office_start_time: string
  office_end_time: string
  grace_time_end: string
  half_day_min_minutes: string
  full_day_min_minutes: string
  attendance_cutoff_time: string
  reminder_send_time: string
  payroll_draft_time: string
  payroll_finalization_day: string
  official_salary_day: string
  miss_punch_as_absent: boolean
  late_rule_enabled: boolean
  late_rule_exempt_rank_max: string
  salary_divisor_type: SalaryDivisorType
  timezone: string
  is_active: boolean
}

type PayrollSettingsFormProps = {
  settings: PayrollSettings | null
  isLoading: boolean
  isSaving: boolean
  errorMessage?: string | null
  onSubmit: (payload: PayrollSettingsUpdate) => Promise<void>
}

const defaultFormState: PayrollSettingsFormValues = {
  weekly_off_day: "SUNDAY",
  office_start_time: "09:30",
  office_end_time: "18:30",
  grace_time_end: "09:45",
  half_day_min_minutes: "270",
  full_day_min_minutes: "510",
  attendance_cutoff_time: "15:00",
  reminder_send_time: "10:00",
  payroll_draft_time: "18:00",
  payroll_finalization_day: "2",
  official_salary_day: "3",
  miss_punch_as_absent: true,
  late_rule_enabled: true,
  late_rule_exempt_rank_max: "3",
  salary_divisor_type: "CALENDAR_DAYS",
  timezone: "Asia/Kolkata",
  is_active: true,
}

function normalizeTimeForInput(value: string | undefined): string {
  if (!value) return ""
  return value.slice(0, 5)
}

function normalizeTimeForApi(value: string): string {
  if (value.length === 5) return `${value}:00`
  return value
}

function parseTimeToMinutes(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":")
  return Number(hours) * 60 + Number(minutes)
}

function mapSettingsToForm(settings: PayrollSettings): PayrollSettingsFormValues {
  return {
    weekly_off_day: settings.weekly_off_day,
    office_start_time: normalizeTimeForInput(settings.office_start_time),
    office_end_time: normalizeTimeForInput(settings.office_end_time),
    grace_time_end: normalizeTimeForInput(settings.grace_time_end),
    half_day_min_minutes: String(settings.half_day_min_minutes),
    full_day_min_minutes: String(settings.full_day_min_minutes),
    attendance_cutoff_time: normalizeTimeForInput(settings.attendance_cutoff_time),
    reminder_send_time: normalizeTimeForInput(settings.reminder_send_time),
    payroll_draft_time: normalizeTimeForInput(settings.payroll_draft_time),
    payroll_finalization_day: String(settings.payroll_finalization_day),
    official_salary_day: String(settings.official_salary_day),
    miss_punch_as_absent: settings.miss_punch_as_absent,
    late_rule_enabled: settings.late_rule_enabled,
    late_rule_exempt_rank_max: String(settings.late_rule_exempt_rank_max),
    salary_divisor_type: settings.salary_divisor_type,
    timezone: settings.timezone,
    is_active: settings.is_active,
  }
}

function validateForm(values: PayrollSettingsFormValues): Record<string, string> {
  const errors: Record<string, string> = {}

  const halfDayMinutes = Number(values.half_day_min_minutes)
  const fullDayMinutes = Number(values.full_day_min_minutes)
  const lateRuleExemptRankMax = Number(values.late_rule_exempt_rank_max)
  const finalizationDay = Number(values.payroll_finalization_day)
  const officialSalaryDay = Number(values.official_salary_day)

  if (!values.office_start_time) {
    errors.office_start_time = "Office start time is required."
  }
  if (!values.office_end_time) {
    errors.office_end_time = "Office end time is required."
  }
  if (!values.grace_time_end) {
    errors.grace_time_end = "Grace time end is required."
  }
  if (!values.attendance_cutoff_time) {
    errors.attendance_cutoff_time = "Attendance cutoff time is required."
  }
  if (!values.reminder_send_time) {
    errors.reminder_send_time = "Reminder send time is required."
  }
  if (!values.payroll_draft_time) {
    errors.payroll_draft_time = "Payroll draft time is required."
  }
  if (!values.timezone.trim()) {
    errors.timezone = "Timezone is required."
  }
  if (!Number.isInteger(halfDayMinutes) || halfDayMinutes <= 0) {
    errors.half_day_min_minutes = "Enter a valid positive number."
  }
  if (!Number.isInteger(fullDayMinutes) || fullDayMinutes <= 0) {
    errors.full_day_min_minutes = "Enter a valid positive number."
  }
  if (!Number.isInteger(finalizationDay) || finalizationDay < 1 || finalizationDay > 31) {
    errors.payroll_finalization_day = "Use a day between 1 and 31."
  }
  if (!Number.isInteger(officialSalaryDay) || officialSalaryDay < 1 || officialSalaryDay > 31) {
    errors.official_salary_day = "Use a day between 1 and 31."
  }
  if (!Number.isInteger(lateRuleExemptRankMax) || lateRuleExemptRankMax < 1) {
    errors.late_rule_exempt_rank_max = "Rank max must be 1 or greater."
  }

  if (
    values.office_start_time &&
    values.office_end_time &&
    parseTimeToMinutes(values.office_end_time) <= parseTimeToMinutes(values.office_start_time)
  ) {
    errors.office_end_time = "Office end time must be later than office start time."
  }

  if (
    values.grace_time_end &&
    values.office_start_time &&
    values.office_end_time
  ) {
    const startMinutes = parseTimeToMinutes(values.office_start_time)
    const endMinutes = parseTimeToMinutes(values.office_end_time)
    const graceMinutes = parseTimeToMinutes(values.grace_time_end)
    if (graceMinutes < startMinutes || graceMinutes > endMinutes) {
      errors.grace_time_end = "Grace time must be between office start and end."
    }
  }

  if (
    Number.isInteger(halfDayMinutes) &&
    Number.isInteger(fullDayMinutes) &&
    fullDayMinutes <= halfDayMinutes
  ) {
    errors.full_day_min_minutes = "Full day minutes must be greater than half day minutes."
  }

  if (
    values.reminder_send_time &&
    values.attendance_cutoff_time &&
    parseTimeToMinutes(values.reminder_send_time) >= parseTimeToMinutes(values.attendance_cutoff_time)
  ) {
    errors.reminder_send_time = "Reminder time must be earlier than cutoff time."
  }

  if (
    values.attendance_cutoff_time &&
    values.payroll_draft_time &&
    parseTimeToMinutes(values.attendance_cutoff_time) >= parseTimeToMinutes(values.payroll_draft_time)
  ) {
    errors.payroll_draft_time = "Payroll draft time must be later than cutoff time."
  }

  return errors
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-destructive">{message}</p>
}

export function PayrollSettingsForm({
  settings,
  isLoading,
  isSaving,
  errorMessage,
  onSubmit,
}: PayrollSettingsFormProps) {
  const [formData, setFormData] = useState<PayrollSettingsFormValues>(defaultFormState)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (settings) {
      setFormData(mapSettingsToForm(settings))
      setValidationErrors({})
    }
  }, [settings])

  const hasSettings = useMemo(() => settings !== null, [settings])

  const updateField = <K extends keyof PayrollSettingsFormValues>(
    key: K,
    value: PayrollSettingsFormValues[K]
  ) => {
    setFormData((current) => ({ ...current, [key]: value }))
    setValidationErrors((current) => {
      if (!current[key as string]) return current
      const next = { ...current }
      delete next[key as string]
      return next
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateForm(formData)
    setValidationErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    await onSubmit({
      weekly_off_day: formData.weekly_off_day,
      office_start_time: normalizeTimeForApi(formData.office_start_time),
      office_end_time: normalizeTimeForApi(formData.office_end_time),
      grace_time_end: normalizeTimeForApi(formData.grace_time_end),
      half_day_min_minutes: Number(formData.half_day_min_minutes),
      full_day_min_minutes: Number(formData.full_day_min_minutes),
      attendance_cutoff_time: normalizeTimeForApi(formData.attendance_cutoff_time),
      reminder_send_time: normalizeTimeForApi(formData.reminder_send_time),
      payroll_draft_time: normalizeTimeForApi(formData.payroll_draft_time),
      payroll_finalization_day: Number(formData.payroll_finalization_day),
      official_salary_day: Number(formData.official_salary_day),
      miss_punch_as_absent: formData.miss_punch_as_absent,
      late_rule_enabled: formData.late_rule_enabled,
      late_rule_exempt_rank_max: Number(formData.late_rule_exempt_rank_max),
      salary_divisor_type: formData.salary_divisor_type,
      timezone: formData.timezone.trim(),
      is_active: formData.is_active,
    })
  }

  if (isLoading && !hasSettings) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Payroll Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle>Payroll Settings</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure attendance, cutoff, late-rule, and payroll scheduling defaults for payroll processing.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-8" onSubmit={handleSubmit}>
          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="weekly_off_day">Weekly Off Day</Label>
              <Select
                value={formData.weekly_off_day}
                onValueChange={(value) => updateField("weekly_off_day", value as PayrollWeekday)}
                disabled={isSaving}
              >
                <SelectTrigger id="weekly_off_day">
                  <SelectValue placeholder="Select weekly off day" />
                </SelectTrigger>
                <SelectContent>
                  {payrollWeekdayOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="office_start_time">Office Start Time</Label>
              <Input
                id="office_start_time"
                type="time"
                value={formData.office_start_time}
                onChange={(event) => updateField("office_start_time", event.target.value)}
                disabled={isSaving}
              />
              <FieldError message={validationErrors.office_start_time} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="office_end_time">Office End Time</Label>
              <Input
                id="office_end_time"
                type="time"
                value={formData.office_end_time}
                onChange={(event) => updateField("office_end_time", event.target.value)}
                disabled={isSaving}
              />
              <FieldError message={validationErrors.office_end_time} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grace_time_end">Grace Time End</Label>
              <Input
                id="grace_time_end"
                type="time"
                value={formData.grace_time_end}
                onChange={(event) => updateField("grace_time_end", event.target.value)}
                disabled={isSaving}
              />
              <FieldError message={validationErrors.grace_time_end} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="half_day_min_minutes">Half Day Minimum Minutes</Label>
              <Input
                id="half_day_min_minutes"
                type="number"
                min="1"
                value={formData.half_day_min_minutes}
                onChange={(event) => updateField("half_day_min_minutes", event.target.value)}
                disabled={isSaving}
              />
              <FieldError message={validationErrors.half_day_min_minutes} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_day_min_minutes">Full Day Minimum Minutes</Label>
              <Input
                id="full_day_min_minutes"
                type="number"
                min="1"
                value={formData.full_day_min_minutes}
                onChange={(event) => updateField("full_day_min_minutes", event.target.value)}
                disabled={isSaving}
              />
              <FieldError message={validationErrors.full_day_min_minutes} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendance_cutoff_time">Attendance Correction Cutoff Time</Label>
              <Input
                id="attendance_cutoff_time"
                type="time"
                value={formData.attendance_cutoff_time}
                onChange={(event) => updateField("attendance_cutoff_time", event.target.value)}
                disabled={isSaving}
              />
              <FieldError message={validationErrors.attendance_cutoff_time} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder_send_time">Reminder Send Time</Label>
              <Input
                id="reminder_send_time"
                type="time"
                value={formData.reminder_send_time}
                onChange={(event) => updateField("reminder_send_time", event.target.value)}
                disabled={isSaving}
              />
              <FieldError message={validationErrors.reminder_send_time} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payroll_draft_time">Payroll Draft Generation Time</Label>
              <Input
                id="payroll_draft_time"
                type="time"
                value={formData.payroll_draft_time}
                onChange={(event) => updateField("payroll_draft_time", event.target.value)}
                disabled={isSaving}
              />
              <FieldError message={validationErrors.payroll_draft_time} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payroll_finalization_day">Payroll Finalization Day</Label>
              <Input
                id="payroll_finalization_day"
                type="number"
                min="1"
                max="31"
                value={formData.payroll_finalization_day}
                onChange={(event) => updateField("payroll_finalization_day", event.target.value)}
                disabled={isSaving}
              />
              <FieldError message={validationErrors.payroll_finalization_day} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="official_salary_day">Official Salary Day</Label>
              <Input
                id="official_salary_day"
                type="number"
                min="1"
                max="31"
                value={formData.official_salary_day}
                onChange={(event) => updateField("official_salary_day", event.target.value)}
                disabled={isSaving}
              />
              <FieldError message={validationErrors.official_salary_day} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="late_rule_exempt_rank_max">Late Rule Exempt Rank Max</Label>
              <Input
                id="late_rule_exempt_rank_max"
                type="number"
                min="1"
                value={formData.late_rule_exempt_rank_max}
                onChange={(event) => updateField("late_rule_exempt_rank_max", event.target.value)}
                disabled={isSaving}
              />
              <FieldError message={validationErrors.late_rule_exempt_rank_max} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary_divisor_type">Salary Divisor Type</Label>
              <Select
                value={formData.salary_divisor_type}
                onValueChange={(value) => updateField("salary_divisor_type", value as SalaryDivisorType)}
                disabled={isSaving}
              >
                <SelectTrigger id="salary_divisor_type">
                  <SelectValue placeholder="Select salary divisor type" />
                </SelectTrigger>
                <SelectContent>
                  {salaryDivisorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={formData.timezone}
                onChange={(event) => updateField("timezone", event.target.value)}
                disabled={isSaving}
                placeholder="Asia/Kolkata"
              />
              <FieldError message={validationErrors.timezone} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Miss Punch as Absent</p>
                <p className="text-sm text-muted-foreground">Treat unresolved miss punches as absent for payroll.</p>
              </div>
              <Switch
                checked={formData.miss_punch_as_absent}
                onCheckedChange={(checked) => updateField("miss_punch_as_absent", checked)}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Late Rule Enabled</p>
                <p className="text-sm text-muted-foreground">Apply late counting for ranks above the exempt range.</p>
              </div>
              <Switch
                checked={formData.late_rule_enabled}
                onCheckedChange={(checked) => updateField("late_rule_enabled", checked)}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Active Status</p>
                <p className="text-sm text-muted-foreground">Keep this payroll settings master active for admin payroll use.</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => updateField("is_active", checked)}
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving || isLoading || !hasSettings}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
