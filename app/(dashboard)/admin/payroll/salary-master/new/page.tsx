"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { RequireRole } from "@/components/auth/RequireRole"
import { SalaryMasterForm } from "@/components/payroll/salary-master-form"
import { PageContainer } from "@/components/ui/page-container"
import { useToast } from "@/hooks/use-toast"
import { ApiClientError } from "@/lib/api"
import {
  createSalaryMaster,
  listPayrollEmployees,
  listSalaryMasters,
} from "@/services/payroll"
import { useAuthStore } from "@/store/auth-store"
import {
  PayrollEmployeeOption,
  SalaryMaster,
  SalaryMasterPayload,
} from "@/types/payroll"

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.data?.detail || error.message || "Unable to save salary master."
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return "Unable to save salary master."
}

export default function NewSalaryMasterPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [employees, setEmployees] = useState<PayrollEmployeeOption[]>([])
  const [salaryMasters, setSalaryMasters] = useState<SalaryMaster[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const [employeesResult, salaryMastersResult] = await Promise.allSettled([
        listPayrollEmployees({ activeOnly: true }),
        listSalaryMasters(),
      ])

      if (employeesResult.status === "fulfilled") {
        setEmployees(employeesResult.value)
      } else {
        setEmployees([])
        setErrorMessage(getErrorMessage(employeesResult.reason))
      }

      if (salaryMastersResult.status === "fulfilled") {
        setSalaryMasters(salaryMastersResult.value)
      } else {
        setSalaryMasters([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && (user.role === "HR" || user.role === "ADMIN")) {
      fetchData()
    }
  }, [fetchData, user])

  const availableEmployees = useMemo(() => {
    const assignedEmployeeIds = new Set(salaryMasters.map((item) => item.employee_id))

    return employees
      .filter((employee) => !assignedEmployeeIds.has(employee.id))
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [employees, salaryMasters])

  const handleSubmit = async (payload: SalaryMasterPayload) => {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await createSalaryMaster(payload)
      toast({
        title: "Salary master created",
        description: "The salary master record has been created successfully.",
      })
      router.push("/admin/payroll/salary-master")
      router.refresh()
    } catch (error) {
      const message = getErrorMessage(error)
      setErrorMessage(message)
      toast({
        title: "Unable to create salary master",
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
        title="Create Salary Master"
        description="Add a new employee-wise salary master with payroll and deduction details."
      >
        <SalaryMasterForm
          employeeOptions={availableEmployees}
          isLoading={isLoading}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
        />
      </PageContainer>
    </RequireRole>
  )
}
