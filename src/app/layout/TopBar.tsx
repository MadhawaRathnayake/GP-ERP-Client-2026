import { PlusIcon, SearchIcon } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"

import { ProfileMenu } from "@/app/layout/ProfileMenu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePageActionsState } from "@/hooks/usePageActions"

export function TopBar() {
  const { search, create } = usePageActionsState()
  const [searchParams, setSearchParams] = useSearchParams()

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-6">
      {search && (
        <div className="relative w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search…"
            aria-label="Search"
            className="pl-8"
            value={searchParams.get("q") ?? ""}
            onChange={(event) => {
              const q = event.target.value
              setSearchParams(q ? { q } : {}, { replace: true })
            }}
          />
        </div>
      )}
      {create && (
        <Button asChild>
          <Link to="/items/new">
            <PlusIcon />
            Create new
          </Link>
        </Button>
      )}
      <ProfileMenu />
    </header>
  )
}
