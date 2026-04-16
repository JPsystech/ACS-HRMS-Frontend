"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import {
  PayrollAmount,
  PayrollEmployeeOption,
  SalaryMaster,
  SalaryMasterPayload,
  taxDeductionTypeOptions,
  TaxDeductionType,
} from "@/types/payroll"

type SalaryMasterFormValues = {
  employee_id: string
  monthly_gross_salary: string
  effective_from: string
  payroll_active: boolean
  pf_applicable: boolean
  pf_employee_percent: string
  pf_employer_percent: string
  esic_applicable: boolean
  esic_percent: string
  pt_applicable: boolean
  pt_amount: string
  tds_applicable: boolean
  tds_type: TaxDeductionType | ""
  tds_value: string
  other_fixed_deduction: string
  bank_name: string
  account_number: string
  ifsc_code: string
  uan_number: string
  esic_number: string
  pan_number: string
  remarks: string
}

type SalaryMasterFormProps = {
  employeeOptions: PayrollEmployeeOption[]
  initialData?: SalaryMaster | null
  isLoading: boolean
  isSubmitting: boolean
  errorMessage?: string | null
  onSubmit: (payload: SalaryMasterPayload) => Promise<void>
}

const defaultFormValues: SalaryMasterFormValues = {
  employee_id: "",
  monthly_gross_salary: "",
  effective_from: "",
  payroll_active: true,
  pf_applicable: false,
  pf_employee_percent: "0.00",
  pf_employer_percent: "0.00",
  esic_applicable: false,
  esic_percent: "0.00",
  pt_applicable: false,
  pt_amount: "0.00",
  tds_applicable: false,
  tds_type: "",
  tds_value: "0.00",
  other_fixed_deduction: "0.00",
  bank_name: "",
  account_number: "",
  ifsc_code: "",
  uan_number: "",
  esic_number: "",
  pan_number: "",
  remarks: "",
}

function formatAmount(value: PayrollAmount | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0.00"
  if (typeof value === "number") return value.toFixed(2)
  return value
}

function mapSalaryMasterToFormValues(
  salaryMaster: SalaryMaster
): SalaryMasterFormValues {
  return {
    employee_id: String(salaryMaster.employee_id),
    monthly_gross_salary: formatAmount(salaryMaster.monthly_gross_salary),
    effective_from: salaryMaster.effective_from,
    payroll_active: salaryMaster.payroll_active,
    pf_applicable: salaryMaster.pf_applicable,
    pf_employee_percent: formatAmount(salaryMaster.pf_employee_percent),
    pf_employer_percent: formatAmount(salaryMaster.pf_employer_percent),
    esic_applicable: salaryMaster.esic_applicable,
    esic_percent: formatAmount(salaryMaster.esic_percent),
    pt_applicable: salaryMaster.pt_applicable,
    pt_amount: formatAmount(salaryMaster.pt_amount),
    tds_applicable: salaryMaster.tds_applicable,
    tds_type: salaryMaster.tds_type ?? "",
    tds_value: formatAmount(salaryMaster.tds_value),
    other_fixed_deduction: formatAmount(salaryMaster.other_fixed_deduction),
    bank_name: salaryMaster.bank_name ?? "",
    account_number: salaryMaster.account_number ?? "",
    ifsc_code: salaryMaster.ifsc_code ?? "",
    uan_number: salaryMaster.uan_number ?? "",
    esic_number: salaryMaster.esic_number ?? "",
    pan_number: salaryMaster.pan_number ?? "",
    remarks: salaryMaster.remarks ?? "",
  }
}

function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim()
  return normalized ? normalized : null
}

function isValidDecimal(value: string, options?: { min?: number; max?: number }) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) {
    return false
  }

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return false
  }

  if (typeof options?.min === "number" && numericValue < options.min) {
    return false
  }

  if (typeof options?.max === "number" && numericValue > options.max) {
    return false
  }

  return true
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-destructive">{message}</p>
}

export function SalaryMasterForm({
  employeeOptions,
  initialData,
  isLoading,
  isSubmitting,
  errorMessage,
  onSubmit,
}: SalaryMasterFormProps) {
  const [formData, setFormData] = useState<SalaryMasterFormValues>(defaultFormValues)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setFormData(mapSalaryMasterToFormValues(initialData))
      setValidationErrors({})
      return
    }

    setFormData(defaultFormValues)
    setValidationErrors({})
  }, [initialData])

  const employeeSelectValue = useMemo(
    () => (formData.employee_id ? formData.employee_id : undefined),
    [formData.employee_id]
  )

  const updateField = <K extends keyof SalaryMasterFormValues>(
    key: K,
    value: SalaryMasterFormValues[K]
  ) => {
    setFormData((current) => ({ ...current, [key]: value }))
    setValidationErrors((current) => {
      if (!current[key as string]) return current
      const next = { ...current }
      delete next[key as string]
      return next
    })
  }

  const updateToggleField = (
    key:
      | "payroll_active"
      | "pf_applicable"
      | "esic_applicable"
      | "pt_applicable"
      | "tds_applicable",
    value: boolean
  ) => {
    setFormData((current) => {
      const next = { ...current, [key]: value }

      if (key === "pf_applicable" && !value) {
        next.pf_employee_percent = "0.00"
        next.pf_employer_percent = "0.00"
      }

      if (key === "esic_applicable" && !value) {
        next.esic_percent = "0.00"
      }

      if (key === "pt_applicable" && !value) {
        next.pt_amount = "0.00"
      }

      if (key === "tds_applicable" && !value) {
        next.tds_type = ""
        next.tds_value = "0.00"
      }

      return next
    })
  }

  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}

    if (!formData.employee_id) {
      errors.employee_id = "Employee is required."
    }

    if (!formData.monthly_gross_salary.trim()) {
      errors.monthly_gross_salary = "Monthly gross salary is required."
    } else if (!isValidDecimal(formData.monthly_gross_salary, { min: 0 })) {
      errors.monthly_gross_salary = "Enter a valid amount with up to 2 decimal places."
    }

    if (!formData.effective_from) {
      errors.effective_from = "Effective from date is required."
    }

    if (formData.pf_applicable) {
      if (!isValidDecimal(formData.pf_employee_percent, { min: 0, max: 100 })) {
        errors.pf_employee_percent = "Use a percentage between 0 and 100."
      }
      if (!isValidDecimal(formData.pf_employer_percent, { min: 0, max: 100 })) {
        errors.pf_employer_percent = "Use a percentage between 0 and 100."
      }
    }

    if (formData.esic_applicable) {
      if (!isValidDecimal(formData.esic_percent, { min: 0, max: 100 })) {
        errors.esic_percent = "Use a percentage between 0 and 100."
      }
    }

    if (formData.pt_applicable) {
      if (!isValidDecimal(formData.pt_amount, { min: 0 })) {
        errors.pt_amount = "Enter a valid PT amount."
      }
    }

    if (formData.tds_applicable) {
      if (!formData.tds_type) {
        errors.tds_type = "Select a TDS type."
      }
      if (!isValidDecimal(formData.tds_value, { min: 0 })) {
        errors.tds_value = "Enter a valid TDS value."
      }
    }

    if (!isValidDecimal(formData.other_fixed_deduction, { min: 0 })) {
      errors.other_fixed_deduction =
        "Enter a valid other fixed deduction amount."
    }

    return errors
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const errors = validateForm()
    setValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    await onSubmit({
      employee_id: Number(formData.employee_id),
      monthly_gross_salary: formData.monthly_gross_salary.trim(),
      effective_from: formData.effective_from,
      payroll_active: formData.payroll_active,
      pf_applicable: formData.pf_applicable,
      pf_employee_percent: formData.pf_applicable
        ? formData.pf_employee_percent.trim()
        : "0.00",
      pf_employer_percent: formData.pf_applicable
        ? formData.pf_employer_percent.trim()
        : "0.00",
      esic_applicable: formData.esic_applicable,
      esic_percent: formData.esic_applicable ? formData.esic_percent.trim() : "0.00",
      pt_applicable: formData.pt_applicable,
      pt_amount: formData.pt_applicable ? formData.pt_amount.trim() : "0.00",
      tds_applicable: formData.tds_applicable,
      tds_type:
        formData.tds_applicable && formData.tds_type
          ? formData.tds_type
          : null,
      tds_value: formData.tds_applicable ? formData.tds_value.trim() : "0.00",
      other_fixed_deduction: formData.other_fixed_deduction.trim(),
      bank_name: normalizeOptionalText(formData.bank_name),
      account_number: normalizeOptionalText(formData.account_number),
      ifsc_code: normalizeOptionalText(formData.ifsc_code)?.toUpperCase() ?? null,
      uan_number: normalizeOptionalText(formData.uan_number),
      esic_number: normalizeOptionalText(formData.esic_number),
      pan_number: normalizeOptionalText(formData.pan_number)?.toUpperCase() ?? null,
      remarks: normalizeOptionalText(formData.remarks),
    })
  }

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Salary Master</CardTitle>
          <CardDescription>Loading salary master form...</CardDescription>
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>{initialData ? "Edit Salary Master" : "Create Salary Master"}</CardTitle>
            <CardDescription>
              Capture employee-wise salary configuration, deductions, and payout details.
            </CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/payroll/salary-master">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Link>
          </Button>
        </div>
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
              <Label htmlFor="employee_id">Employee</Label>
              <Select
                value={employeeSelectValue}
                onValueChange={(value) => updateField("employee_id", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="employee_id">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employeeOptions.map((employee) => (
                    <SelectItem key={employee.id} value={String(employee.id)}>
                      {employee.name} ({employee.emp_code})
                      {!employee.active ? " • Inactive" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={validationErrors.employee_id} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_gross_salary">Monthly Gross Salary</Label>
              <Input
                id="monthly_gross_salary"
                inputMode="decimal"
                placeholder="50000.00"
                value={formData.monthly_gross_salary}
                onChange={(event) =>
                  updateField("monthly_gross_salary", event.target.value)
                }
                disabled={isSubmitting}
              />
              <FieldError message={validationErrors.monthly_gross_salary} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective_from">Effective From</Label>
              <Input
                id="effective_from"
                type="date"
                value={formData.effective_from}
                onChange={(event) => updateField("effective_from", event.target.value)}
                disabled={isSubmitting}
              />
              <FieldError message={validationErrors.effective_from} />
            </div>
          </div>

          <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-1">
                <Label htmlFor="payroll_active">Payroll Active</Label>
                <p className="text-xs text-muted-foreground">
                  Include this employee in payroll processing.
                </p>
              </div>
              <Switch
                id="payroll_active"
                checked={formData.payroll_active}
                onCheckedChange={(checked) =>
                  updateToggleField("payroll_active", checked)
                }
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-1">
                <Label htmlFor="pf_applicable">PF Applicable</Label>
                <p className="text-xs text-muted-foreground">
                  Enable Provident Fund deductions.
                </p>
              </div>
              <Switch
                id="pf_applicable"
                checked={formData.pf_applicable}
                onCheckedChange={(checked) => updateToggleField("pf_applicable", checked)}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-1">
                <Label htmlFor="esic_applicable">ESIC Applicable</Label>
                <p className="text-xs text-muted-foreground">
                  Enable ESIC deduction percentage.
                </p>
              </div>
              <Switch
                id="esic_applicable"
                checked={formData.esic_applicable}
                onCheckedChange={(checked) =>
                  updateToggleField("esic_applicable", checked)
                }
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-1">
                <Label htmlFor="pt_applicable">PT Applicable</Label>
                <p className="text-xs text-muted-foreground">
                  Enable professional tax deduction.
                </p>
              </div>
              <Switch
                id="pt_applicable"
                checked={formData.pt_applicable}
                onCheckedChange={(checked) => updateToggleField("pt_applicable", checked)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="pf_employee_percent">PF Employee Percent</Label>
              <Input
                id="pf_employee_percent"
                inputMode="decimal"
                placeholder="12.00"
                value={formData.pf_employee_percent}
                onChange={(event) =>
                  updateField("pf_employee_percent", event.target.value)
                }
                disabled={isSubmitting || !formData.pf_applicable}
              />
              <FieldError message={validationErrors.pf_employee_percent} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf_employer_percent">PF Employer Percent</Label>
              <Input
                id="pf_employer_percent"
                inputMode="decimal"
                placeholder="12.00"
                value={formData.pf_employer_percent}
                onChange={(event) =>
                  updateField("pf_employer_percent", event.target.value)
                }
                disabled={isSubmitting || !formData.pf_applicable}
              />
              <FieldError message={validationErrors.pf_employer_percent} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="esic_percent">ESIC Percent</Label>
              <Input
                id="esic_percent"
                inputMode="decimal"
                placeholder="0.75"
                value={formData.esic_percent}
                onChange={(event) => updateField("esic_percent", event.target.value)}
                disabled={isSubmitting || !formData.esic_applicable}
              />
              <FieldError message={validationErrors.esic_percent} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pt_amount">PT Amount</Label>
              <Input
                id="pt_amount"
                inputMode="decimal"
                placeholder="200.00"
                value={formData.pt_amount}
                onChange={(event) => updateField("pt_amount", event.target.value)}
                disabled={isSubmitting || !formData.pt_applicable}
              />
              <FieldError message={validationErrors.pt_amount} />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-1">
                <Label htmlFor="tds_applicable">TDS Applicable</Label>
                <p className="text-xs text-muted-foreground">
                  Enable TDS deduction for this employee.
                </p>
              </div>
              <Switch
                id="tds_applicable"
                checked={formData.tds_applicable}
                onCheckedChange={(checked) => updateToggleField("tds_applicable", checked)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tds_type">TDS Type</Label>
              <Select
                value={formData.tds_type || undefined}
                onValueChange={(value) => updateField("tds_type", value as TaxDeductionType)}
                disabled={isSubmitting || !formData.tds_applicable}
              >
                <SelectTrigger id="tds_type">
                  <SelectValue placeholder="Select TDS type" />
                </SelectTrigger>
                <SelectContent>
                  {taxDeductionTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={validationErrors.tds_type} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tds_value">TDS Value</Label>
              <Input
                id="tds_value"
                inputMode="decimal"
                placeholder="10.00"
                value={formData.tds_value}
                onChange={(event) => updateField("tds_value", event.target.value)}
                disabled={isSubmitting || !formData.tds_applicable}
              />
              <FieldError message={validationErrors.tds_value} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="other_fixed_deduction">Other Fixed Deduction</Label>
              <Input
                id="other_fixed_deduction"
                inputMode="decimal"
                placeholder="0.00"
                value={formData.other_fixed_deduction}
                onChange={(event) =>
                  updateField("other_fixed_deduction", event.target.value)
                }
                disabled={isSubmitting}
              />
              <FieldError message={validationErrors.other_fixed_deduction} />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                value={formData.bank_name}
                onChange={(event) => updateField("bank_name", event.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                value={formData.account_number}
                onChange={(event) => updateField("account_number", event.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ifsc_code">IFSC Code</Label>
              <Input
                id="ifsc_code"
                value={formData.ifsc_code}
                onChange={(event) => updateField("ifsc_code", event.target.value.toUpperCase())}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="uan_number">UAN Number</Label>
              <Input
                id="uan_number"
                value={formData.uan_number}
                onChange={(event) => updateField("uan_number", event.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="esic_number">ESIC Number</Label>
              <Input
                id="esic_number"
                value={formData.esic_number}
                onChange={(event) => updateField("esic_number", event.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pan_number">PAN Number</Label>
              <Input
                id="pan_number"
                value={formData.pan_number}
                onChange={(event) => updateField("pan_number", event.target.value.toUpperCase())}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(event) => updateField("remarks", event.target.value)}
              disabled={isSubmitting}
              rows={4}
              placeholder="Optional remarks for this salary master record"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button asChild variant="outline" disabled={isSubmitting}>
              <Link href="/admin/payroll/salary-master">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {initialData ? "Save Changes" : "Create Salary Master"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
