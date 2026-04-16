"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import { RequireRole } from "@/components/auth/RequireRole"
import { PayrollSettingsForm } from "@/components/payroll/payroll-settings-form"
import { PageContainer } from "@/components/ui/page-container"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ApiClientError } from "@/lib/api"
import { getPayrollSettings, updatePayrollSettings } from "@/services/payroll"
import { useAuthStore } from "@/store/auth-store"
import { PayrollSettings, PayrollSettingsUpdate } from "@/types/payroll"
import { ArrowRight } from "lucide-react"

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.data?.detail || error.message || "Unable to process payroll settings."
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return "Unable to process payroll settings."
}

export default function PayrollSettingsPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [settings, setSettings] = useState<PayrollSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await getPayrollSettings()
      setSettings(response)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && (user.role === "HR" || user.role === "ADMIN")) {
      fetchSettings()
    }
  }, [fetchSettings, user])

  const handleSubmit = async (payload: PayrollSettingsUpdate) => {
    setIsSaving(true)
    setErrorMessage(null)

    try {
      const updated = await updatePayrollSettings(payload)
      setSettings(updated)
      toast({
        title: "Payroll settings saved",
        description: "Payroll settings have been updated successfully.",
      })
    } catch (error) {
      const message = getErrorMessage(error)
      setErrorMessage(message)
      toast({
        title: "Unable to save payroll settings",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <RequireRole allowedRoles={["HR", "ADMIN"]}>
      <PageContainer
        title="Payroll Settings"
        description="Manage weekly off, office timings, late-rule, cutoff, and payroll scheduling rules for the admin payroll panel."
        action={
          <Button asChild variant="outline">
            <Link href="/admin/payroll/salary-master">
              Salary Master
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      >
        <PayrollSettingsForm
          settings={settings}
          isLoading={isLoading}
          isSaving={isSaving}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
        />
      </PageContainer>
    </RequireRole>
  )
}
