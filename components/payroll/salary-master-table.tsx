"use client"

import { useMemo, useState } from "react"
import { Edit, Loader2, Plus, RefreshCw, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  salaryMasterActiveFilterOptions,
  SalaryMasterActiveFilter,
  SalaryMasterListItem,
} from "@/types/payroll"

type SalaryMasterTableProps = {
  items: SalaryMasterListItem[]
  isLoading: boolean
  errorMessage?: string | null
  togglingId?: number | null
  onCreate: () => void
  onEdit: (item: SalaryMasterListItem) => void
  onToggleActive: (item: SalaryMasterListItem) => Promise<void> | void
  onRefresh: () => void
}

function formatCurrency(value: string | number): string {
  const amount = Number(value)

  if (!Number.isFinite(amount)) {
    return String(value)
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function ApplicabilityBadge({
  label,
  active,
}: {
  label: string
  active: boolean
}) {
  return (
    <Badge
      variant={active ? "default" : "outline"}
      className={active ? "" : "text-muted-foreground"}
    >
      {label}
    </Badge>
  )
}

export function SalaryMasterTable({
  items,
  isLoading,
  errorMessage,
  togglingId,
  onCreate,
  onEdit,
  onToggleActive,
  onRefresh,
}: SalaryMasterTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] =
    useState<SalaryMasterActiveFilter>("ALL")

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const query = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !query ||
        item.employee_name.toLowerCase().includes(query) ||
        item.employee_code.toLowerCase().includes(query)

      const matchesActive =
        activeFilter === "ALL" ||
        (activeFilter === "ACTIVE" && item.payroll_active) ||
        (activeFilter === "INACTIVE" && !item.payroll_active)

      return matchesSearch && matchesActive
    })
  }, [activeFilter, items, searchQuery])

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle>Salary Master</CardTitle>
            <p className="text-sm text-muted-foreground">
              Review employee salary setup, statutory applicability, and payroll activation status.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Salary Master
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-2">
            <Label htmlFor="salary-master-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="salary-master-search"
                placeholder="Search by employee name or code"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="salary-master-active-filter">Payroll Status</Label>
            <Select
              value={activeFilter}
              onValueChange={(value) =>
                setActiveFilter(value as SalaryMasterActiveFilter)
              }
            >
              <SelectTrigger id="salary-master-active-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {salaryMasterActiveFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Search}
            title={
              items.length === 0
                ? "No salary masters found"
                : "No salary masters match your filters"
            }
            description={
              items.length === 0
                ? "Create the first salary master record to start managing payroll setup."
                : "Try changing the search text or payroll status filter."
            }
            action={items.length === 0 ? { label: "Create Salary Master", onClick: onCreate } : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Employee Code</TableHead>
                <TableHead>Monthly Gross Salary</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Payroll Active</TableHead>
                <TableHead>PF / ESIC / TDS</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div className="space-y-1">
                      <div>{item.employee_name}</div>
                      {!item.employee_active ? (
                        <p className="text-xs text-muted-foreground">
                          Employee inactive
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{item.employee_code}</TableCell>
                  <TableCell>{formatCurrency(item.monthly_gross_salary)}</TableCell>
                  <TableCell>{formatDate(item.effective_from)}</TableCell>
                  <TableCell>
                    <Badge variant={item.payroll_active ? "default" : "outline"}>
                      {item.payroll_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <ApplicabilityBadge label="PF" active={item.pf_applicable} />
                      <ApplicabilityBadge label="ESIC" active={item.esic_applicable} />
                      <ApplicabilityBadge label="TDS" active={item.tds_applicable} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(item)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={item.payroll_active ? "destructive" : "secondary"}
                        onClick={() => onToggleActive(item)}
                        disabled={togglingId === item.id}
                      >
                        {togglingId === item.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {item.payroll_active ? "Set Inactive" : "Set Active"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
