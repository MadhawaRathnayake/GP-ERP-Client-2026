import { SearchIcon } from "lucide-react"
import { useSearchParams } from "react-router-dom"

import { Input } from "@/components/ui/input"

// Search box bound to the `q` URL query param.
export function SearchInput({ placeholder = "Search…" }: { placeholder?: string }) {
  const [searchParams, setSearchParams] = useSearchParams()

  return (
    <div className="relative w-64">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        aria-label="Search"
        className="pl-8"
        value={searchParams.get("q") ?? ""}
        onChange={(event) => {
          const q = event.target.value
          setSearchParams(q ? { q } : {}, { replace: true })
        }}
      />
    </div>
  )
}
