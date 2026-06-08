"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: ReactNode
  title?: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

const pageVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
}

export function PageContainer({
  children,
  title,
  description,
  action,
  className,
}: PageContainerProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2 }}
      className={cn("space-y-6", className)}
    >
      {(title || description || action) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
          <div>
            {title && (
              <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400">
                {title}
              </h1>
            )}
            {description && (
              <div className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">
                {description}
              </div>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </motion.div>
  )
}
