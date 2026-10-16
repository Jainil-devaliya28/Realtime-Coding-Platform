"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "react-hot-toast"
import { useState } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#131b2e",
            color: "#e2e8f0",
            border: "1px solid #1e2d45",
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#4ade80", secondary: "#131b2e" } },
          error: { iconTheme: { primary: "#f87171", secondary: "#131b2e" } },
        }}
      />
    </QueryClientProvider>
  )
}
