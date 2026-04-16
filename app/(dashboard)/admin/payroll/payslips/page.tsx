"use client"

import { useCallback, useEffect, useState } from "react"

import { RequireRole } from "@/components/auth/RequireRole"
import { PayslipsTable } from "@/components/payroll/payslips-table"
import { PageContainer } from "@/components/ui/page-container"
import { useToast } from "@/hooks/use-toast"
import { ApiClientError, API_BASE_URL, getToken, removeToken } from "@/lib/api"
import { listPayslips } from "@/services/payroll"
import { useAuthStore } from "@/store/auth-store"
import { Payslip } from "@/types/payroll"

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.data?.detail || error.message || "Unable to load payslips."
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return "Unable to load payslips."
}

async function downloadWithAuth(
  endpoint: string,
  filename: string
): Promise<void> {
  const token = getToken()
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    redirect: "manual",
  })

  if (response.status === 401) {
    removeToken()
    if (typeof window !== "undefined") window.location.href = "/login"
    throw new ApiClientError(401, { detail: "Unauthorized" })
  }

  if (
    response.status === 301 ||
    response.status === 302 ||
    response.status === 303 ||
    response.status === 307 ||
    response.status === 308
  ) {
    const redirectUrl = response.headers.get("Location")
    if (redirectUrl) {
      const anchor = document.createElement("a")
      anchor.href = redirectUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      return
    }
  }

  if (!response.ok) {
    let detail = response.statusText || "Download failed"
    try {
      const json = await response.json()
      if (json?.detail) detail = String(json.detail)
    } catch {
      try {
        const text = await response.text()
        if (text.trim()) detail = text.trim()
      } catch {}
    }
    throw new ApiClientError(response.status, { detail })
  }

  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = blobUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(blobUrl)
}

export default function PayslipsListPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [items, setItems] = useState<Payslip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const payslips = await listPayslips({ limit: 200, offset: 0 })
      setItems(payslips)
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

  const handleDownload = async (item: Payslip) => {
    setDownloadingId(item.id)
    try {
      await downloadWithAuth(
        `/api/v1/payroll/payslips/${item.id}/download`,
        item.file_name || `payslip-${item.salary_month}-${item.salary_year}.pdf`
      )
      toast({
        title: "Payslip download started",
        description: item.employee_name
          ? `Downloading ${item.employee_name}'s payslip.`
          : "Downloading payslip PDF.",
      })
    } catch (error) {
      toast({
        title: "Unable to download payslip",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <RequireRole allowedRoles={["HR", "ADMIN"]}>
      <PageContainer
        title="Payslips"
        description="Generate and review employee payslips after payroll publish."
      >
        <PayslipsTable
          items={items}
          isLoading={isLoading}
          errorMessage={errorMessage}
          downloadingId={downloadingId}
          onRefresh={fetchData}
          onDownload={handleDownload}
        />
      </PageContainer>
    </RequireRole>
  )
}
