import { create } from "zustand"
import { SSEProgressPayload } from "@/types"

export type ThemeMode = "light" | "dark" | "system"

export function applyTheme(theme: ThemeMode) {
  if (typeof window === "undefined") return
  const root = document.documentElement
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  if (isDark) {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }

  try {
    localStorage.setItem("proofpath_theme", theme)
  } catch (e) {
    // LocalStorage might be disabled in private mode
  }
}

// Get initial theme preference
const initialTheme: ThemeMode =
  typeof window !== "undefined"
    ? ((localStorage.getItem("proofpath_theme") as ThemeMode) || "light")
    : "light"

// Apply theme on file evaluation
if (typeof window !== "undefined") {
  applyTheme(initialTheme)

  // Listen for system theme changes if user has 'system' theme selected
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const currentStored = localStorage.getItem("proofpath_theme") as ThemeMode
    if (currentStored === "system") {
      applyTheme("system")
    }
  })
}

interface AppState {
  currentSessionId: string | null
  setCurrentSessionId: (id: string | null) => void
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void
  liveProgress: SSEProgressPayload | null
  setLiveProgress: (payload: SSEProgressPayload | null) => void
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  currentSessionId: null,
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
  liveProgress: null,
  setLiveProgress: (payload) => set({ liveProgress: payload }),
  theme: initialTheme,
  setTheme: (newTheme) => {
    applyTheme(newTheme)
    set({ theme: newTheme })
  },
  toggleTheme: () => {
    const current = get().theme
    const nextTheme: ThemeMode = current === "dark" ? "light" : "dark"
    applyTheme(nextTheme)
    set({ theme: nextTheme })
  },
}))
