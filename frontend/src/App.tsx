import React from "react"
import { RouterProvider } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { router } from "@/routes"
import { SplashScreen } from "@/components/common/SplashScreen"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SplashScreen durationMs={5000} />
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

export default App
