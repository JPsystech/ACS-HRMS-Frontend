import { create } from "zustand"
import { User, getCurrentUser, setToken, removeToken, isAuthenticated } from "@/lib/auth"

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  initialized: boolean
  mustChangePassword: boolean
  setUser: (user: User | null) => void
  login: (token: string, mustChangePassword?: boolean) => void
  logout: () => void
  setMustChangePassword: (flag: boolean) => void
  initialize: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  initialized: false,
  mustChangePassword: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  login: (token, mustChangePassword) => {
    setToken(token)
    if (typeof window !== "undefined") {
      if (typeof mustChangePassword === "boolean") {
        localStorage.setItem("acs_hrms_must_change", mustChangePassword ? "1" : "0")
      }
    }
    const user = getCurrentUser()
    const mustChange =
      typeof mustChangePassword === "boolean"
        ? mustChangePassword
        : (typeof window !== "undefined" && localStorage.getItem("acs_hrms_must_change") === "1")
    set({ user, isAuthenticated: !!user, initialized: true, mustChangePassword: !!mustChange })
  },
  logout: () => {
    removeToken()
    if (typeof window !== "undefined") {
      localStorage.removeItem("acs_hrms_must_change")
    }
    set({ user: null, isAuthenticated: false, initialized: false, mustChangePassword: false })
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
  },
  setMustChangePassword: (flag: boolean) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("acs_hrms_must_change", flag ? "1" : "0")
    }
    set({ mustChangePassword: flag })
  },
  initialize: () => {
    // Prevent multiple initializations
    if (get().initialized) {
      return
    }
    
    if (isAuthenticated()) {
      const user = getCurrentUser()
      const mustChange =
        typeof window !== "undefined" && localStorage.getItem("acs_hrms_must_change") === "1"
      set({ user, isAuthenticated: !!user, initialized: true, mustChangePassword: mustChange })
    } else {
      set({ user: null, isAuthenticated: false, initialized: true, mustChangePassword: false })
    }
  },
}))
