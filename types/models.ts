/**
 * Type definitions for backend models
 * Maps to FastAPI Pydantic schemas
 */

export type Department = {
  id: number
  name: string
  active: boolean
  created_at?: string
  updated_at?: string
}

export type DepartmentCreate = {
  name: string
  active: boolean
}

export type DepartmentUpdate = {
  name?: string
  active?: boolean
}

export type Role = "HR" | "MANAGER" | "EMPLOYEE" | "MD" | "ADMIN" | "VP"
export type EmployeeRole = Role
export type WorkMode = "OFFICE" | "SITE"

// Dynamic role master as returned by /api/v1/roles
export type RoleDefinition = {
  id: number
  name: string
  role_rank: number
  wfh_enabled: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type Employee = {
  id: number
  emp_code: string
  name: string
  mobile_number?: string | null
  role: EmployeeRole
  department_id: number
  department_name?: string
  reporting_manager_id: number | null
  work_mode: WorkMode
  join_date?: string
  active: boolean
  created_at: string
  updated_at: string
}

export type EmployeeCreate = {
  emp_code: string
  name: string
  mobile_number?: string | null
  role: EmployeeRole
  department_id: number
  reporting_manager_id?: number | null
  work_mode?: WorkMode | null
  join_date: string
  password?: string
  active: boolean
}

export type EmployeeUpdate = {
  name?: string
  mobile_number?: string | null
  role?: EmployeeRole
  department_id?: number
  reporting_manager_id?: number | null
  work_mode?: WorkMode | null
  join_date?: string
  active?: boolean
}

export type ManagerOptions = {
  id: number
  emp_code: string
  name: string
  role_id: number
  role_name: string
  role_rank: number
  department_id: number
  department_name: string
}

export type Holiday = {
  id: number
  year: number
  date: string
  name: string
  active: boolean
  created_at?: string
  updated_at?: string
}

export type HolidayCreate = {
  year: number
  date: string
  name: string
  active: boolean
}

export type HolidayUpdate = {
  name?: string
  active?: boolean
}

export type RestrictedHoliday = {
  id: number
  year: number
  date: string
  name: string
  active: boolean
  created_at?: string
  updated_at?: string
}

export type RestrictedHolidayCreate = {
  year: number
  date: string
  name: string
  active: boolean
}

export type RestrictedHolidayUpdate = {
  name?: string
  active?: boolean
}

export type LeaveType = "CL" | "PL" | "SL" | "RH" | "COMPOFF" | "LWP"

export type LeaveStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "CANCELLED_BY_COMPANY"

export type LeaveRequest = {
  id: number
  employee_id: number
  leave_type: LeaveType
  from_date: string
  to_date: string
  reason?: string | null
  status: LeaveStatus
  computed_days: number
  paid_days: number
  lwp_days: number
  override_policy: boolean
  override_remark?: string | null
  auto_converted_to_lwp: boolean
  auto_lwp_reason?: string | null
  applied_at: string
  approver_id?: number | null
  created_at?: string
  updated_at?: string
  // Approve / reject / cancel remarks and actors (for display in list and detail)
  approved_remark?: string | null
  approved_at?: string | null
  approver?: { id: number; emp_code: string; name: string } | null
  rejected_remark?: string | null
  rejected_at?: string | null
  rejected_by_id?: number | null
  rejected_by?: { id: number; emp_code: string; name: string } | null
  cancelled_remark?: string | null
  cancelled_at?: string | null
  cancelled_by_id?: number | null
  cancelled_by?: { id: number; emp_code: string; name: string } | null
  // Extended fields (from employee join)
  employee?: {
    id: number
    emp_code: string
    name: string
    department_name?: string
  }
}

export type LeaveListResponse = {
  items: LeaveRequest[]
  total: number
}

export type ApprovalActionRequest = {
  remarks?: string
}

export type RejectActionRequest = {
  remarks: string
}

export type CancelLeaveRequest = {
  recredit: boolean
  remarks?: string
}

export type CompoffRequestStatus = "PENDING" | "APPROVED" | "REJECTED"

export type CompoffRequest = {
  id: number
  employee_id: number
  worked_date: string
  status: CompoffRequestStatus
  reason?: string | null
  requested_at: string
  created_at?: string
  updated_at?: string
  // Extended fields (from employee join)
  employee?: {
    id: number
    emp_code: string
    name: string
  }
}

export type CompoffListResponse = {
  items: CompoffRequest[]
  total: number
}

export type CompoffEarnRequest = {
  worked_date: string
  reason?: string
}

export type CompoffActionRequest = {
  remarks?: string
}

export type CompoffBalance = {
  employee_id: number
  available_days: number
  credits: number
  debits: number
  expired_credits: number
}

export type DashboardStats = {
  totalEmployees: number
  activeEmployees: number
  pendingLeavesCount: number
  todayAttendanceCount: number
  thisMonthHolidaysCount: number
}

export type DashboardData = {
  stats: DashboardStats
  pendingLeaves: LeaveRequest[]
  thisMonthHolidays: Holiday[]
  nextHolidays: Holiday[]
}

export type AttendanceLog = {
  id: number
  employee_id: number
  punch_date: string
  in_time?: string | null
  out_time?: string | null
  source: string
  employee?: {
    id: number
    emp_code: string
    name: string
  }
}

/** Session-based attendance (punch in/out) */

/** Geo payload from punch-in/out (lat, lng, accuracy, address, etc.) */
export type PunchGeo = {
  lat?: number
  lng?: number
  accuracy?: number
  address?: string | null
  captured_at?: string | null
  is_mocked?: boolean | null
  source?: string | null
}

export type AttendanceSessionStatus = "OPEN" | "CLOSED" | "AUTO_CLOSED" | "SUSPICIOUS"

export type AttendanceSessionDto = {
  id: number
  employee_id: number
  work_date: string
  punch_in_at: string
  punch_out_at?: string | null
  status: AttendanceSessionStatus
  punch_in_source: string
  punch_out_source?: string | null
  punch_in_ip?: string | null
  punch_out_ip?: string | null
  punch_in_device_id?: string | null
  punch_out_device_id?: string | null
  punch_in_geo?: PunchGeo | Record<string, unknown> | null
  punch_out_geo?: PunchGeo | Record<string, unknown> | null
  remarks?: string | null
  created_at: string
  updated_at: string
}

export type AdminAttendanceSessionDto = AttendanceSessionDto & {
  employee_name?: string | null
  department_name?: string | null
  worked_minutes?: number | null
}

export type AttendanceSessionListResponse = {
  items: AttendanceSessionDto[]
  total: number
}

export type AdminAttendanceSessionListResponse = {
  items: AdminAttendanceSessionDto[]
  total: number
}

export type AdminSessionUpdateRequest = {
  punch_in_at?: string
  punch_out_at?: string
  status?: AttendanceSessionStatus
  remarks?: string
}
