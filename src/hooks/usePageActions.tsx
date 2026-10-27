import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export interface PageActions {
  search?: boolean
  create?: boolean
}

const PageActionsContext = createContext<PageActions>({})
const SetPageActionsContext = createContext<(actions: PageActions) => void>(() => {})

export function PageActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<PageActions>({})
  return (
    <SetPageActionsContext.Provider value={setActions}>
      <PageActionsContext.Provider value={actions}>{children}</PageActionsContext.Provider>
    </SetPageActionsContext.Provider>
  )
}

// Declares the top-bar actions for the calling page; they reset when the page unmounts.
export function usePageActions({ search, create }: PageActions) {
  const setActions = useContext(SetPageActionsContext)
  useEffect(() => {
    setActions({ search, create })
    return () => setActions({})
  }, [setActions, search, create])
}

export function usePageActionsState() {
  return useContext(PageActionsContext)
}
