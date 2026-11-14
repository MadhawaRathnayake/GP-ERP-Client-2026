import { AlertTriangleIcon } from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { SearchInput } from "@/components/SearchInput"
import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { useSerialItems, useStockCheck } from "./api"
import { serialItemStatusLabels, type SerialItemStatus } from "./types"

const ALL = "all"

export function SerialItemStatusLabel({ status }: { status: SerialItemStatus }) {
  return (
    <span className={cn(status === "inStock" && "text-primary", status === "removed" && "text-muted-foreground")}>
      {serialItemStatusLabels[status]}
    </span>
  )
}

// Find a unit by its serial, an accessory serial or its pallet. Searched on the server (there are too many units to
// load), showing the newest 50 matches.
export function SerialItemsPage() {
  const can = useCan()
  const format = useFormat()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get("q") ?? ""
  const productId = searchParams.get("productId") ?? undefined
  const status = (searchParams.get("status") as SerialItemStatus | null) ?? undefined
  const items = useSerialItems({ search, productId, status })
  const stockCheck = useStockCheck(can("SERIAL_ITEMS.VIEW"))

  const setParam = (key: string, value: string | undefined) =>
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )

  return (
    <div className="space-y-4">
      <TopBarActions>
        <SearchInput placeholder="Serial, accessory serial or pallet…" />
      </TopBarActions>
      <h1 className="text-2xl font-semibold">Serial numbers</h1>

      {(stockCheck.data?.length ?? 0) > 0 && (
        <details className="rounded-md border p-3">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <AlertTriangleIcon className="size-4 text-destructive" />
            {stockCheck.data!.length} serial product(s) whose stock isn&apos;t their units in stock
          </summary>
          <Table className="mt-2">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Stock in hand</TableHead>
                <TableHead className="text-right">Units in stock</TableHead>
                <TableHead className="text-right">Without a serial</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockCheck.data!.map((row) => (
                <TableRow key={row.productId}>
                  <TableCell>
                    <Link to={`/products/${row.productId}`} className="underline underline-offset-4">
                      {row.sku}
                    </Link>{" "}
                    <span className="text-muted-foreground">{row.title}</span>
                  </TableCell>
                  <TableCell className="text-right">{row.stockInHand}</TableCell>
                  <TableCell className="text-right">{row.unitsInStock}</TableCell>
                  <TableCell className={cn("text-right", row.withoutSerial < 0 && "text-destructive")}>{row.withoutSerial}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-2 text-xs text-muted-foreground">
            Above 0: old stock still to register (Adjust stock → Register on the product). Below 0: more units than stock.
          </p>
        </details>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status ?? ALL} onValueChange={(value) => setParam("status", value === ALL ? undefined : value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any status</SelectItem>
            {Object.entries(serialItemStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {productId && (
          <button type="button" className="text-sm underline underline-offset-4" onClick={() => setParam("productId", undefined)}>
            Showing one product only: show all
          </button>
        )}
        {items.data && (
          <span className="text-sm text-muted-foreground">
            {items.data.total > items.data.data.length
              ? `Newest ${items.data.data.length} of ${items.data.total}`
              : `${items.data.total} unit(s)`}
          </span>
        )}
      </div>

      {items.isError ? (
        <QueryError error={items.error} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Accessories</TableHead>
                <TableHead>Pallet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.isPending ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : items.data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No units found.
                  </TableCell>
                </TableRow>
              ) : (
                items.data.data.map((item) => (
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => navigate(`/serial-items/${item.id}`)}>
                    <TableCell className="font-mono">
                      <Link to={`/serial-items/${item.id}`} onClick={(event) => event.stopPropagation()}>
                        {item.serialNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{item.product.sku}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.accessories.map((accessory) => accessory.serialNumber).join(", ") || "—"}
                    </TableCell>
                    <TableCell>{item.palletNumber ?? "—"}</TableCell>
                    <TableCell>
                      <SerialItemStatusLabel status={item.status} />
                    </TableCell>
                    <TableCell>{format.date(item.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
