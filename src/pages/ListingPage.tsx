import { PlusIcon } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { DataTable, type Column } from "@/components/DataTable"
import { SearchInput } from "@/components/SearchInput"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { useItems } from "@/hooks/useItems"
import type { Item } from "@/types/item"

const columns: Column<Item>[] = [
  { header: "Name", cell: (item) => <span className="font-medium">{item.name}</span> },
  { header: "Status", cell: (item) => <span className="capitalize">{item.status}</span> },
  { header: "Created", cell: (item) => new Date(item.createdAt).toLocaleDateString() },
]

export function ListingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const q = searchParams.get("q") ?? ""
  const { data, isPending, isError, error } = useItems(q)

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput />
        <Button asChild>
          <Link to="/items/new">
            <PlusIcon />
            Create new
          </Link>
        </Button>
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Items</h1>
      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading items…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">Could not load items: {error.message}</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{q ? `No items match "${q}".` : "No items yet."}</p>
      ) : (
        <DataTable columns={columns} data={data} onRowClick={(item) => navigate(`/items/${item.id}`)} />
      )}
    </div>
  )
}
