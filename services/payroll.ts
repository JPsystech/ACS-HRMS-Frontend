"use client"

import { api } from "@/lib/api"
import { Department } from "@/types/models"
import {
  EmailSettings,
  EmailSettingsTestRequest,
  EmailSettingsTestResult,
  EmailSettingsUpdate,
  PayrollAttendanceBulkPreviewRequest,
  PayrollAttendanceBulkPreviewResponse,
  PayrollAttendanceSummary,
  PayrollDepartmentOption,
  PayrollEmailLog,
  PayrollEmployeeEmailMapping,
  PayrollEmployeeEmailMappingUpdate,
  PayrollEmployeeOption,
  PayrollReminderPreview,
  PayrollSettings,
  PayrollSettingsUpdate,
  PayrollRun,
  PayrollRunDetail,
  Payslip,
  PayslipGenerationResult,
  PayrollRunGeneratePayload,
  SalaryMaster,
  SalaryMasterPayload,
} from "@/types/payroll"

const payrollSettingsEndpoint = "/api/v1/payroll/settings"
const salaryMasterEndpoint = "/api/v1/payroll/salary-master"
const payrollAttendanceSummaryEndpoint = "/api/v1/payroll/attendance-summary"
const payrollReminderEndpoint = "/api/v1/payroll/reminders"
const payrollEmailSettingsEndpoint = "/api/v1/payroll/email-settings"
const payrollRunsEndpoint = "/api/v1/payroll/runs"
const payrollPayslipsEndpoint = "/api/v1/payroll/payslips"
const payrollEmployeeEmailMappingEndpoint = "/api/v1/payroll/employee-email-mapping"
const employeesEndpoint = "/api/v1/employees"
const departmentsEndpoint = "/api/v1/departments"

export async function getPayrollSettings(): Promise<PayrollSettings> {
  return api.get<PayrollSettings>(payrollSettingsEndpoint)
}

export async function updatePayrollSettings(
  payload: PayrollSettingsUpdate
): Promise<PayrollSettings> {
  return api.put<PayrollSettings>(payrollSettingsEndpoint, payload)
}

export async function listSalaryMasters(): Promise<SalaryMaster[]> {
  return api.get<SalaryMaster[]>(salaryMasterEndpoint)
}

export async function getSalaryMasterById(id: number): Promise<SalaryMaster> {
  return api.get<SalaryMaster>(`${salaryMasterEndpoint}/item/${id}`)
}

export async function createSalaryMaster(
  payload: SalaryMasterPayload
): Promise<SalaryMaster> {
  return api.post<SalaryMaster>(salaryMasterEndpoint, payload)
}

export async function updateSalaryMaster(
  id: number,
  payload: SalaryMasterPayload
): Promise<SalaryMaster> {
  return api.put<SalaryMaster>(`${salaryMasterEndpoint}/${id}`, payload)
}

export async function toggleSalaryMasterActive(id: number): Promise<SalaryMaster> {
  return api.patch<SalaryMaster>(`${salaryMasterEndpoint}/${id}/toggle-active`)
}

export async function listPayrollEmployees(
  options: { activeOnly?: boolean; departmentId?: number } = {}
): Promise<PayrollEmployeeOption[]> {
  const params = new URLSearchParams({
    limit: "1000",
  })

  if (typeof options.activeOnly === "boolean") {
    params.set("active_only", String(options.activeOnly))
  }

  if (typeof options.departmentId === "number") {
    params.set("department_id", String(options.departmentId))
  }

  return api.get<PayrollEmployeeOption[]>(`${employeesEndpoint}?${params.toString()}`)
}

export async function listPayrollDepartments(
  options: { activeOnly?: boolean } = {}
): Promise<PayrollDepartmentOption[]> {
  const params = new URLSearchParams()

  if (typeof options.activeOnly === "boolean") {
    params.set("active_only", String(options.activeOnly))
  }

  const endpoint = params.size
    ? `${departmentsEndpoint}?${params.toString()}`
    : departmentsEndpoint

  return api.get<Department[]>(endpoint)
}

export async function getPayrollAttendanceSummary(
  employeeId: number,
  params: { month: number; year: number }
): Promise<PayrollAttendanceSummary> {
  const query = new URLSearchParams({
    month: String(params.month),
    year: String(params.year),
  })

  return api.get<PayrollAttendanceSummary>(
    `${payrollAttendanceSummaryEndpoint}/${employeeId}?${query.toString()}`
  )
}

export async function getPayrollAttendanceBulkPreview(
  payload: PayrollAttendanceBulkPreviewRequest
): Promise<PayrollAttendanceBulkPreviewResponse> {
  return api.post<PayrollAttendanceBulkPreviewResponse>(
    `${payrollAttendanceSummaryEndpoint}/bulk-preview`,
    payload
  )
}

export async function getPayrollReminderPreview(
  params: { month?: number; year?: number } = {}
): Promise<PayrollReminderPreview> {
  const query = new URLSearchParams()
  if (typeof params.month === "number") query.set("month", String(params.month))
  if (typeof params.year === "number") query.set("year", String(params.year))

  const endpoint = query.size
    ? `${payrollReminderEndpoint}/preview?${query.toString()}`
    : `${payrollReminderEndpoint}/preview`

  return api.get<PayrollReminderPreview>(endpoint)
}

export async function sendPayrollReminderNow(payload: {
  month?: number
  year?: number
  target?: "ALL_PAYROLL_ACTIVE" | "MISS_PUNCH_ONLY" | "EMPLOYEE_IDS"
  employee_ids?: number[]
} = {}): Promise<PayrollEmailLog[]> {
  return api.post<PayrollEmailLog[]>(`${payrollReminderEndpoint}/send-now`, payload)
}

export async function listPayrollReminderLogs(
  params: {
    month?: number
    year?: number
    status?: PayrollEmailLog["status"]
    search?: string
    limit?: number
    offset?: number
  } = {}
): Promise<PayrollEmailLog[]> {
  const query = new URLSearchParams()
  if (typeof params.month === "number") query.set("month", String(params.month))
  if (typeof params.year === "number") query.set("year", String(params.year))
  if (typeof params.status === "string" && params.status.trim()) {
    query.set("status", params.status)
  }
  if (typeof params.search === "string" && params.search.trim()) {
    query.set("search", params.search.trim())
  }
  if (typeof params.limit === "number") query.set("limit", String(params.limit))
  if (typeof params.offset === "number") query.set("offset", String(params.offset))

  const endpoint = query.size
    ? `${payrollReminderEndpoint}/logs?${query.toString()}`
    : `${payrollReminderEndpoint}/logs`

  return api.get<PayrollEmailLog[]>(endpoint)
}

export async function listPayrollEmployeeEmailMapping(
  params: { limit?: number; offset?: number; activeOnly?: boolean; search?: string } = {}
): Promise<PayrollEmployeeEmailMapping[]> {
  const query = new URLSearchParams()
  if (typeof params.limit === "number") query.set("limit", String(params.limit))
  if (typeof params.offset === "number") query.set("offset", String(params.offset))
  if (typeof params.activeOnly === "boolean") {
    query.set("active_only", String(params.activeOnly))
  }
  if (typeof params.search === "string" && params.search.trim()) {
    query.set("search", params.search.trim())
  }

  const endpoint = query.size
    ? `${payrollEmployeeEmailMappingEndpoint}?${query.toString()}`
    : payrollEmployeeEmailMappingEndpoint

  return api.get<PayrollEmployeeEmailMapping[]>(endpoint)
}

export async function updatePayrollEmployeeEmailMapping(
  employeeId: number,
  payload: PayrollEmployeeEmailMappingUpdate
): Promise<PayrollEmployeeEmailMapping> {
  return api.put<PayrollEmployeeEmailMapping>(
    `${payrollEmployeeEmailMappingEndpoint}/${employeeId}`,
    payload
  )
}

export async function getPayrollReminderLogsForEmployee(
  employeeId: number
): Promise<PayrollEmailLog[]> {
  return api.get<PayrollEmailLog[]>(`${payrollReminderEndpoint}/logs/${employeeId}`)
}

export async function getPayrollEmailSettings(): Promise<EmailSettings> {
  return api.get<EmailSettings>(payrollEmailSettingsEndpoint)
}

export async function updatePayrollEmailSettings(
  payload: EmailSettingsUpdate
): Promise<EmailSettings> {
  return api.put<EmailSettings>(payrollEmailSettingsEndpoint, payload)
}

export async function testPayrollEmailSettings(
  payload: EmailSettingsTestRequest
): Promise<EmailSettingsTestResult> {
  return api.post<EmailSettingsTestResult>(
    `${payrollEmailSettingsEndpoint}/test`,
    payload
  )
}

export async function getPayrollRunById(id: number): Promise<PayrollRunDetail> {
  return api.get<PayrollRunDetail>(`${payrollRunsEndpoint}/${id}`)
}

export async function listPayrollRuns(): Promise<PayrollRun[]> {
  return api.get<PayrollRun[]>(payrollRunsEndpoint)
}

export async function generatePayrollRun(
  payload: PayrollRunGeneratePayload
): Promise<PayrollRun> {
  return api.post<PayrollRun>(`${payrollRunsEndpoint}/generate`, payload)
}

export async function lockPayrollRun(id: number): Promise<PayrollRun> {
  return api.post<PayrollRun>(`${payrollRunsEndpoint}/${id}/lock`)
}

export async function unlockPayrollRun(id: number): Promise<PayrollRun> {
  return api.post<PayrollRun>(`${payrollRunsEndpoint}/${id}/unlock`)
}

export async function publishPayrollRun(id: number): Promise<PayrollRun> {
  return api.post<PayrollRun>(`${payrollRunsEndpoint}/${id}/publish`)
}

export async function getPayrollRunSalaryBankExportUrl(id: number): Promise<string> {
  return `${payrollRunsEndpoint}/${id}/export-salary-bank-xlsx`
}

export async function generatePayslipsForPayrollRun(
  id: number,
  options: { sendEmail?: boolean } = {}
): Promise<PayslipGenerationResult> {
  const query = new URLSearchParams()
  if (options.sendEmail) query.set("send_email", "true")
  const endpoint = query.size
    ? `${payrollRunsEndpoint}/${id}/generate-payslips?${query.toString()}`
    : `${payrollRunsEndpoint}/${id}/generate-payslips`
  return api.post<PayslipGenerationResult>(endpoint)
}

export async function listPayslips(
  params: {
    month?: number
    year?: number
    employeeId?: number
    limit?: number
    offset?: number
  } = {}
): Promise<Payslip[]> {
  const query = new URLSearchParams()
  if (typeof params.month === "number") query.set("month", String(params.month))
  if (typeof params.year === "number") query.set("year", String(params.year))
  if (typeof params.employeeId === "number") {
    query.set("employee_id", String(params.employeeId))
  }
  if (typeof params.limit === "number") query.set("limit", String(params.limit))
  if (typeof params.offset === "number") query.set("offset", String(params.offset))

  const endpoint = query.size
    ? `${payrollPayslipsEndpoint}?${query.toString()}`
    : payrollPayslipsEndpoint

  return api.get<Payslip[]>(endpoint)
}
