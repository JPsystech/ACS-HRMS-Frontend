"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { RequireRole } from "@/components/auth/RequireRole"
import { SalaryMasterForm } from "@/components/payroll/salary-master-form"
import { PageContainer } from "@/components/ui/page-container"
import { useToast } from "@/hooks/use-toast"
import { ApiClientError } from "@/lib/api"
import {
  getSalaryMasterById,
  listPayrollEmployees,
  listSalaryMasters,
  updateSalaryMaster,
} from "@/services/payroll"
import { useAuthStore } from "@/store/auth-store"
import {
  PayrollEmployeeOption,
  SalaryMaster,
  SalaryMasterPayload,
} from "@/types/payroll"

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.data?.detail || error.message || "Unable to update salary master."
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return "Unable to update salary master."
}

export default function EditSalaryMasterPage() {
  const params = useParams<{ id: string }>()
  const salaryMasterId = Number(params.id)
  const router = useRouter()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [employees, setEmployees] = useState<PayrollEmployeeOption[]>([])
  const [salaryMasters, setSalaryMasters] = useState<SalaryMaster[]>([])
  const [currentSalaryMaster, setCurrentSalaryMaster] = useState<SalaryMaster | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!Number.isFinite(salaryMasterId)) {
      setErrorMessage("Invalid salary master ID.")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const [employeesResult, salaryMastersResult, selectedSalaryMaster] = await Promise.all([
        listPayrollEmployees(),
        listSalaryMasters().catch(() => [] as SalaryMaster[]),
        getSalaryMasterById(salaryMasterId),
      ])

      if (!selectedSalaryMaster) {
        throw new Error("Salary master not found.")
      }

      setEmployees(employeesResult)
      setSalaryMasters(salaryMastersResult)
      setCurrentSalaryMaster(selectedSalaryMaster)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [salaryMasterId])

  useEffect(() => {
    if (user && (user.role === "HR" || user.role === "ADMIN")) {
      fetchData()
    }
  }, [fetchData, user])

  const availableEmployees = useMemo(() => {
    const assignedEmployeeIds = new Set(
      salaryMasters
        .filter((item) => item.id !== salaryMasterId)
        .map((item) => item.employee_id)
    )

    return employees
      .filter(
        (employee) =>
          employee.id === currentSalaryMaster?.employee_id ||
          (employee.active && !assignedEmployeeIds.has(employee.id))
      )
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [currentSalaryMaster?.employee_id, employees, salaryMasterId, salaryMasters])

  const handleSubmit = async (payload: SalaryMasterPayload) => {
    if (!Number.isFinite(salaryMasterId)) {
      setErrorMessage("Invalid salary master ID.")
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await updateSalaryMaster(salaryMasterId, payload)
      toast({
        title: "Salary master updated",
        description: "The salary master record has been updated successfully.",
      })
      router.push("/admin/payroll/salary-master")
      router.refresh()
    } catch (error) {
      const message = getErrorMessage(error)
      setErrorMessage(message)
      toast({
        title: "Unable to update salary master",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <RequireRole allowedRoles={["HR", "ADMIN"]}>
      <PageContainer
        title="Edit Salary Master"
        description="Update salary structure, deductions, and payroll activation details for an employee."
      >
        <SalaryMasterForm
          employeeOptions={availableEmployees}
          initialData={currentSalaryMaster}
          isLoading={isLoading}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
        />
      </PageContainer>
    </RequireRole>
  )
}
