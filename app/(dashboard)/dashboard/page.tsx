"use client"

import { useDashboard } from "@/hooks/useDashboard"
import type { DashboardData } from "@/types/models"
import { useAuthStore } from "@/store/auth-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { CheckCircle2 } from "lucide-react"
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
import { useMemo, useEffect, useState } from "react"
import { api } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data, loading, error, refetch } = (useDashboard() as unknown as {
    data: DashboardData | null
    loading: boolean
    error: string
    refetch: () => void
  })
  const [themeInfo, setThemeInfo] = useState<{ mode?: string; bannerText?: string } | null>(null)
  const [birthdaysToday, setBirthdaysToday] = useState<any[] | null>(null)
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null)
  const [birthdayError, setBirthdayError] = useState<string | null>(null)
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([])
  const [upcomingOpen, setUpcomingOpen] = useState(false)

  // Refetch dashboard (pending leaves count, etc.) when a leave is approved/rejected/cancelled
  useEffect(() => {
    const handler = () => refetch()
    window.addEventListener("leave-action-done", handler)
    return () => window.removeEventListener("leave-action-done", handler)
  }, [refetch])

  useEffect(() => {
    let mounted = true
    api
      .get<{ mode?: string; bannerText?: string }>("/api/v1/culture/theme/today")
      .then((res) => {
        if (!mounted) return
        setThemeInfo(res)
      })
      .catch((e: any) => {
        console.error("Theme API error", e)
      })
    api
      .get<any[]>("/api/v1/culture/birthdays/today")
      .then((res) => {
        if (!mounted) return
        setBirthdaysToday(Array.isArray(res) ? res : (res as any).items || [])
      })
      .catch((e: any) => {
        console.error("Birthdays today API error", e)
        setBirthdayError("Failed to load today's birthdays")
      })
    api
      .get<any>("/api/v1/culture/birthdays/upcoming?days=7")
      .then((res) => {
        if (!mounted) return
        const items = Array.isArray(res) ? res : (res as any).items || []
        setUpcomingCount(items.length)
        setUpcomingBirthdays(items)
      })
      .catch((e: any) => {
        console.error("Upcoming birthdays API error", e)
        setBirthdayError("Failed to load upcoming birthdays")
      })
    return () => {
      mounted = false
    }
  }, [])

  // Calculate department breakdown for chart
  const departmentBreakdown = useMemo(() => {
    if (!data) return []
    // This would need employee data with departments - simplified for now
    return []
  }, [data])

  return (
    <PageContainer>
      {/* Premium Glassmorphic Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 md:p-10 text-white shadow-2xl bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-800"
      >
        <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl pointer-events-none" />
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-500/30 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/30 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white/95">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.emp_code || "User"} 👋
            </h1>
            <p className="text-indigo-100/80 text-lg max-w-xl leading-relaxed">
              Here is your centralized control center. Monitor attendance, leaves, and team culture at a glance.
            </p>
          </div>
        </div>
      </motion.div>
      <div className="mb-8 space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>✨</span> Culture & Celebrations
        </h2>
        {birthdayError && (
          <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-sm backdrop-blur-md">
            Birthday API error: {birthdayError}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }}>
            <Card className="h-full border-0 shadow-lg bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                <span className="text-8xl">🎂</span>
              </div>
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-lg text-rose-800 dark:text-rose-300 font-bold">
                  Today's Birthdays
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                {birthdaysToday ? (
                  birthdaysToday.length === 0 ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">No birthdays today.</p>
                  ) : (
                    <ul className="text-sm space-y-2">
                      {birthdaysToday.slice(0, 5).map((b: any, i: number) => (
                        <motion.li
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                          key={b.employee_id}
                          className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-black/20 p-2 rounded-lg"
                        >
                          <span className="text-rose-500">🎉</span> {b.name} {b.department ? <span className="text-xs text-slate-500">({b.department})</span> : ""}
                        </motion.li>
                      ))}
                      {birthdaysToday.length > 5 && (
                        <li className="text-slate-500 font-medium pt-1">+{birthdaysToday.length - 5} more</li>
                      )}
                    </ul>
                  )
                ) : (
                  <Skeleton className="h-20 w-full bg-white/40 dark:bg-black/20" />
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }}>
            <Card
              className={cn(
                "h-full border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 overflow-hidden relative group",
                upcomingCount ? "cursor-pointer" : ""
              )}
              onClick={() => {
                if (upcomingCount && upcomingCount > 0) setUpcomingOpen(true)
              }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                <span className="text-8xl">📅</span>
              </div>
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-lg text-indigo-800 dark:text-indigo-300 font-bold">
                  {upcomingCount !== null ? (
                    `Upcoming Birthdays (${upcomingCount})`
                  ) : (
                    "Upcoming Birthdays"
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-black/20 p-3 rounded-lg inline-block">
                  {upcomingCount !== null ? (
                    <span>Next 7 days overview &rarr;</span>
                  ) : (
                    <Skeleton className="h-5 w-32 bg-white/40 dark:bg-black/20" />
                  )}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
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
          {themeInfo?.mode === "BIRTHDAY" && (
            <div className="mb-4 p-3 rounded-lg border bg-primary/10 text-primary">
              <span className="mr-2">🎉</span>
              <span className="font-medium">{themeInfo.bannerText || "Happy Birthday!"}</span>
            </div>
          )}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Pending Leaves Table */}
            <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-xl shadow-indigo-100/20 dark:shadow-indigo-900/10 rounded-2xl overflow-hidden backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 transition-all hover:shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <CardTitle className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                  Pending Leave Approvals
                </CardTitle>
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
            <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-xl shadow-purple-100/20 dark:shadow-purple-900/10 rounded-2xl overflow-hidden backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 transition-all hover:shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <CardTitle className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">
                  Upcoming Holidays
                </CardTitle>
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

      <Dialog open={upcomingOpen} onOpenChange={setUpcomingOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Birthdays in next 7 days</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-2">
            {upcomingBirthdays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming birthdays.</p>
            ) : (
              <ul className="text-sm space-y-2">
                {upcomingBirthdays.map((b, idx) => (
                  <li key={`${b.employee_id ?? idx}-${b.date ?? idx}`} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                    <div className="flex-1">
                      <p className="font-medium">
                        {b.name ?? b.employee_name ?? `Employee #${b.employee_id}`}
                      </p>
                      <p className="text-muted-foreground">
                        {b.department ? `${b.department} • ` : ""}
                        {b.date ? format(new Date(b.date), "EEE, MMM dd, yyyy") : ""}
                      </p>
                    </div>
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
