"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { api, ApiClientError } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { CheckCircle2, XCircle } from "lucide-react"

function RuleRow({ ok, text }: { ok: boolean; text: string }) {
  const Icon = ok ? CheckCircle2 : XCircle
  const color = ok ? "text-emerald-600" : "text-muted-foreground"
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className={color}>{text}</span>
    </div>
  )
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { mustChangePassword, setMustChangePassword, initialize, initialized } = useAuthStore()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState("")

  useEffect(() => {
    if (!initialized) initialize()
  }, [initialized, initialize])

  const rules = useMemo(() => {
    return {
      length: newPassword.length >= 8,
      upper: /[A-Z]/.test(newPassword),
      number: /\d/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
      match: newPassword.length > 0 && newPassword === confirmPassword,
    }
  }, [newPassword, confirmPassword])

  const allOk = rules.length && rules.upper && rules.number && rules.special && rules.match

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError("")
    if (!allOk) return
    setSubmitting(true)
    try {
      await api.post("/api/v1/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setMustChangePassword(false)
      toast({
        title: "Password changed",
        description: mustChangePassword
          ? "Please sign in again with your new password."
          : "Your password has been updated successfully.",
      })
      // For must-change flow, force logout to re-authenticate
      if (mustChangePassword) {
        // Logout by clearing token and redirecting to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("acs_hrms_token")
          localStorage.removeItem("acs_hrms_must_change")
          window.location.href = "/login"
        }
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setApiError(err.data.detail || "Failed to change password")
      } else {
        setApiError("An unexpected error occurred")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            {mustChangePassword
              ? "You must set a new password before continuing."
              : "Update your password to keep your account secure."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={submitting}
              />
              <div className="grid grid-cols-2 gap-2 mt-1">
                <RuleRow ok={rules.length} text="At least 8 characters" />
                <RuleRow ok={rules.upper} text="At least one uppercase letter" />
                <RuleRow ok={rules.number} text="At least one number" />
                <RuleRow ok={rules.special} text="At least one special character" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={submitting}
              />
              {!rules.match && confirmPassword.length > 0 && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>
            {apiError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {apiError}
              </div>
            )}
            <div className="flex items-center justify-end gap-4">
              <Button type="submit" disabled={!allOk || submitting}>
                {submitting ? "Updating..." : "Change Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
