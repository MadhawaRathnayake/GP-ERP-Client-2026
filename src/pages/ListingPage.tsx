import { useNavigate, useSearchParams } from "react-router-dom"

import { DataTable, type Column } from "@/components/DataTable"
import { useItems } from "@/hooks/useItems"
import { usePageActions } from "@/hooks/usePageActions"
import type { Item } from "@/types/item"

const columns: Column<Item>[] = [
  { header: "Name", cell: (item) => <span className="font-medium">{item.name}</span> },
  { header: "Status", cell: (item) => <span className="capitalize">{item.status}</span> },
  { header: "Created", cell: (item) => new Date(item.createdAt).toLocaleDateString() },
]

export function ListingPage() {
  usePageActions({ search: true, create: true })
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const q = searchParams.get("q") ?? ""
  const { data, isPending, isError, error } = useItems(q)

  return (
    <div className="space-y-4">
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
