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
  TableRow,
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
import { format } from "date-fns"
import { Layers } from "lucide-react"

type AdminWfhBalanceItem = {
  employee_id: number
  employee_name: string | null
  department_name: string | null
  emp_code: string | null
  entitled: number
  accrued: number
  used: number
  remaining: number
}

type WfhTransaction = {
  id: number
  employee_id: number
  year?: number
  date: string
  day_value: number
  action: string
  remarks: string | null
  action_by_employee_id: number | null
  action_at: string
}

type WfhBalanceRow = {
  employee_id: number
  employee_name: string
  department_name: string
  emp_code: string
  entitled: number
  accrued: number
  used: number
  remaining: number
}

const currentYear = new Date().getFullYear()
const YEARS = [currentYear, currentYear - 1, currentYear + 1].sort((a, b) => b - a)

export default function WfhBalancesPage() {
  const { toast } = useToast()
  const [year, setYear] = useState(currentYear)
  const [rows, setRows] = useState<WfhBalanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"remaining" | "used">("remaining")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerEmployeeId, setDrawerEmployeeId] = useState<number | null>(null)
  const [drawerEmployeeName, setDrawerEmployeeName] = useState("")
  const [transactions, setTransactions] = useState<WfhTransaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0)

  useEffect(() => {
    // Refetch balances when WFH approvals change anything
    const handler = () => setBalanceRefreshKey((k) => k + 1)
    window.addEventListener("wfh-action-done", handler)
    return () => window.removeEventListener("wfh-action-done", handler)
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ year: String(year) })
    api
      .get<{ year: number; items: AdminWfhBalanceItem[]; total: number }>(
        `/api/v1/admin/wfh/balances?${params}`,
      )
      .then((res) => {
        const items = Array.isArray((res as { items?: AdminWfhBalanceItem[] })?.items)
          ? (res as { items: AdminWfhBalanceItem[] }).items
          : []
        const mapped: WfhBalanceRow[] = items.map((i) => ({
          employee_id: i.employee_id,
          employee_name: i.employee_name ?? `#${i.employee_id}`,
          department_name: i.department_name ?? "—",
          emp_code: i.emp_code ?? "—",
          entitled: i.entitled,
          accrued: i.accrued,
          used: i.used,
          remaining: i.remaining,
        }))
        setRows(mapped)
      })
      .catch((err: ApiClientError) => {
        const detail =
          typeof err.data?.detail === "string"
            ? err.data.detail
            : "Failed to load WFH balances"
        toast({ title: "Error", description: detail, variant: "destructive" })
        setRows([])
      })
      .finally(() => setLoading(false))
  }, [year, toast, balanceRefreshKey])

  const openDrawer = (empId: number, name: string) => {
    setDrawerEmployeeId(empId)
    setDrawerEmployeeName(name)
    setDrawerOpen(true)
    setTransactionsLoading(true)
    setTransactions([])
    const params = new URLSearchParams({
      employee_id: String(empId),
      year: String(year),
      limit: "100",
    })
    api
      .get<WfhTransaction[]>(
        `/api/v1/admin/wfh/balances/transactions?${params.toString()}`,
      )
      .then((res) => setTransactions(Array.isArray(res) ? res : []))
      .catch(() => setTransactions([]))
      .finally(() => setTransactionsLoading(false))
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.employee_name.toLowerCase().includes(q) ||
      (r.emp_code && r.emp_code.toLowerCase().includes(q))
    )
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "remaining") {
      return b.remaining - a.remaining
    }
    // sortBy used
    return b.used - a.used
  })

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">WFH Balances</h1>
          <p className="text-muted-foreground mt-1">
            View and review Work From Home usage by year.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Year</Label>
                <Select
                  value={String(year)}
                  onValueChange={(v) => setYear(Number(v))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Search by name/code</Label>
                <Input
                  placeholder="Filter in table"
                  className="w-[200px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Sort by</Label>
                <Select
                  value={sortBy}
                  onValueChange={(v) =>
                    setSortBy(v as "remaining" | "used")
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remaining">
                      Remaining (high to low)
                    </SelectItem>
                    <SelectItem value="used">Used (high to low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No WFH balances"
            description="No WFH usage records for the selected year."
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <AnimatedTable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Entitled</TableHead>
                    <TableHead>Accrued</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((r) => (
                    <AnimatedTableRow key={r.employee_id}>
                      <TableCell className="font-medium">
                        {r.employee_name}
                        {r.emp_code && r.emp_code !== "—" && (
                          <span className="text-muted-foreground ml-1">
                            ({r.emp_code})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{r.department_name}</TableCell>
                      <TableCell>{r.entitled}</TableCell>
                      <TableCell>{r.accrued}</TableCell>
                      <TableCell>{r.used}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.remaining <= 0
                              ? "destructive"
                              : r.remaining < r.entitled / 2
                              ? "secondary"
                              : "default"
                          }
                        >
                          {r.remaining}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            openDrawer(r.employee_id, r.employee_name)
                          }
                        >
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
            <DialogTitle>WFH Transactions — {drawerEmployeeName}</DialogTitle>
            <DialogDescription>
              WFH activity for the selected employee and year.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {transactionsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : transactions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No transactions.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {transactions.map((t) => (
                  <li key={t.id} className="border-b pb-2">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {t.action} · {t.day_value}
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(t.date), "dd MMM yyyy")}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>
                        {t.remarks ? t.remarks : "No remarks"}
                      </span>
                      <span>
                        {format(new Date(t.action_at), "dd MMM yyyy, hh:mm a")}
                      </span>
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

