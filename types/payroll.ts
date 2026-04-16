import type { Department, Employee } from "@/types/models"

export type PayrollWeekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY"

export type SalaryDivisorType =
  | "CALENDAR_DAYS"
  | "FIXED_30_DAYS"
  | "WORKING_DAYS"

export type TaxDeductionType = "PERCENTAGE" | "AMOUNT"

export type PayrollAmount = string | number

export type PayrollRunStatus = "DRAFT" | "LOCKED" | "PUBLISHED" | string

export type PayrollRun = {
  id: number
  month: number
  year: number
  status: PayrollRunStatus
  weekly_off_day?: PayrollWeekday
  salary_divisor_type?: SalaryDivisorType
  divisor_days?: number
  salary_date?: string
  payslip_date?: string
  operational_completed_by?: string
  total_employees?: number
  total_gross_earned?: PayrollAmount
  total_deductions?: PayrollAmount
  total_net_payable?: PayrollAmount
  generated_at?: string
  generated_by?: number
  locked_by?: number | null
  published_by?: number | null
  locked_at?: string | null
  published_at?: string | null
  created_at?: string
  updated_at?: string
}

export type PayrollItem = {
  id: number
  payroll_run_id: number
  employee_id: number
  employee_code: string
  employee_name: string
  salary_master_id: number
  present_days: PayrollAmount
  half_days: PayrollAmount
  absent_days: PayrollAmount
  weekly_off_days: PayrollAmount
  paid_leave_days: PayrollAmount
  unpaid_leave_days: PayrollAmount
  miss_punch_days: PayrollAmount
  late_count: number
  payable_days: PayrollAmount
  lwp_days: PayrollAmount
  monthly_gross_salary: PayrollAmount
  divisor_days: number
  earned_gross_salary: PayrollAmount
  attendance_deduction: PayrollAmount
  pf_employee_amount: PayrollAmount
  pf_employer_amount: PayrollAmount
  esic_amount: PayrollAmount
  pt_amount: PayrollAmount
  tds_amount: PayrollAmount
  other_fixed_deduction: PayrollAmount
  extra_earning: PayrollAmount
  extra_deduction: PayrollAmount
  total_deductions: PayrollAmount
  net_payable: PayrollAmount
  remarks?: string | null
  created_at?: string
  updated_at?: string
}

export type PayrollRunDetail = PayrollRun & {
  items?: PayrollItem[]
}

export type PayslipStatus = "GENERATED" | "FAILED" | string

export type PayslipStorageProvider = "LOCAL" | "R2" | string

export type Payslip = {
  id: number
  payroll_run_id: number
  payroll_item_id?: number | null
  employee_id: number
  employee_name?: string | null
  employee_code?: string | null
  salary_month: number
  salary_year: number
  payslip_date: string
  gross_salary: PayrollAmount
  total_deduction: PayrollAmount
  net_salary: PayrollAmount
  file_name: string
  file_path: string
  file_url?: string | null
  download_endpoint?: string | null
  storage_provider: PayslipStorageProvider
  status: PayslipStatus
  generated_at?: string | null
  created_at?: string
  updated_at?: string
}

export type PayslipGenerationResult = {
  payroll_run_id: number
  month: number
  year: number
  generated: number
  skipped: number
  failed: unknown[] | number
  email_sent?: number
  email_skipped?: number
  email_failed?: number
}

export type PayrollRunGeneratePayload = {
  month: number
  year: number
  employee_ids?: number[]
}

export type PayrollSettings = {
  id: number
  weekly_off_day: PayrollWeekday
  office_start_time: string
  office_end_time: string
  grace_time_end: string
  half_day_min_minutes: number
  full_day_min_minutes: number
  attendance_cutoff_time: string
  reminder_send_time: string
  payroll_draft_time: string
  payroll_finalization_day: number
  official_salary_day: number
  miss_punch_as_absent: boolean
  late_rule_enabled: boolean
  late_rule_exempt_rank_max: number
  salary_divisor_type: SalaryDivisorType
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type PayrollSettingsUpdate = Partial<
  Omit<PayrollSettings, "id" | "created_at" | "updated_at">
>

export type SalaryMaster = {
  id: number
  employee_id: number
  monthly_gross_salary: PayrollAmount
  effective_from: string
  payroll_active: boolean
  pf_applicable: boolean
  pf_employee_percent: PayrollAmount
  pf_employer_percent: PayrollAmount
  esic_applicable: boolean
  esic_percent: PayrollAmount
  pt_applicable: boolean
  pt_amount: PayrollAmount
  tds_applicable: boolean
  tds_type: TaxDeductionType | null
  tds_value: PayrollAmount
  other_fixed_deduction: PayrollAmount
  bank_name: string | null
  account_number: string | null
  ifsc_code: string | null
  uan_number: string | null
  esic_number: string | null
  pan_number: string | null
  remarks: string | null
  created_at: string
  updated_at: string
}

export type SalaryMasterPayload = Omit<
  SalaryMaster,
  "id" | "created_at" | "updated_at"
>

export type SalaryMasterListItem = SalaryMaster & {
  employee_name: string
  employee_code: string
  employee_active: boolean
}

export type PayrollEmployeeOption = Pick<
  Employee,
  "id" | "name" | "emp_code" | "active" | "department_id" | "department"
>

export type PayrollDepartmentOption = Pick<Department, "id" | "name" | "active">

export type PayrollAttendanceStatus =
  | "PRESENT"
  | "HALF_DAY"
  | "ABSENT"
  | "WEEKLY_OFF"
  | "PAID_LEAVE"
  | "UNPAID_LEAVE"
  | "MISS_PUNCH"

export type PayrollAttendanceDailyBreakdown = {
  work_date: string
  status: PayrollAttendanceStatus
  payable_value: number
  lwp_value: number
  worked_minutes: number
  punch_in_at: string | null
  punch_out_at: string | null
  is_late: boolean
  notes: string | null
}

export type PayrollAttendanceSummary = {
  employee_id: number
  employee_code: string
  employee_name: string
  month: number
  year: number
  cutoff_at: string
  present_days: number
  half_days: number
  absent_days: number
  weekly_off_days: number
  paid_leave: number
  unpaid_leave: number
  miss_punch: number
  paid_leave_days: number
  unpaid_leave_days: number
  miss_punch_days: number
  late_count: number
  payable_days: number
  lwp_days: number
  daily_breakdown: PayrollAttendanceDailyBreakdown[]
}

export type PayrollAttendanceBulkPreviewRequest = {
  month: number
  year: number
  employee_ids?: number[]
}

export type PayrollAttendanceBulkPreviewResponse = {
  month: number
  year: number
  total_employees: number
  summaries: PayrollAttendanceSummary[]
}

export type PayrollReminderEmployee = {
  employee_id: number
  emp_code: string
  name: string
  missing_dates: string[]
}

export type PayrollReminderScheduleInfo = {
  send_day_rule: "last_day_of_month" | string
  send_time: string
  cutoff_time: string
  timezone: string
}

export type PayrollReminderPreview = {
  subject: string
  body?: string
  body_template?: string
  target_count?: number
  last_scheduled_run?: string | null
  schedule_info?: PayrollReminderScheduleInfo
  month?: number
  year?: number
  timezone?: string
  send_at?: string | null
  cutoff_at?: string | null
  target_employee_count?: number
  employees?: PayrollReminderEmployee[]
}

export type PayrollReminderType = "ATTENDANCE_CORRECTION"

export type PayrollEmailSendMode = "auto" | "manual" | "resend" | "test"

export type PayrollEmailLogStatus = "queued" | "sent" | "failed" | "skipped"

export type PayrollEmailLog = {
  id: number
  employee_id: number | null
  employee_code: string | null
  employee_name: string | null
  department_id: number | null
  payroll_month: number
  payroll_year: number
  reminder_type: PayrollReminderType
  email_to: string | null
  email_subject: string
  email_body: string
  send_mode: PayrollEmailSendMode
  status: PayrollEmailLogStatus
  failure_reason: string | null
  provider_message_id: string | null
  sent_by_user_id: number | null
  sent_at: string | null
  created_at: string
}

export type PayrollEmployeeEmailStatus = "ok" | "missing" | "invalid" | "disabled" | string

export type PayrollEmployeeEmailMapping = {
  employee_id: number
  employee_code: string
  employee_name: string
  official_email: string | null
  personal_email: string | null
  preferred_email_type: "official" | "personal" | null
  email_notifications_enabled: boolean
  resolved_send_email: string | null
  email_status: PayrollEmployeeEmailStatus
}

export type PayrollEmployeeEmailMappingUpdate = Partial<
  Pick<
    PayrollEmployeeEmailMapping,
    "official_email" | "personal_email" | "preferred_email_type" | "email_notifications_enabled"
  >
>

export type EmailSettings = {
  id: number
  provider_name: string
  sender_name: string
  sender_email: string
  smtp_host: string
  smtp_port: number
  smtp_username: string | null
  smtp_password_set: boolean
  use_tls: boolean
  use_ssl: boolean
  reply_to_email: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type EmailSettingsUpdate = {
  provider_name: string
  sender_name: string
  sender_email: string
  smtp_host: string
  smtp_port: number
  smtp_username: string
  smtp_password?: string | null
  use_tls: boolean
  use_ssl: boolean
  reply_to_email?: string | null
  is_active: boolean
}

export type EmailSettingsTestRequest = {
  to_email: string
  subject?: string
  body_html?: string
}

export type EmailSettingsTestResult = {
  status: "sent" | "failed" | string
  provider_message_id?: string | null
  sent_at?: string | null
}

export type SalaryMasterActiveFilter = "ALL" | "ACTIVE" | "INACTIVE"

export const payrollWeekdayOptions: Array<{
  label: string
  value: PayrollWeekday
}> = [
  { label: "Monday", value: "MONDAY" },
  { label: "Tuesday", value: "TUESDAY" },
  { label: "Wednesday", value: "WEDNESDAY" },
  { label: "Thursday", value: "THURSDAY" },
  { label: "Friday", value: "FRIDAY" },
  { label: "Saturday", value: "SATURDAY" },
  { label: "Sunday", value: "SUNDAY" },
]

export const salaryDivisorOptions: Array<{
  label: string
  value: SalaryDivisorType
}> = [
  { label: "Calendar Days", value: "CALENDAR_DAYS" },
  { label: "Fixed 30 Days", value: "FIXED_30_DAYS" },
  { label: "Working Days", value: "WORKING_DAYS" },
]

export const taxDeductionTypeOptions: Array<{
  label: string
  value: TaxDeductionType
}> = [
  { label: "Percentage", value: "PERCENTAGE" },
  { label: "Amount", value: "AMOUNT" },
]

export const salaryMasterActiveFilterOptions: Array<{
  label: string
  value: SalaryMasterActiveFilter
}> = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
]
