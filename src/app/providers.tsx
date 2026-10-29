import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

import { loginPath } from "@/app/auth"
import { TopBarActionsProvider } from "@/components/TopBarActions"
import { Toaster } from "@/components/ui/sonner"
import { ApiError, http } from "@/lib/http"
import { router } from "@/router"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 4xx answers (signed out, no access, not found, bad input) won't change on a retry.
      retry: (failureCount, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
})

http.interceptors.response.use(undefined, (error: unknown) => {
  if (error instanceof ApiError) {
    // Session ended mid-use (idle, deactivated, password reset). /auth/* answers are handled by the login page and
    // AppLayout; skipping /login stops a loop and lets parallel 401s (e.g. fetchAll pages) redirect only once.
    const { pathname, search } = router.state.location
    if (error.status === 401 && !error.requestPath?.startsWith("/auth/") && pathname !== "/login") {
      void router.navigate(loginPath(pathname + search), { replace: true })
      queryClient.clear()
    }
    // The user's role may have changed; reload their permissions.
    if (error.status === 403) void queryClient.invalidateQueries({ queryKey: ["me"] })
  }
  return Promise.reject(error)
})

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
