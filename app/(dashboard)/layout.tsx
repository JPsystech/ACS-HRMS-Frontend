"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { AuthGuard } from "@/components/auth-guard"
import { RoleGuard } from "@/components/role-guard"
import { ErrorBoundary } from "@/components/error-boundary"

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
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const allowedRoles = routePermissions[pathname]

  return (
    <AuthGuard>
      <ErrorBoundary>
        <div className="flex h-screen overflow-hidden">
          <aside className="w-64 flex-shrink-0">
            <Sidebar />
          </aside>
          <div className="flex-1 flex flex-col overflow-hidden">
            <Topbar />
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
        </div>
      </ErrorBoundary>
    </AuthGuard>
  )
}
