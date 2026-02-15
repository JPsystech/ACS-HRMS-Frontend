import { create } from "zustand"
import { User, getCurrentUser, setToken, removeToken, isAuthenticated } from "@/lib/auth"

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  initialized: boolean
  setUser: (user: User | null) => void
  login: (token: string) => void
  logout: () => void
  initialize: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  initialized: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  login: (token) => {
    setToken(token)
    const user = getCurrentUser()
    set({ user, isAuthenticated: !!user, initialized: true })
  },
  logout: () => {
    removeToken()
    set({ user: null, isAuthenticated: false, initialized: false })
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
  },
  initialize: () => {
    // Prevent multiple initializations
    if (get().initialized) {
      return
    }
    
    if (isAuthenticated()) {
      const user = getCurrentUser()
      set({ user, isAuthenticated: !!user, initialized: true })
    } else {
      set({ user: null, isAuthenticated: false, initialized: true })
    }
  },
}))
