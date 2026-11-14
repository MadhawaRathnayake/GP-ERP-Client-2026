import { MinusIcon, PackagePlusIcon, PlusIcon, ScanBarcodeIcon } from "lucide-react"
import { useState } from "react"

import { useCan } from "@/app/auth"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Label } from "@/components/ui/label"
import { useSerialItems } from "@/pages/SerialItems/api"
import type { UnitInput } from "@/pages/SerialItems/types"
import { UnitsEditor } from "@/pages/SerialItems/UnitsEditor"

import { useAdjustStock } from "./api"
import type { Product } from "./types"

type Mode = "add" | "remove" | "register"

// Adds stock or takes it out by hand, with a reason the server keeps on the stock movement. A quantity-tracked product
// takes a number; a serial-tracked one adds units by scanning their serials, removes units it has in stock, or
// registers serials for old stock that was counted without them (stock doesn't change).
export function AdjustStockButton({ product }: { product: Product }) {
  const can = useCan()
  const adjustStock = useAdjustStock()
  const serial = product.trackingType === "serial"
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>("add")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [units, setUnits] = useState<UnitInput[]>([])
  const [removeIds, setRemoveIds] = useState<number[]>([])
  const [search, setSearch] = useState("")
  const inStock = useSerialItems(
    { productId: product.id, status: "inStock", search, limit: 100 },
    open && serial && can("SERIAL_ITEMS.VIEW"),
  )
  // Units in stock without filtering, for the "without a serial" figure.
  const unitCount = useSerialItems({ productId: product.id, status: "inStock", limit: 1 }, open && serial && can("SERIAL_ITEMS.VIEW"))
  const withoutSerial = unitCount.data ? product.stockInHand - unitCount.data.total : 0

  const changeOpen = (next: boolean) => {
    if (!next) {
      setMode("add")
      setQuantity("")
      setReason("")
      setUnits([])
      setRemoveIds([])
      setSearch("")
    }
    setOpen(next)
  }
  const switchMode = (next: Mode) => {
    setMode(next)
    setUnits([])
    setRemoveIds([])
  }

  const amount = /^\d+$/.test(quantity) ? Number(quantity) : 0
  const tooMany = !serial && mode === "remove" && amount > product.stockInHand
  const count = !serial ? amount : mode === "remove" ? removeIds.length : units.length
  const after = mode === "add" ? product.stockInHand + count : mode === "remove" ? product.stockInHand - count : product.stockInHand
  const ready = count > 0 && !tooMany && reason.trim() !== ""

  const save = () => {
    const base = { id: product.id, reason: reason.trim() }
    const body = !serial
      ? { ...base, quantity: mode === "add" ? amount : -amount }
      : mode === "add"
        ? { ...base, add: units }
        : mode === "remove"
          ? { ...base, remove: removeIds }
          : { ...base, register: units }
    adjustStock.mutate(body, { onSuccess: () => changeOpen(false) })
  }

  const modes: { mode: Mode; label: string; icon: typeof PlusIcon }[] = [
    { mode: "add", label: "Add", icon: PlusIcon },
    { mode: "remove", label: "Remove", icon: MinusIcon },
    ...(serial && withoutSerial > 0 ? [{ mode: "register" as const, label: "Register", icon: ScanBarcodeIcon }] : []),
  ]

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PackagePlusIcon />
          Adjust stock
        </Button>
      </DialogTrigger>
      <DialogContent className={serial ? "sm:max-w-2xl" : undefined}>
        <DialogHeader>
          <DialogTitle>Adjust stock of {product.sku}</DialogTitle>
          <DialogDescription>
            {product.stockInHand} in hand now
            {serial && withoutSerial > 0 && `, ${withoutSerial} of them without a serial`}. The change and its reason
            are kept in the product&apos;s stock history.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            {modes.map(({ mode: value, label, icon: Icon }) => (
              <Button key={value} type="button" variant={mode === value ? "default" : "outline"} onClick={() => switchMode(value)}>
                <Icon />
                {label}
              </Button>
            ))}
          </div>

          {!serial && (
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              {tooMany && <p className="text-sm text-destructive">Only {product.stockInHand} in hand.</p>}
            </div>
          )}

          {serial && mode !== "remove" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {mode === "add"
                  ? "Scan each new unit. Stock goes up by one per unit."
                  : `Scan the units already counted in stock (up to ${withoutSerial}). Stock doesn't change.`}
              </p>
              <UnitsEditor
                productId={product.id}
                units={units}
                onChange={setUnits}
                target={mode === "register" ? withoutSerial : undefined}
              />
            </div>
          )}

          {serial && mode === "remove" && (
            <div className="space-y-2">
              <Input placeholder="Find a unit by serial or pallet" value={search} onChange={(event) => setSearch(event.target.value)} />
              <div className="max-h-64 space-y-1 overflow-auto rounded-md border p-2">
                {inStock.data?.data.map((unit) => (
                  <label key={unit.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={removeIds.includes(unit.id)}
                      onCheckedChange={(checked) =>
                        setRemoveIds(checked ? [...removeIds, unit.id] : removeIds.filter((id) => id !== unit.id))
                      }
                    />
                    <span className="font-mono">{unit.serialNumber}</span>
                    {unit.palletNumber && <span className="text-muted-foreground">pallet {unit.palletNumber}</span>}
                  </label>
                ))}
                {inStock.data?.data.length === 0 && <p className="text-sm text-muted-foreground">No units in stock found.</p>}
              </div>
              <p className="text-sm">{removeIds.length} unit(s) chosen</p>
            </div>
          )}

          {count > 0 && !tooMany && <p className="text-sm text-muted-foreground">{after} in hand after this.</p>}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              placeholder="e.g. Stock count"
              value={reason}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button disabled={adjustStock.isPending || !ready} onClick={save}>
            {adjustStock.isPending
              ? "Saving…"
              : mode === "add"
                ? "Add stock"
                : mode === "remove"
                  ? "Remove stock"
                  : "Register serials"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
