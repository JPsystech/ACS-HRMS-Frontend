"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: ReactNode
  title?: string
  description?: string
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
        <div className="flex items-start justify-between">
          <div>
            {title && <h1 className="text-3xl font-bold tracking-tight">{title}</h1>}
            {description && (
              <p className="text-muted-foreground mt-2">{description}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </motion.div>
  )
}
