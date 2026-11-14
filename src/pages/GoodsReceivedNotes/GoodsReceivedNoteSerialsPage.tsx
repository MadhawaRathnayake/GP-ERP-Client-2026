import { ArrowLeftIcon, SaveIcon } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { QueryError } from "@/components/StatusView"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { UnitInput } from "@/pages/SerialItems/types"
import { UnitsEditor } from "@/pages/SerialItems/UnitsEditor"

import { useAddSerials, useGoodsReceivedNote } from "./api"

// The last step of a delivery, on the warehouse's phone (Zebra TC21): pick a serial-tracked line, scan each unit (and
// its accessories), save. Each saved unit goes into stock. Can be done in parts: what isn't saved yet stays on screen.
export function GoodsReceivedNoteSerialsPage() {
  const { id = "" } = useParams()
  const { data: note, isPending, isError, error } = useGoodsReceivedNote(id)
  const addSerials = useAddSerials()
  const [productId, setProductId] = useState<string | null>(null)
  const [units, setUnits] = useState<UnitInput[]>([])

  if (isPending) return <p className="text-sm text-muted-foreground">Loading GRN…</p>
  if (isError) return <QueryError error={error} />

  const lines = note.items.filter((item) => item.product.trackingType === "serial" && item.receivedQuantity > 0)
  const open = lines.filter((item) => item.serialsMissing > 0)
  const line = lines.find((item) => item.productId === productId) ?? open[0]

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/goods-received-notes/${note.id}`}>
          <ArrowLeftIcon />
          Back to {note.grnNumber}
        </Link>
      </Button>
      <h1 className="text-xl font-semibold">Serial numbers for {note.grnNumber}</h1>

      <div className="flex flex-wrap gap-2">
        {lines.map((item) => (
          <Button
            key={item.productId}
            type="button"
            variant={item.productId === line?.productId ? "default" : "outline"}
            className="h-auto flex-col items-start py-2"
            // Scanned units belong to the line they were scanned for: save them before moving on.
            disabled={units.length > 0 && item.productId !== line?.productId}
            onClick={() => setProductId(item.productId)}
          >
            <span>{item.product.sku}</span>
            <span className={cn("text-xs", item.serialsMissing > 0 ? "opacity-90" : "opacity-60")}>
              {item.serialsEntered} / {item.receivedQuantity} scanned
            </span>
          </Button>
        ))}
      </div>

      {!line ? (
        <p className="text-sm text-muted-foreground">Every unit received so far has its serial number.</p>
      ) : line.serialsMissing === 0 ? (
        <p className="text-sm text-muted-foreground">Every {line.product.sku} received so far has its serial number.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm">
            {line.product.title}: {line.serialsMissing} still to scan.
          </p>
          {/* A new editor per line, so its pending accessory scan doesn't carry over. */}
          <UnitsEditor key={line.productId} productId={line.productId} units={units} onChange={setUnits} target={line.serialsMissing} />
          <Button
            className="h-12 w-full"
            disabled={addSerials.isPending || units.length === 0}
            onClick={() =>
              addSerials.mutate({ id: note.id, productId: line.productId, units }, { onSuccess: () => setUnits([]) })
            }
          >
            <SaveIcon />
            {addSerials.isPending ? "Saving…" : `Save ${units.length} unit(s) into stock`}
          </Button>
        </div>
      )}
    </div>
  )
}
