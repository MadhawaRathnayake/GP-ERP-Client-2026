import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { useCan } from "@/app/auth"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccessories, useProductAccessories, useSetProductAccessories } from "@/pages/Accessories/api"
import type { ProductAccessory } from "@/pages/Accessories/types"
import { useSerialItems } from "@/pages/SerialItems/api"

import type { Product } from "./types"

// A serial-tracked product's units in stock (against its stock in hand) and what comes with each unit.
export function ProductUnits({ product }: { product: Product }) {
  const can = useCan()
  const inStock = useSerialItems({ productId: product.id, status: "inStock", limit: 1 }, can("SERIAL_ITEMS.VIEW"))
  const accessories = useProductAccessories(product.id)
  const unitsInStock = inStock.data?.total
  const withoutSerial = unitsInStock === undefined ? 0 : product.stockInHand - unitsInStock

  return (
    <section className="space-y-3 rounded-md border p-4">
      <h2 className="font-semibold">Units</h2>
      {can("SERIAL_ITEMS.VIEW") && (
        <p className="text-sm">
          {unitsInStock ?? "…"} unit(s) with a serial in stock
          {withoutSerial > 0 && (
            <span className="text-destructive">
              {" "}
              · {withoutSerial} in stock without a serial: register them with Adjust stock → Register
            </span>
          )}
          {withoutSerial < 0 && <span className="text-destructive"> · more units than stock in hand: check with Adjust stock</span>}
          {" · "}
          <Link to={`/serial-items?productId=${product.id}`} className="underline underline-offset-4">
            See all units
          </Link>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Comes with:</span>
        {accessories.data?.length
          ? accessories.data.map((item) => `${item.quantity} × ${item.accessory.name}`).join(", ")
          : "no accessories with a serial"}
        {can("PRODUCTS.EDIT") && !product.isDeleted && accessories.data && (
          <ProductAccessoriesDialog productId={product.id} saved={accessories.data} />
        )}
      </div>
    </section>
  )
}

// The accessories that come with every unit, and how many. Scanning a new unit then asks for their serials.
function ProductAccessoriesDialog({ productId, saved }: { productId: string; saved: ProductAccessory[] }) {
  const accessories = useAccessories()
  const setAccessories = useSetProductAccessories()
  const [open, setOpen] = useState(false)
  const initial = () => saved.map((item) => ({ accessoryId: item.accessoryId, quantity: String(item.quantity) }))
  const [rows, setRows] = useState(initial)
  const changeOpen = (next: boolean) => {
    setRows(initial())
    setOpen(next)
  }
  const active = accessories.data?.filter((accessory) => !accessory.isDeleted) ?? []
  const valid =
    rows.every((row) => row.accessoryId && /^[1-9]\d?$/.test(row.quantity)) &&
    new Set(rows.map((row) => row.accessoryId)).size === rows.length

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PencilIcon />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What comes with each unit</DialogTitle>
          <DialogDescription>
            Accessories with their own serial, e.g. 2 × WiFi module. New accessories are made on the Accessories page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="flex gap-2">
              <Select
                value={row.accessoryId}
                onValueChange={(accessoryId) => setRows(rows.map((other, i) => (i === index ? { ...other, accessoryId } : other)))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose an accessory" />
                </SelectTrigger>
                <SelectContent>
                  {[...active, ...saved.filter((item) => item.accessory.isDeleted).map((item) => item.accessory)].map((accessory) => (
                    <SelectItem key={accessory.id} value={accessory.id}>
                      {accessory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                aria-label="Quantity per unit"
                inputMode="numeric"
                className="w-20"
                value={row.quantity}
                onChange={(event) => setRows(rows.map((other, i) => (i === index ? { ...other, quantity: event.target.value } : other)))}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove"
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, { accessoryId: "", quantity: "1" }])}>
            <PlusIcon />
            Add accessory
          </Button>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={setAccessories.isPending || !valid}
            onClick={() =>
              setAccessories.mutate(
                { productId, items: rows.map((row) => ({ accessoryId: row.accessoryId, quantity: Number(row.quantity) })) },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            {setAccessories.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
