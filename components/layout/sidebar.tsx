"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthStore } from "@/store/auth-store"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Building2,
  Users,
  Clock,
  Calendar,
  CalendarDays,
  CalendarCheck,
  FileText,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Layers,
} from "lucide-react"

import { Role } from "@/types/models"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: Role[]
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Departments",
    href: "/departments",
    icon: Building2,
    roles: ["HR", "ADMIN"],
  },
  {
    title: "Roles",
    href: "/roles",
    icon: Settings,
    roles: ["HR", "ADMIN"],
  },
  {
    title: "Employees",
    href: "/employees",
    icon: Users,
    roles: ["HR", "ADMIN"],
  },
  {
    title: "Attendance",
    href: "/attendance",
    icon: Clock,
  },
  {
    title: "Leaves",
    href: "/leaves",
    icon: Calendar,
  },
  {
    title: "Pending Approvals",
    href: "/leaves/pending-approvals",
    icon: CheckCircle,
    roles: ["ADMIN", "MD", "VP", "MANAGER"],
  },
  {
    title: "Leave Balances",
    href: "/leave-balances",
    icon: Layers,
    roles: ["HR", "ADMIN", "MANAGER"],
  },
  {
    title: "WFH Balances",
    href: "/wfh-balances",
    icon: Layers,
    roles: ["HR", "ADMIN", "MANAGER"],
  },
  {
    title: "Holidays",
    href: "/calendars/holidays",
    icon: CalendarDays,
  },
  {
    title: "Restricted Holidays",
    href: "/calendars/restricted-holidays",
    icon: CalendarCheck,
  },
  {
    title: "Comp Off",
    href: "/compoff",
    icon: FileText,
  },
  {
    title: "WFH",
    href: "/wfh",
    icon: Clock,
    roles: ["HR", "MANAGER"],
  },
  {
    title: "Accrual",
    href: "/accrual",
    icon: Settings,
    roles: ["HR", "ADMIN"],
  },
  {
    title: "Policy",
    href: "/policy",
    icon: Settings,
    roles: ["HR", "ADMIN"],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  // Helper function to check if user is admin
  const isAdmin = user?.role === "ADMIN"

  const filteredNavItems = navItems.filter((item) => {
    // If user is admin, show all navigation items
    if (isAdmin) return true
    
    if (!item.roles) return true
    const role: Role = (user?.role as Role) ?? "EMPLOYEE"
    return item.roles.includes(role)
  })

  return (
    <motion.div
      initial={false}
      animate={{
        width: collapsed ? 80 : 256,
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative flex flex-col h-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white border-r border-slate-800"
    >
      {/* Logo/Brand Section */}
      <div className="px-5 py-4 border-b border-slate-800/50">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative h-16 w-full mx-auto">
                <Image
                  src="/images/ACS-logo.png"
                  alt="Akshar Consultancy Services"
                  fill
                  priority
                  className="object-contain"
                  sizes="(max-width: 256px) 100vw, 256px"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex justify-center"
            >
              <div className="relative w-14 h-14">
                <Image
                  src="/images/ACS-logo.png"
                  alt="Akshar Consultancy Services"
                  fill
                  className="object-contain"
                  sizes="56px"
                  priority
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredNavItems.map((item, index) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={item.href}>
                <motion.div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative group",
                    isActive
                      ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white shadow-lg shadow-indigo-500/20"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                  )}
                  whileHover={{ x: collapsed ? 0 : 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Active indicator glow */}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-purple-400 rounded-r-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="font-medium truncate"
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            </motion.div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800/50">
        <AnimatePresence>
          {!collapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-slate-400 text-center"
            >
              Developed & Designed by JPSystech
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shadow-lg"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </motion.div>
  )
}
