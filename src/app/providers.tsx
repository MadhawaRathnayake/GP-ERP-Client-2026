import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

import { Toaster } from "@/components/ui/sonner"
import { PageActionsProvider } from "@/hooks/usePageActions"

const queryClient = new QueryClient()

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PageActionsProvider>
        {children}
        <Toaster />
      </PageActionsProvider>
    </QueryClientProvider>
  )
}
