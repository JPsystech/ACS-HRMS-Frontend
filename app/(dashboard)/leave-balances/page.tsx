"use client"

import React, { useEffect, useState } from "react"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { PageContainer } from "@/components/ui/page-container"
import { EmptyState } from "@/components/ui/empty-state"
import {
  AnimatedTable,
  AnimatedTableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from "@/components/ui/animated-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDateTimeIST } from "@/lib/format-attendance"
import { Layers } from "lucide-react"

type AdminBalanceItem = {
  employee_id: number
  employee_name: string | null
  department_name: string | null
  emp_code: string | null
  leave_type: string
  allocated: number
  opening: number
  accrued: number
  used: number
  remaining: number
  eligible: boolean
}

type LeaveTransaction = {
  id: number
  employee_id: number
  leave_id: number | null
  year: number
  leave_type: string
  delta_days: number
  action: string
  remarks: string | null
  action_by_employee_id: number | null
  action_at: string
}

type EmployeeBalanceRow = {
  employee_id: number
  employee_name: string
  department_name: string
  emp_code: string
  cl_allocated: number
  cl_remaining: number
  cl_used: number
  sl_allocated: number
  sl_remaining: number
  sl_used: number
  pl_allocated: number
  pl_remaining: number
  pl_used: number
  rh_allocated: number
  rh_remaining: number
  rh_used: number
  pl_eligible: boolean
}

const currentYear = new Date().getFullYear()
const YEARS = [currentYear, currentYear - 1, currentYear + 1].sort((a, b) => b - a)

export default function LeaveBalancesPage() {
  const { toast } = useToast()
  const [year, setYear] = useState(currentYear)
  const [departmentId, setDepartmentId] = useState<string>("")
  const [employeeId, setEmployeeId] = useState<string>("")
  const [employeeSearch, setEmployeeSearch] = useState("")
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([])
  const [rows, setRows] = useState<EmployeeBalanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerEmployeeId, setDrawerEmployeeId] = useState<number | null>(null)
  const [drawerEmployeeName, setDrawerEmployeeName] = useState("")
  const [transactions, setTransactions] = useState<LeaveTransaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null)
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0)

  useEffect(() => {
    api.get<{ id: number; name: string }[]>("/api/v1/departments").then((r) => {
      setDepartments(Array.isArray(r) ? r : [])
    }).catch(() => {})
  }, [])

  // Refetch admin balances when a leave is approved/rejected/cancelled from the Leaves page
  useEffect(() => {
    const handler = () => setBalanceRefreshKey((k) => k + 1)
    window.addEventListener("leave-action-done", handler)
    return () => window.removeEventListener("leave-action-done", handler)
  }, [])

  useEffect(() => {
    setLoading(true)
    setMigrationMessage(null)
    const params = new URLSearchParams({ year: String(year) })
    if (departmentId) params.set("department_id", departmentId)
    if (employeeId) params.set("employee_id", employeeId)
    api.get<{ year: number; items: AdminBalanceItem[]; total: number }>(
      `/api/v1/admin/leaves/balances?${params}`
    )
      .then((res) => {
        const items = Array.isArray((res as { items?: AdminBalanceItem[] })?.items) ? (res as { items: AdminBalanceItem[] }).items : []
        const byEmployee = new Map<number, Partial<EmployeeBalanceRow>>()
        for (const i of items) {
          let row = byEmployee.get(i.employee_id)
          if (!row) {
            row = {
              employee_id: i.employee_id,
              employee_name: i.employee_name ?? `#${i.employee_id}`,
              department_name: i.department_name ?? "—",
              emp_code: i.emp_code ?? "—",
              cl_allocated: 0,
              cl_remaining: 0,
              cl_used: 0,
              sl_allocated: 0,
              sl_remaining: 0,
              sl_used: 0,
              pl_allocated: 0,
              pl_remaining: 0,
              pl_used: 0,
              rh_allocated: 0,
              rh_remaining: 0,
              rh_used: 0,
              pl_eligible: true,
            }
            byEmployee.set(i.employee_id, row)
          }
          const lt = String(i.leave_type).toUpperCase()
          if (lt === "CL") {
            row.cl_allocated = i.allocated
            row.cl_remaining = i.remaining
            row.cl_used = i.used
          } else if (lt === "SL") {
            row.sl_allocated = i.allocated
            row.sl_remaining = i.remaining
            row.sl_used = i.used
          } else if (lt === "PL") {
            row.pl_allocated = i.allocated
            row.pl_remaining = i.remaining
            row.pl_used = i.used
            row.pl_eligible = i.eligible
          } else if (lt === "RH") {
            row.rh_allocated = i.allocated
            row.rh_remaining = i.remaining
            row.rh_used = i.used
          }
        }
        setRows(Array.from(byEmployee.values()) as EmployeeBalanceRow[])
      })
      .catch((err: ApiClientError) => {
        const detail = typeof err.data?.detail === "string" ? err.data.detail : "Failed to load balances"
        if (err.status === 503) {
          setMigrationMessage(detail)
        } else {
          toast({ title: "Error", description: detail, variant: "destructive" })
        }
        setRows([])
      })
      .finally(() => setLoading(false))
  }, [year, departmentId, employeeId, toast, balanceRefreshKey])

  const openDrawer = (empId: number, name: string) => {
    setDrawerEmployeeId(empId)
    setDrawerEmployeeName(name)
    setDrawerOpen(true)
    setTransactionsLoading(true)
    setTransactions([])
    api.get<LeaveTransaction[]>(`/api/v1/admin/leaves/balances/transactions?employee_id=${empId}&year=${year}&limit=100`)
      .then((res) => setTransactions(Array.isArray(res) ? res : []))
      .catch(() => setTransactions([]))
      .finally(() => setTransactionsLoading(false))
  }

  const filteredRows = employeeSearch.trim()
    ? rows.filter(
        (r) =>
          r.employee_name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
          (r.emp_code && r.emp_code.toLowerCase().includes(employeeSearch.toLowerCase()))
      )
    : rows

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Leave Balances</h1>
          <p className="text-muted-foreground mt-1">View and filter leave wallet by year, department, and employee.</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={departmentId || "all"} onValueChange={(v) => setDepartmentId(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employee ID</Label>
                <Input
                  placeholder="Optional"
                  className="w-[120px]"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Search by name/code</Label>
                <Input
                  placeholder="Filter in table"
                  className="w-[180px]"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : migrationMessage ? (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Migration required</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 whitespace-pre-wrap">{migrationMessage}</p>
              <p className="text-sm mt-3 text-muted-foreground">
                In a terminal, from the <code className="bg-muted px-1 rounded">hrms-backend</code> folder, run: <code className="bg-muted px-1 rounded">alembic upgrade head</code> (with the backend server stopped).
              </p>
            </CardContent>
          </Card>
        ) : filteredRows.length === 0 ? (
          <EmptyState icon={Layers} title="No balances" description="No leave balance records for the selected filters." />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <AnimatedTable>
                <TableHeader>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>CL (Total / Used / Remaining)</TableHead>
                  <TableHead>SL (Total / Used / Remaining)</TableHead>
                  <TableHead>PL (Total / Used / Remaining)</TableHead>
                  <TableHead>RH (Total / Used / Remaining)</TableHead>
                  <TableHead>PL Eligible</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => (
                    <AnimatedTableRow key={r.employee_id}>
                      <TableCell className="font-medium">
                        {r.employee_name}
                        {r.emp_code && r.emp_code !== "—" && (
                          <span className="text-muted-foreground ml-1">({r.emp_code})</span>
                        )}
                      </TableCell>
                      <TableCell>{r.department_name}</TableCell>
                      <TableCell>{r.cl_allocated} / {r.cl_used} / {r.cl_remaining}</TableCell>
                      <TableCell>{r.sl_allocated} / {r.sl_used} / {r.sl_remaining}</TableCell>
                      <TableCell>{r.pl_allocated} / {r.pl_used} / {r.pl_remaining}</TableCell>
                      <TableCell>{r.rh_allocated} / {r.rh_used} / {r.rh_remaining}</TableCell>
                      <TableCell>
                        {r.pl_eligible ? (
                          <Badge variant="secondary">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openDrawer(r.employee_id, r.employee_name)}>
                          Transactions
                        </Button>
                      </TableCell>
                    </AnimatedTableRow>
                  ))}
                </TableBody>
              </AnimatedTable>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transactions — {drawerEmployeeName}</DialogTitle>
            <DialogDescription>Leave wallet transactions for the selected employee and year.</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {transactionsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : transactions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No transactions.</p>
            ) : (
              <ul className="space-y-3">
                {transactions.map((t) => (
                  <li key={t.id} className="text-sm border-b pb-2">
                    <span className="font-medium">{t.action}</span>
                    {" · "}
                    <span>{t.leave_type}</span>
                    {" "}
                    <span className={t.delta_days >= 0 ? "text-green-600" : "text-red-600"}>
                      {t.delta_days >= 0 ? "+" : ""}{t.delta_days}
                    </span>
                    {" · "}
                    <span className="text-muted-foreground">{formatDateTimeIST(t.action_at)}</span>
                    {t.remarks && <p className="text-muted-foreground mt-0.5">{t.remarks}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
