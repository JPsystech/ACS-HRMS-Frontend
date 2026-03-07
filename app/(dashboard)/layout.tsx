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
  "/leaves/pending-approvals": ["ADMIN", "MD", "VP", "MANAGER"],
  "/leave-balances": ["HR", "ADMIN", "MANAGER"],
  "/wfh-balances": ["HR", "ADMIN", "MANAGER"],
  "/wfh": ["HR", "MANAGER"],
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
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <Sidebar />
            </aside>
            {/* Tablet sidebar (md to <lg) collapsed by default */}
            <aside className="hidden md:block lg:hidden w-20 flex-shrink-0">
              <Sidebar initialCollapsed />
            </aside>
            <div className="flex-1 flex flex-col overflow-hidden">
              <Topbar onMenuClick={() => setMobileOpen(true)} />
              <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
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
