import { create } from "zustand"
import { SSEProgressPayload } from "@/types"

interface AppState {
  currentSessionId: string | null
  setCurrentSessionId: (id: string | null) => void
  sidebarOpen: boolean
  toggleSidebar: () => void
  liveProgress: SSEProgressPayload | null
  setLiveProgress: (payload: SSEProgressPayload | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentSessionId: null,
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  liveProgress: null,
  setLiveProgress: (payload) => set({ liveProgress: payload }),
}))
