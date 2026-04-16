"use client"

import { useState } from "react"
import { useAuthStore } from "@/store/auth-store"
import { api, ApiClientError, API_BASE_URL, getToken } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

/**
 * Debug panel for development environment
 * Shows API configuration and allows testing backend connectivity
 * Only visible to HR role
 */
export function DebugPanel() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [pinging, setPinging] = useState(false)

  // Only show to HR in development
  if (
    process.env.NODE_ENV === "production" ||
    user?.role !== "HR"
  ) {
    return null
  }

  const token = getToken()
  const hasToken = !!token

  const handlePing = async () => {
    setPinging(true)
    try {
      const response = await api.get<{ status: string; service: string }>(
        "/api/v1/version"
      )
      toast({
        title: "Backend Connected",
        description: `Service: ${response.service || "Unknown"}`,
      })
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast({
          variant: "destructive",
          title: "Backend Error",
          description: err.data.detail || `Status: ${err.status}`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: "Could not reach backend. Check if server is running.",
        })
      }
    } finally {
      setPinging(false)
    }
  }

  return (
    <Card className="mt-8 border-dashed">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          🔧 Debug Panel (Dev Only)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">API Base URL:</span>
          <Badge variant="outline">{API_BASE_URL}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Token:</span>
          <Badge variant={hasToken ? "default" : "destructive"}>
            {hasToken ? "Present" : "Missing"}
          </Badge>
        </div>
        <div className="pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePing}
            disabled={pinging}
          >
            {pinging ? "Pinging..." : "Ping Backend"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
