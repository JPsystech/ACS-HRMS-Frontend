"use client"

import { useCallback, useEffect, useState } from "react"

import { RequireRole } from "@/components/auth/RequireRole"
import { EmailSettingsForm } from "@/components/payroll/email-settings-form"
import { PageContainer } from "@/components/ui/page-container"
import { useToast } from "@/hooks/use-toast"
import { ApiClientError } from "@/lib/api"
import {
  getPayrollEmailSettings,
  testPayrollEmailSettings,
  updatePayrollEmailSettings,
} from "@/services/payroll"
import { useAuthStore } from "@/store/auth-store"
import { EmailSettings, EmailSettingsUpdate } from "@/types/payroll"

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.data?.detail || error.message || "Unable to process email settings."
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return "Unable to process email settings."
}

export default function PayrollEmailSettingsPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [settings, setSettings] = useState<EmailSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await getPayrollEmailSettings()
      setSettings(response)
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        setSettings(null)
        setErrorMessage(null)
        return
      }
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

  const handleSave = async (payload: EmailSettingsUpdate) => {
    setIsSaving(true)
    setErrorMessage(null)

    try {
      const updated = await updatePayrollEmailSettings(payload)
      setSettings(updated)
      toast({
        title: "Email settings saved",
        description: "SMTP settings have been updated successfully.",
      })
    } catch (error) {
      const message = getErrorMessage(error)
      setErrorMessage(message)
      toast({
        title: "Unable to save email settings",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestEmail = async (toEmail: string) => {
    setIsTesting(true)
    setErrorMessage(null)

    try {
      const result = await testPayrollEmailSettings({ to_email: toEmail })
      toast({
        title: "Test email sent",
        description: result.provider_message_id
          ? `Provider message id: ${result.provider_message_id}`
          : "Email was accepted for delivery.",
      })
    } catch (error) {
      const message = getErrorMessage(error)
      setErrorMessage(message)
      toast({
        title: "Unable to send test email",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <RequireRole allowedRoles={["HR", "ADMIN"]}>
      <PageContainer
        title="Payroll Email Settings"
        description="Manage SMTP provider settings used to send payroll reminder emails."
      >
        <EmailSettingsForm
          settings={settings}
          isLoading={isLoading}
          isSaving={isSaving}
          isTesting={isTesting}
          errorMessage={errorMessage}
          onRetry={fetchSettings}
          onSave={handleSave}
          onTestEmail={handleTestEmail}
        />
      </PageContainer>
    </RequireRole>
  )
}

