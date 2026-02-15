"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { RequireRole } from "@/components/auth/RequireRole"
import { PageContainer } from "@/components/ui/page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Calendar, Play, RefreshCw, AlertCircle, CheckCircle } from "lucide-react"

interface AccrualRunResult {
  month?: string
  year?: number
  months_run?: number
  total_employees_processed: number
  credited_count: number
  skipped_not_eligible: number
  skipped_inactive: number
  details: Array<{
    employee_id: number
    emp_code: string
    name: string
    cl_remaining?: number
    sl_remaining?: number
    pl_remaining?: number
  }>
  credit: string
}

interface AccrualStatus {
  year: number
  employees: Array<{
    employee_id: number
    emp_code: string
    name: string
    join_date: string
    cl_remaining: number
    sl_remaining: number
    pl_remaining: number
    cl_used: number
    sl_used: number
    pl_used: number
  }>
  total: number
  credit: string
}

export default function AccrualPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [runResult, setRunResult] = useState<AccrualRunResult | null>(null)
  const [statusData, setStatusData] = useState<AccrualStatus | null>(null)
  const [apiError, setApiError] = useState<string>("")
  const [runType, setRunType] = useState<"month" | "year">("month")
  const [month, setMonth] = useState<string>(getCurrentMonth())
  const [year, setYear] = useState<number>(new Date().getFullYear())

  function getCurrentMonth(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const runAccrual = async () => {
    if (!user || user.role !== "ADMIN") return

    setRunning(true)
    setApiError("")
    
    try {
      let result: AccrualRunResult
      
      if (runType === "month") {
        result = await api.post<AccrualRunResult>(`/api/v1/accrual/run?month=${month}`)
      } else {
        result = await api.post<AccrualRunResult>(`/api/v1/accrual/run?year=${year}`)
      }
      
      setRunResult(result)
      toast({
        title: "Accrual Completed",
        description: `Processed ${result.total_employees_processed} employees, credited ${result.credited_count}`,
      })
      
      // Refresh status after running
      fetchAccrualStatus()
      
    } catch (err) {
      console.error("Accrual run failed:", err)
      let errorMsg = "Failed to run accrual"
      
      if (err instanceof ApiClientError) {
        if (err.status === 403) {
          errorMsg = "Admin access required to run accrual"
        } else {
          errorMsg = err.data.detail || errorMsg
        }
      }
      
      setApiError(errorMsg)
      toast({
        variant: "destructive",
        title: "Accrual Failed",
        description: errorMsg,
      })
    } finally {
      setRunning(false)
    }
  }

  const fetchAccrualStatus = useCallback(async () => {
    if (!user || user.role !== "ADMIN") return

    setStatusLoading(true)
    setApiError("")
    
    try {
      const status = await api.get<AccrualStatus>(`/api/v1/accrual/status?year=${year}`)
      setStatusData(status)
    } catch (err) {
      console.error("Accrual status fetch failed:", err)
      let errorMsg = "Failed to fetch accrual status"
      
      if (err instanceof ApiClientError) {
        if (err.status === 403) {
          errorMsg = "Admin access required to view accrual status"
        } else {
          errorMsg = err.data.detail || errorMsg
        }
      }
      
      setApiError(errorMsg)
    } finally {
      setStatusLoading(false)
    }
  }, [user, year])

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchAccrualStatus()
    }
  }, [user, year, fetchAccrualStatus])

  return (
    <RequireRole allowedRoles={["ADMIN"]}>
      <PageContainer>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Accrual Management</h1>
            <p className="text-muted-foreground">
              Run monthly or yearly leave accrual and monitor employee balances
            </p>
          </div>

          {apiError && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {apiError}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Run Accrual</CardTitle>
              <CardDescription>
                Process leave accrual for employees. Monthly accrual credits CL/PL +1, SL pro-rated annually.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="run-type">Run Type</Label>
                  <Select value={runType} onValueChange={(value: "month" | "year") => setRunType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {runType === "month" ? (
                  <div className="space-y-2">
                    <Label htmlFor="month">Month (YYYY-MM)</Label>
                    <Input
                      type="text"
                      id="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      placeholder="2026-02"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      type="number"
                      id="year"
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      placeholder="2026"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button 
                    onClick={runAccrual} 
                    disabled={running || loading}
                    className="w-full"
                  >
                    {running ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Run Accrual
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {runResult && (
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Accrual Completed Successfully</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Processed:</span>
                      <div className="font-medium">{runResult.total_employees_processed}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Credited:</span>
                      <div className="font-medium">{runResult.credited_count}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Skipped (ineligible):</span>
                      <div className="font-medium">{runResult.skipped_not_eligible}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Skipped (inactive):</span>
                      <div className="font-medium">{runResult.skipped_inactive}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accrual Status - {year}</CardTitle>
              <CardDescription>
                Current leave balances for all employees for the selected year
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="status-year">Year</Label>
                <Input
                  type="number"
                  id="status-year"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="max-w-xs"
                />
              </div>

              {statusLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : statusData && statusData.employees.length > 0 ? (
                <div className="border rounded-md">
                  <div className="grid grid-cols-7 gap-4 p-4 bg-muted font-medium text-sm">
                    <div>Employee</div>
                    <div>CL Balance</div>
                    <div>SL Balance</div>
                    <div>PL Balance</div>
                    <div>CL Used</div>
                    <div>SL Used</div>
                    <div>PL Used</div>
                  </div>
                  {statusData.employees.slice(0, 10).map((employee) => (
                    <div key={employee.employee_id} className="grid grid-cols-7 gap-4 p-4 border-t text-sm">
                      <div className="font-medium">{employee.name}</div>
                      <div>
                        <Badge variant={employee.cl_remaining > 0 ? "default" : "secondary"}>
                          {employee.cl_remaining}
                        </Badge>
                      </div>
                      <div>
                        <Badge variant={employee.sl_remaining > 0 ? "default" : "secondary"}>
                          {employee.sl_remaining}
                        </Badge>
                      </div>
                      <div>
                        <Badge variant={employee.pl_remaining > 0 ? "default" : "secondary"}>
                          {employee.pl_remaining}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground">{employee.cl_used}</div>
                      <div className="text-muted-foreground">{employee.sl_used}</div>
                      <div className="text-muted-foreground">{employee.pl_used}</div>
                    </div>
                  ))}
                  {statusData.employees.length > 10 && (
                    <div className="p-4 border-t text-center text-muted-foreground">
                      Showing 10 of {statusData.total} employees
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="No Accrual Data"
                  description="Run accrual to see employee leave balances"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </RequireRole>
  )
}
