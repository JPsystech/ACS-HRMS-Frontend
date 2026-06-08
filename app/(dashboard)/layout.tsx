"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { AuthGuard } from "@/components/auth-guard"
import { MustChangeGuard } from "@/components/must-change-guard"
import { RoleGuard } from "@/components/role-guard"
import { ErrorBoundary } from "@/components/error-boundary"
import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

// Route permission mapping based on sidebar configuration
const routePermissions: Record<string, string[] | undefined> = {
  "/departments": ["HR", "ADMIN"],
  "/roles": ["HR", "ADMIN"],
  "/employees": ["HR", "ADMIN"],
  "/admin/payroll/runs": ["HR", "ADMIN"],
  "/admin/payroll/settings": ["HR", "ADMIN"],
  "/admin/payroll/salary-master": ["HR", "ADMIN"],
  "/admin/payroll/salary-master/new": ["HR", "ADMIN"],
  "/leaves/pending-approvals": ["ADMIN", "MD", "VP", "MANAGER"],
  "/leave-balances": ["HR", "ADMIN", "MD", "VP", "MANAGER"],
  "/wfh-balances": ["HR", "ADMIN", "MD", "VP", "MANAGER"],
  "/wfh": ["HR", "ADMIN", "MD", "VP", "MANAGER"],
  "/accrual": ["HR", "ADMIN"],
  "/policy": ["HR", "ADMIN"],
  "/calendars/events": ["HR", "ADMIN"],
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const allowedRoles = routePermissions[pathname]
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <AuthGuard>
      <ErrorBoundary>
        <MustChangeGuard>
          <div className="flex h-screen overflow-hidden">
            {/* Desktop sidebar (>= lg) */}
            <aside className="hidden lg:block flex-shrink-0">
              <Sidebar />
            </aside>
            {/* Tablet sidebar (md to <lg) collapsed by default */}
            <aside className="hidden md:block lg:hidden flex-shrink-0">
              <Sidebar initialCollapsed />
            </aside>
            <div className="flex-1 flex flex-col overflow-hidden">
              <Topbar onMenuClick={() => setMobileOpen(true)} />
              <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/80 via-slate-50 to-purple-50/80 dark:from-indigo-950/20 dark:via-slate-950 dark:to-purple-950/20 p-6 relative">
                {/* Global decorative background element */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
                {allowedRoles ? (
                  <RoleGuard allowedRoles={allowedRoles as any}>
                    {children}
                  </RoleGuard>
                ) : (
                  children
                )}
              </main>
            </div>
            {/* Mobile drawer sidebar */}
            <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
              <DialogContent className="p-0 max-w-[85vw] md:max-w-[60vw] h-[100vh] max-h-[100vh] left-0 top-0 translate-x-0 translate-y-0 overflow-hidden">
                <div className="h-full w-full overflow-y-auto">
                  <Sidebar initialCollapsed={false} onNavigate={() => setMobileOpen(false)} />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </MustChangeGuard>
      </ErrorBoundary>
    </AuthGuard>
  )
}
