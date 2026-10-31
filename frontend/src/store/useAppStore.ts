import { create } from "zustand"
import { SSEProgressPayload } from "@/types"

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
}

export const useAppStore = create<AppState>((set) => ({
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
}))
