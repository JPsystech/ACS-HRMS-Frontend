"use client"

import { motion } from "framer-motion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table"
import { cn } from "@/lib/utils"

interface AnimatedTableProps {
  children: React.ReactNode
  className?: string
}

export function AnimatedTable({ children, className }: AnimatedTableProps) {
  return (
    <div className={cn("rounded-md border", className)}>
      <Table>{children}</Table>
    </div>
  )
}

interface AnimatedTableRowProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function AnimatedTableRow({
  children,
  className,
  delay = 0,
}: AnimatedTableRowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.2 }}
      whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}
      className={cn("border-b transition-colors", className)}
    >
      {children}
    </motion.tr>
  )
}

// Re-export table components for convenience
export {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
}
