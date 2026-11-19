import { SearchIcon } from "lucide-react"
import { useSearchParams } from "react-router-dom"

import { Input } from "@/components/ui/input"

// Search box bound to the `q` URL query param (`param` for a second search on the page, e.g. a picker's).
export function SearchInput({ placeholder = "Search…", param = "q" }: { placeholder?: string; param?: string }) {
  const [searchParams, setSearchParams] = useSearchParams()

  return (
    <div className="relative w-64">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        aria-label="Search"
        className="pl-8"
        value={searchParams.get(param) ?? ""}
        onChange={(event) => {
          const q = event.target.value
          setSearchParams(
            (params) => {
              const next = new URLSearchParams(params)
              if (q) next.set(param, q)
              else next.delete(param)
              // The results change, so every grid on the page goes back to its first page (`page` or `<urlKey>.page`).
              for (const key of [...next.keys()]) {
                if (key === "page" || key.endsWith(".page")) next.delete(key)
              }
              return next
            },
            { replace: true },
          )
        }}
      />
    </div>
  )
}
