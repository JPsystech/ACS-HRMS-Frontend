import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Role } from "@/types/models"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Role utility functions
export function isAdmin(role?: Role | null): boolean {
  return role === "ADMIN"
}

export function hasRoleAccess(
  userRole: Role | undefined | null,
  allowedRoles: Role[] | undefined
): boolean {
  // If no roles are specified, allow access
  if (!allowedRoles) return true
  
  // If user is admin, allow access to everything
  if (isAdmin(userRole)) return true
  
  // Check if user role is in allowed roles
  return userRole ? allowedRoles.includes(userRole) : false
}
