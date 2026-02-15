/**
 * Attendance display formatting.
 * API returns timestamps in UTC (ISO-8601 with Z). We display them in IST (Asia/Kolkata)
 * so times are consistent regardless of the user's browser timezone.
 */
import { parseISO } from "date-fns"

const IST = "Asia/Kolkata"

/**
 * Format an ISO-8601 timestamp (UTC, e.g. from API) as "DD MMM YYYY, HH:mm" in Asia/Kolkata.
 * Use for punch_in_at, punch_out_at, created_at, etc.
 */
export function formatDateTimeIST(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    const d = parseISO(iso)
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: IST,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d)
  } catch {
    return iso
  }
}

/**
 * Format worked duration from backend worked_minutes (computed from punch_out_at - punch_in_at in UTC).
 */
export function formatWorkedHours(minutes: number | null | undefined): string {
  if (minutes == null) return "—"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}
