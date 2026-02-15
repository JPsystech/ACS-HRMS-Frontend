"use client"

import { useDashboard } from "@/hooks/useDashboard"
import type { DashboardData } from "@/types/models"
import { useAuthStore } from "@/store/auth-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { PageContainer } from "@/components/ui/page-container"
import { AnimatedTable, AnimatedTableRow, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/animated-table"
import {
  Users,
  UserCheck,
  Clock,
  Calendar,
  CalendarDays,
  ArrowRight,
  FileText,
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { motion } from "framer-motion"
import { useMemo, useEffect } from "react"

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data, loading, error, refetch } = (useDashboard() as unknown as {
    data: DashboardData | null
    loading: boolean
    error: string
    refetch: () => void
  })

  // Refetch dashboard (pending leaves count, etc.) when a leave is approved/rejected/cancelled
  useEffect(() => {
    const handler = () => refetch()
    window.addEventListener("leave-action-done", handler)
    return () => window.removeEventListener("leave-action-done", handler)
  }, [refetch])

  // Calculate department breakdown for chart
  const departmentBreakdown = useMemo(() => {
    if (!data) return []
    // This would need employee data with departments - simplified for now
    return []
  }, [data])

  return (
    <PageContainer
      title="Dashboard"
      description={`Welcome back, ${user?.emp_code || "User"}! Here's what's happening today.`}
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
        >
          <p className="text-sm text-destructive">
            <strong>Error:</strong> {error}
          </p>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-6">
          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Tables Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Total Employees"
              value={data.stats.totalEmployees}
              icon={Users}
              description="All employees in system"
              gradient="indigo"
              delay={0}
            />
            <StatCard
              title="Active Employees"
              value={data.stats.activeEmployees}
              icon={UserCheck}
              description="Currently active"
              gradient="green"
              delay={0.1}
            />
            <StatCard
              title="Pending Leaves"
              value={data.stats.pendingLeavesCount}
              icon={Clock}
              description="Awaiting approval"
              gradient="amber"
              delay={0.2}
            />
            <StatCard
              title="Today Attendance"
              value={data.stats.todayAttendanceCount}
              icon={Calendar}
              description="Punch-ins today"
              gradient="blue"
              delay={0.3}
            />
            <StatCard
              title="This Month Holidays"
              value={data.stats.thisMonthHolidaysCount}
              icon={CalendarDays}
              description={format(new Date(), "MMMM yyyy")}
              gradient="purple"
              delay={0.4}
            />
          </div>

          {/* Charts & Widgets Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Pending Leaves Table */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg font-semibold">Pending Leave Approvals</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8"
                >
                  <Link href="/leaves">
                    View all
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {data.pendingLeaves.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No pending leaves"
                    description="All leave requests have been processed."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <AnimatedTable>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Leave Type</TableHead>
                          <TableHead>Dates</TableHead>
                          <TableHead>Days</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.pendingLeaves.map((leave, index) => (
                          <AnimatedTableRow key={leave.id} delay={index * 0.05}>
                            <TableCell className="font-medium">
                              {leave.employee
                                ? `${leave.employee.name} (${leave.employee.emp_code})`
                                : `Employee #${leave.employee_id}`}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-medium">
                                {leave.leave_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(leave.from_date), "MMM dd")} -{" "}
                              {format(new Date(leave.to_date), "MMM dd")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-semibold">
                                {leave.computed_days}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  leave.status === "PENDING"
                                    ? "secondary"
                                    : leave.status === "APPROVED"
                                    ? "default"
                                    : "destructive"
                                }
                                className="animate-pulse"
                              >
                                {leave.status}
                              </Badge>
                            </TableCell>
                          </AnimatedTableRow>
                        ))}
                      </TableBody>
                    </AnimatedTable>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Holidays (This Month + Next) */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg font-semibold">Upcoming Holidays</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-8"
                >
                  <Link href="/calendars/holidays">
                    View calendar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* This Month section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">This Month</p>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(), "MMMM yyyy")}
                    </span>
                  </div>
                  {data.thisMonthHolidays.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No holidays remaining this month.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.thisMonthHolidays.map((holiday, index) => (
                        <motion.div
                          key={holiday.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.06 }}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{holiday.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(holiday.date), "EEE, MMM dd, yyyy")}
                            </p>
                          </div>
                          <Badge variant="secondary" className="ml-4">
                            This month
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Next Holidays section */}
                <div className="pt-2 border-t">
                  <p className="text-sm font-semibold mb-2">Next Holidays</p>
                  {data.nextHolidays.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No additional upcoming holidays found.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.nextHolidays.map((holiday, index) => (
                        <motion.div
                          key={holiday.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.06 }}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{holiday.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(holiday.date), "EEE, MMM dd, yyyy")}
                            </p>
                          </div>
                          <Badge variant="outline" className="ml-4">
                            Upcoming
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <EmptyState
          icon={Users}
          title="No data available"
          description="Unable to load dashboard data. Please try refreshing the page."
        />
      )}
    </PageContainer>
  )
}
