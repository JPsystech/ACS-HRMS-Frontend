"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Mail, Save } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { EmailSettings, EmailSettingsUpdate } from "@/types/payroll"

type EmailSettingsFormValues = {
  provider_name: string
  sender_name: string
  sender_email: string
  smtp_host: string
  smtp_port: string
  smtp_username: string
  smtp_password: string
  use_tls: boolean
  use_ssl: boolean
  reply_to_email: string
  is_active: boolean
  test_to_email: string
}

type ValidationErrors = Partial<Record<keyof EmailSettingsFormValues, string>>

type EmailSettingsFormProps = {
  settings: EmailSettings | null
  isLoading: boolean
  isSaving: boolean
  isTesting: boolean
  errorMessage: string | null
  onRetry: () => void
  onSave: (payload: EmailSettingsUpdate) => Promise<void>
  onTestEmail: (toEmail: string) => Promise<void>
}

const defaultFormState: EmailSettingsFormValues = {
  provider_name: "",
  sender_name: "",
  sender_email: "",
  smtp_host: "",
  smtp_port: "587",
  smtp_username: "",
  smtp_password: "",
  use_tls: true,
  use_ssl: false,
  reply_to_email: "",
  is_active: true,
  test_to_email: "",
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-destructive">{message}</p>
}

function isLikelyEmail(value: string) {
  const normalized = value.trim()
  return normalized.includes("@") && normalized.includes(".")
}

function mapSettingsToForm(settings: EmailSettings): EmailSettingsFormValues {
  return {
    provider_name: settings.provider_name ?? "",
    sender_name: settings.sender_name ?? "",
    sender_email: settings.sender_email ?? "",
    smtp_host: settings.smtp_host ?? "",
    smtp_port: String(settings.smtp_port ?? 587),
    smtp_username: settings.smtp_username ?? "",
    smtp_password: "",
    use_tls: Boolean(settings.use_tls),
    use_ssl: Boolean(settings.use_ssl),
    reply_to_email: settings.reply_to_email ?? "",
    is_active: Boolean(settings.is_active),
    test_to_email: "",
  }
}

function validateForm(
  data: EmailSettingsFormValues,
  options: { passwordRequired: boolean; validateTestEmail: boolean }
): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!data.provider_name.trim()) errors.provider_name = "Provider name is required."
  if (!data.sender_name.trim()) errors.sender_name = "Sender name is required."
  if (!data.sender_email.trim()) errors.sender_email = "Sender email is required."
  if (data.sender_email.trim() && !isLikelyEmail(data.sender_email)) {
    errors.sender_email = "Enter a valid sender email address."
  }

  if (!data.smtp_host.trim()) errors.smtp_host = "SMTP host is required."

  const port = Number(data.smtp_port)
  if (!data.smtp_port.trim()) {
    errors.smtp_port = "SMTP port is required."
  } else if (!Number.isFinite(port) || port < 1 || port > 65535) {
    errors.smtp_port = "Enter a valid port between 1 and 65535."
  }

  if (!data.smtp_username.trim()) errors.smtp_username = "SMTP username is required."

  if (data.use_tls && data.use_ssl) {
    errors.use_tls = "TLS and SSL cannot both be enabled."
    errors.use_ssl = "TLS and SSL cannot both be enabled."
  }

  if (data.reply_to_email.trim() && !isLikelyEmail(data.reply_to_email)) {
    errors.reply_to_email = "Enter a valid reply-to email address."
  }

  if (options.passwordRequired && !data.smtp_password.trim()) {
    errors.smtp_password = "SMTP password is required."
  }

  if (options.validateTestEmail) {
    if (!data.test_to_email.trim()) errors.test_to_email = "Test email address is required."
    if (data.test_to_email.trim() && !isLikelyEmail(data.test_to_email)) {
      errors.test_to_email = "Enter a valid test email address."
    }
  }

  return errors
}

export function EmailSettingsForm({
  settings,
  isLoading,
  isSaving,
  isTesting,
  errorMessage,
  onRetry,
  onSave,
  onTestEmail,
}: EmailSettingsFormProps) {
  const [formData, setFormData] = useState<EmailSettingsFormValues>(defaultFormState)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  useEffect(() => {
    if (settings) {
      setFormData(mapSettingsToForm(settings))
      setValidationErrors({})
      return
    }
    setFormData((prev) => ({
      ...defaultFormState,
      provider_name: prev.provider_name,
      sender_name: prev.sender_name,
      sender_email: prev.sender_email,
      smtp_host: prev.smtp_host,
      smtp_port: prev.smtp_port,
      smtp_username: prev.smtp_username,
      use_tls: prev.use_tls,
      use_ssl: prev.use_ssl,
      reply_to_email: prev.reply_to_email,
      is_active: prev.is_active,
      test_to_email: prev.test_to_email,
      smtp_password: "",
    }))
  }, [settings])

  const hasSettings = useMemo(() => settings !== null, [settings])
  const passwordRequired = useMemo(() => !(settings?.smtp_password_set ?? false), [settings?.smtp_password_set])
  const isBusy = isSaving || isTesting

  const updateField = <K extends keyof EmailSettingsFormValues>(key: K, value: EmailSettingsFormValues[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setValidationErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateForm(formData, { passwordRequired, validateTestEmail: false })
    setValidationErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const port = Number(formData.smtp_port)
    await onSave({
      provider_name: formData.provider_name.trim(),
      sender_name: formData.sender_name.trim(),
      sender_email: formData.sender_email.trim(),
      smtp_host: formData.smtp_host.trim(),
      smtp_port: port,
      smtp_username: formData.smtp_username.trim(),
      smtp_password: formData.smtp_password.trim() ? formData.smtp_password : undefined,
      use_tls: formData.use_tls,
      use_ssl: formData.use_ssl,
      reply_to_email: formData.reply_to_email.trim() ? formData.reply_to_email.trim() : null,
      is_active: formData.is_active,
    })

    updateField("smtp_password", "")
  }

  const handleTestEmail = async () => {
    const nextErrors = validateForm(formData, { passwordRequired: false, validateTestEmail: true })
    setValidationErrors((prev) => ({ ...prev, ...nextErrors }))
    if (Object.keys(nextErrors).length > 0) return

    await onTestEmail(formData.test_to_email.trim())
  }

  if (isLoading && !hasSettings) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Email Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Email Settings</CardTitle>
          <div className="flex items-center gap-2">
            {settings?.smtp_password_set ? (
              <Badge variant="secondary">Password set</Badge>
            ) : (
              <Badge variant="outline">Password not set</Badge>
            )}
            {settings?.is_active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure SMTP provider details for payroll reminder emails and verify delivery with a test message.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-8" onSubmit={handleSave}>
          {errorMessage ? (
            <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
              <span className="leading-6">{errorMessage}</span>
              <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={isBusy}>
                Retry
              </Button>
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider_name">Provider Name</Label>
              <Input
                id="provider_name"
                value={formData.provider_name}
                onChange={(event) => updateField("provider_name", event.target.value)}
                disabled={isBusy}
              />
              <FieldError message={validationErrors.provider_name} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sender_name">Sender Name</Label>
              <Input
                id="sender_name"
                value={formData.sender_name}
                onChange={(event) => updateField("sender_name", event.target.value)}
                disabled={isBusy}
              />
              <FieldError message={validationErrors.sender_name} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sender_email">Sender Email</Label>
              <Input
                id="sender_email"
                type="email"
                value={formData.sender_email}
                onChange={(event) => updateField("sender_email", event.target.value)}
                disabled={isBusy}
              />
              <FieldError message={validationErrors.sender_email} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reply_to_email">Reply-to Email</Label>
              <Input
                id="reply_to_email"
                type="email"
                value={formData.reply_to_email}
                onChange={(event) => updateField("reply_to_email", event.target.value)}
                disabled={isBusy}
              />
              <FieldError message={validationErrors.reply_to_email} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_host">SMTP Host</Label>
              <Input
                id="smtp_host"
                value={formData.smtp_host}
                onChange={(event) => updateField("smtp_host", event.target.value)}
                disabled={isBusy}
              />
              <FieldError message={validationErrors.smtp_host} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_port">SMTP Port</Label>
              <Input
                id="smtp_port"
                inputMode="numeric"
                value={formData.smtp_port}
                onChange={(event) => updateField("smtp_port", event.target.value)}
                disabled={isBusy}
              />
              <FieldError message={validationErrors.smtp_port} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_username">SMTP Username</Label>
              <Input
                id="smtp_username"
                value={formData.smtp_username}
                onChange={(event) => updateField("smtp_username", event.target.value)}
                disabled={isBusy}
              />
              <FieldError message={validationErrors.smtp_username} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_password">SMTP Password</Label>
              <Input
                id="smtp_password"
                type="password"
                value={formData.smtp_password}
                onChange={(event) => updateField("smtp_password", event.target.value)}
                disabled={isBusy}
                placeholder={settings?.smtp_password_set ? "Leave blank to keep existing password" : ""}
              />
              <FieldError message={validationErrors.smtp_password} />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex items-center justify-between gap-4 rounded-md border px-4 py-3">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Use TLS</p>
                <p className="text-sm text-muted-foreground">StartTLS on the SMTP connection.</p>
              </div>
              <Switch checked={formData.use_tls} onCheckedChange={(value) => updateField("use_tls", value)} disabled={isBusy} />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border px-4 py-3">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Use SSL</p>
                <p className="text-sm text-muted-foreground">Connect using implicit SSL/TLS.</p>
              </div>
              <Switch checked={formData.use_ssl} onCheckedChange={(value) => updateField("use_ssl", value)} disabled={isBusy} />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border px-4 py-3">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Active</p>
                <p className="text-sm text-muted-foreground">Use this configuration for sending payroll emails.</p>
              </div>
              <Switch checked={formData.is_active} onCheckedChange={(value) => updateField("is_active", value)} disabled={isBusy} />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="submit" disabled={isBusy}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Settings
            </Button>
          </div>

          <div className="rounded-md border bg-muted/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full space-y-2 sm:max-w-md">
                <Label htmlFor="test_to_email">Test Email Address</Label>
                <Input
                  id="test_to_email"
                  type="email"
                  value={formData.test_to_email}
                  onChange={(event) => updateField("test_to_email", event.target.value)}
                  disabled={isBusy}
                  placeholder="person@example.com"
                />
                <FieldError message={validationErrors.test_to_email} />
              </div>

              <Button type="button" variant="outline" onClick={handleTestEmail} disabled={isBusy}>
                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Send Test Email
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

