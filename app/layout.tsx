import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster as ShadcnToaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ACS HRMS Admin",
  description: "HR Management System Admin Panel",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <ShadcnToaster />
        <SonnerToaster richColors position="top-right" />
      </body>
    </html>
  )
}
