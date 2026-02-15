"use client"

import { useAuthStore } from "@/store/auth-store"
import { Button } from "@/components/ui/button"
import { LogOut, User, ChevronRight } from "lucide-react"
import { usePathname } from "next/navigation"
import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

// Breadcrumb mapping
const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/departments": "Departments",
  "/employees": "Employees",
  "/attendance": "Attendance",
  "/leaves": "Leaves",
  "/leave-balances": "Leave Balances",
  "/calendars/holidays": "Holidays",
  "/calendars/restricted-holidays": "Restricted Holidays",
  "/compoff": "Comp Off",
  "/accrual": "Accrual",
  "/policy": "Policy",
  "/reports": "Reports",
}

function getBreadcrumbs(pathname: string): string[] {
  const paths = pathname.split("/").filter(Boolean)
  const breadcrumbs = ["Dashboard"]
  
  if (paths.length === 0) return breadcrumbs
  
  let currentPath = ""
  for (const path of paths) {
    currentPath += `/${path}`
    const label = breadcrumbMap[currentPath] || path.charAt(0).toUpperCase() + path.slice(1)
    breadcrumbs.push(label)
  }
  
  return breadcrumbs
}

export function Topbar() {
  const { user, logout } = useAuthStore()
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const getInitials = (name?: string, code?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return code?.slice(0, 2).toUpperCase() || "U"
  }

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "sticky top-0 z-50 h-16 border-b bg-white/80 backdrop-blur-md transition-shadow",
        scrolled && "shadow-sm"
      )}
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "transition-colors",
                    index === breadcrumbs.length - 1
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 h-auto py-2 px-3 rounded-lg hover:bg-muted"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs font-semibold">
                      {getInitials(user.emp_code)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium">{user.emp_code}</span>
                    <span className="text-xs text-muted-foreground">{user.role}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.emp_code}</p>
                    <p className="text-xs text-muted-foreground">{user.role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </motion.header>
  )
}
