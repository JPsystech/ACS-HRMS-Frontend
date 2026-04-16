"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { RequireRole } from "@/components/auth/RequireRole"
import { SalaryMasterTable } from "@/components/payroll/salary-master-table"
import { PageContainer } from "@/components/ui/page-container"
import { useToast } from "@/hooks/use-toast"
import { ApiClientError } from "@/lib/api"
import {
  listPayrollEmployees,
  listSalaryMasters,
  toggleSalaryMasterActive,
} from "@/services/payroll"
import { useAuthStore } from "@/store/auth-store"
import {
  PayrollEmployeeOption,
  SalaryMaster,
  SalaryMasterListItem,
} from "@/types/payroll"

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.data?.detail || error.message || "Unable to load salary master records."
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return "Unable to load salary master records."
}

export default function SalaryMasterListPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [items, setItems] = useState<SalaryMaster[]>([])
  const [employees, setEmployees] = useState<PayrollEmployeeOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const [salaryMasters, employeeOptions] = await Promise.all([
        listSalaryMasters(),
        listPayrollEmployees(),
      ])

      setItems(salaryMasters)
      setEmployees(employeeOptions)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && (user.role === "HR" || user.role === "ADMIN")) {
      fetchData()
    }
  }, [fetchData, user])

  const rows = useMemo<SalaryMasterListItem[]>(() => {
    const employeeMap = new Map(employees.map((employee) => [employee.id, employee]))

    return items.map((item) => {
      const employee = employeeMap.get(item.employee_id)

      return {
        ...item,
        employee_name: employee?.name ?? `Employee #${item.employee_id}`,
        employee_code: employee?.emp_code ?? "—",
        employee_active: employee?.active ?? false,
      }
    })
  }, [employees, items])

  const handleToggleActive = async (item: SalaryMasterListItem) => {
    setTogglingId(item.id)

    try {
      const updated = await toggleSalaryMasterActive(item.id)
      setItems((current) =>
        current.map((salaryMaster) =>
          salaryMaster.id === updated.id ? updated : salaryMaster
        )
      )
      toast({
        title: updated.payroll_active ? "Payroll activated" : "Payroll deactivated",
        description: `${item.employee_name} has been updated successfully.`,
      })
    } catch (error) {
      const message = getErrorMessage(error)
      toast({
        title: "Unable to update payroll status",
        description: message,
        variant: "destructive",
      })
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <RequireRole allowedRoles={["HR", "ADMIN"]}>
      <PageContainer
        title="Salary Master"
        description="Manage employee-wise salary masters, payroll activation, and statutory deduction applicability."
      >
        <SalaryMasterTable
          items={rows}
          isLoading={isLoading}
          errorMessage={errorMessage}
          togglingId={togglingId}
          onCreate={() => router.push("/admin/payroll/salary-master/new")}
          onEdit={(item) =>
            router.push(`/admin/payroll/salary-master/${item.id}/edit`)
          }
          onToggleActive={handleToggleActive}
          onRefresh={fetchData}
        />
      </PageContainer>
    </RequireRole>
  )
}
