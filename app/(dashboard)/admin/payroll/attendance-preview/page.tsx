"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw } from "lucide-react"

import { RequireRole } from "@/components/auth/RequireRole"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AttendancePreviewTable } from "@/components/payroll/attendance-preview-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { PageContainer } from "@/components/ui/page-container"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ApiClientError } from "@/lib/api"
import {
  generatePayrollRun,
  getPayrollAttendanceBulkPreview,
  listPayrollDepartments,
  listPayrollEmployees,
} from "@/services/payroll"
import { useAuthStore } from "@/store/auth-store"
import {
  PayrollAttendanceSummary,
  PayrollDepartmentOption,
} from "@/types/payroll"

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.data?.detail || error.message || "Unable to load attendance preview."
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return "Unable to load attendance preview."
}

export default function PayrollAttendancePreviewPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const today = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(String(today.getMonth() + 1))
  const [year, setYear] = useState(String(today.getFullYear()))
  const [departmentId, setDepartmentId] = useState("ALL")
  const [departments, setDepartments] = useState<PayrollDepartmentOption[]>([])
  const [items, setItems] = useState<PayrollAttendanceSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingPayroll, setIsGeneratingPayroll] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: String(index + 1),
        label: new Intl.DateTimeFormat("en-IN", { month: "long" }).format(
          new Date(2026, index, 1)
        ),
      })),
    []
  )

  const yearOptions = useMemo(() => {
    const currentYear = today.getFullYear()
    return Array.from({ length: 5 }, (_, index) => String(currentYear - 2 + index))
  }, [today])

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await listPayrollDepartments({ activeOnly: true })
      setDepartments(response)
    } catch {
      setDepartments([])
    }
  }, [])

  const fetchPreview = useCallback(
    async (filters?: { month: string; year: string; departmentId: string }) => {
      const nextFilters = filters ?? { month, year, departmentId }

      setErrorMessage(null)
      setIsLoading(true)
      setIsSubmitting(true)

      try {
        let employeeIds: number[] | undefined

        if (nextFilters.departmentId !== "ALL") {
          const employees = await listPayrollEmployees({
            activeOnly: true,
            departmentId: Number(nextFilters.departmentId),
          })

          if (employees.length === 0) {
            setItems([])
            return
          }

          employeeIds = employees.map((employee) => employee.id)
        }

        const response = await getPayrollAttendanceBulkPreview({
          month: Number(nextFilters.month),
          year: Number(nextFilters.year),
          ...(employeeIds ? { employee_ids: employeeIds } : {}),
        })

        setItems(response.summaries)
      } catch (error) {
        setItems([])
        setErrorMessage(getErrorMessage(error))
      } finally {
        setIsLoading(false)
        setIsSubmitting(false)
      }
    },
    [departmentId, month, year]
  )

  const handleGeneratePayrollRun = useCallback(async () => {
    setIsGeneratingPayroll(true)
    setErrorMessage(null)
    try {
      let employeeIds: number[] | undefined

      if (departmentId !== "ALL") {
        const employees = await listPayrollEmployees({
          activeOnly: true,
          departmentId: Number(departmentId),
        })

        if (employees.length === 0) {
          toast({
            title: "No employees found",
            description: "No active employees found for the selected department.",
            variant: "destructive",
          })
          return
        }

        employeeIds = employees.map((employee) => employee.id)
      }

      const run = await generatePayrollRun({
        month: Number(month),
        year: Number(year),
        ...(employeeIds ? { employee_ids: employeeIds } : {}),
      })

      toast({
        title: "Payroll run generated",
        description: `Payroll run #${run.id} created in DRAFT status.`,
      })
      router.push(`/admin/payroll/runs/${run.id}`)
    } catch (error) {
      const message = getErrorMessage(error)
      setErrorMessage(message)
      toast({
        title: "Unable to generate payroll run",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPayroll(false)
    }
  }, [departmentId, month, router, toast, year])

  useEffect(() => {
    if (user && (user.role === "HR" || user.role === "ADMIN")) {
      fetchDepartments()
      fetchPreview()
    }
  }, [fetchDepartments, fetchPreview, user])

  const selectedDepartmentName = useMemo(() => {
    if (departmentId === "ALL") return null
    return departments.find((department) => department.id === Number(departmentId))?.name ?? null
  }, [departmentId, departments])

  return (
    <RequireRole allowedRoles={["HR", "ADMIN"]}>
      <PageContainer
        title="Attendance Preview"
        description="Preview payroll-ready attendance totals for a payroll month before generating payroll."
      >
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="attendance-preview-month">Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger id="attendance-preview-month">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendance-preview-year">Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger id="attendance-preview-year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendance-preview-department">Department</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger id="attendance-preview-department">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All departments</SelectItem>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={String(department.id)}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  className="flex-1"
                  onClick={() => fetchPreview({ month, year, departmentId })}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Run Preview
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fetchPreview({ month, year, departmentId })}
                  disabled={isSubmitting}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={isGeneratingPayroll || isSubmitting}>
                      {isGeneratingPayroll ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Generate Payroll
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Generate payroll run?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This creates a DRAFT payroll run for {month}/{year}. Review the payroll
                        items, lock, then publish before generating payslips.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isGeneratingPayroll}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleGeneratePayrollRun}
                        disabled={isGeneratingPayroll}
                      >
                        {isGeneratingPayroll ? "Generating..." : "Generate"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              {selectedDepartmentName
                ? `Showing active employees from ${selectedDepartmentName}.`
                : "Showing active employees across all departments."}
            </div>
          </CardContent>
        </Card>

        <AttendancePreviewTable
          items={items}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onRetry={() => fetchPreview({ month, year, departmentId })}
          onRowClick={(item) => {
            const query = new URLSearchParams({
              month,
              year,
            })

            if (departmentId !== "ALL") {
              query.set("department", departmentId)
            }

            router.push(
              `/admin/payroll/attendance-preview/${item.employee_id}?${query.toString()}`
            )
          }}
        />
      </PageContainer>
    </RequireRole>
  )
}
