"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { ApiClientError } from "@/lib/api"
import { isAuthenticated } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const { login, initialize } = useAuthStore()
  const [empCode, setEmpCode] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    initialize()
    // If already authenticated, redirect to dashboard
    if (isAuthenticated()) {
      router.push("/dashboard")
    }
  }, [router, initialize])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      let response = await api.post<{ access_token: string; token_type: string }>(
        "/api/v1/auth/login-admin",
        {
          emp_code: empCode,
          password: password,
        }
      )

      login(response.access_token)
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        try {
          const response = await api.post<{ access_token: string; token_type: string }>(
            "/api/v1/auth/login",
            {
              emp_code: empCode,
              password: password,
            }
          )
          login(response.access_token)
          router.push("/dashboard")
          router.refresh()
          return
        } catch (fallbackErr) {
          if (fallbackErr instanceof ApiClientError) {
            setError(fallbackErr.data.detail || "Login failed")
          } else {
            setError("An unexpected error occurred")
          }
        }
      } else if (err instanceof ApiClientError) {
        setError(err.data.detail || "Login failed")
      } else {
        setError("An unexpected error occurred")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-8">
            <div className="relative h-24 w-[300px]">
              <Image
                src="/images/ACS-logo.png"
                alt="Akshar Consultancy Services"
                fill
                priority
                className="object-contain"
                sizes="300px"
              />
            </div>
          </div>
          <CardDescription className="text-center">
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emp_code">Employee Code</Label>
              <Input
                id="emp_code"
                type="text"
                placeholder="Enter your employee code"
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
