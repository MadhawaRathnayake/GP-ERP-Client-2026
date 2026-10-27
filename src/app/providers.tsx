import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

import { TopBarActionsProvider } from "@/components/TopBarActions"
import { Toaster } from "@/components/ui/sonner"

const queryClient = new QueryClient()

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TopBarActionsProvider>
        {children}
        <Toaster />
      </TopBarActionsProvider>
    </QueryClientProvider>
  )
}
