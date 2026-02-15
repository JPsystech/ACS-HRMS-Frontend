"use client"

import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  description?: string
  trend?: {
    value: number
    label: string
  }
  gradient?: "blue" | "green" | "amber" | "indigo" | "purple"
  delay?: number
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  gradient = "indigo",
  delay = 0,
}: StatCardProps) {
  const gradients = {
    blue: "from-blue-500/20 to-cyan-500/20",
    green: "from-green-500/20 to-emerald-500/20",
    amber: "from-amber-500/20 to-orange-500/20",
    indigo: "from-indigo-500/20 to-purple-500/20",
    purple: "from-purple-500/20 to-pink-500/20",
  }

  const iconColors = {
    blue: "text-blue-600",
    green: "text-green-600",
    amber: "text-amber-600",
    indigo: "text-indigo-600",
    purple: "text-purple-600",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ y: -2 }}
    >
      <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
        {/* Gradient accent bar */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
            gradients[gradient]
          )}
        />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={cn("p-2 rounded-lg bg-muted/50", iconColors[gradient])}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.value >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {trend.value >= 0 ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
