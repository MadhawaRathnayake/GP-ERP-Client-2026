import { CheckCircle2Icon, SkipForwardIcon, Trash2Icon, XCircleIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useProductAccessories } from "@/pages/Accessories/api"

import { checkSerialNumbers } from "./api"
import { scanFeedback } from "./scan"
import { ScanInput } from "./ScanInput"
import type { UnitInput } from "./types"

interface UnitsEditorProps {
  productId: string
  units: UnitInput[]
  onChange: (units: UnitInput[]) => void
  // How many units are expected (e.g. the quantity received); scans beyond it are refused.
  target?: number
}

// Scanning new units of one product: each scan is a unit's serial, then, when the product comes with accessories,
// the next scans are those accessories' serials (in the order of the product's list). The pallet number, if typed,
// goes on every unit scanned after it. Each serial is checked with the server first: one already used is refused.
export function UnitsEditor({ productId, units, onChange, target }: UnitsEditorProps) {
  const productAccessories = useProductAccessories(productId)
  // One slot per accessory serial a unit carries, e.g. [WiFi, WiFi] for "2 × WiFi module".
  const slots = (productAccessories.data ?? []).flatMap((item) => Array.from({ length: item.quantity }, () => item.accessory))
  const [palletNumber, setPalletNumber] = useState("")
  // The unit waiting for its accessory scans.
  const [pending, setPending] = useState<UnitInput | null>(null)
  const [last, setLast] = useState<{ ok: boolean; text: string } | null>(null)
  // Scans are checked one after another, in the order they were made.
  const queue = useRef(Promise.resolve())
  // The latest values, for scans that finish after a re-render.
  const state = useRef({ units, pending })
  useEffect(() => {
    state.current = { units, pending }
  }, [units, pending])

  const full = target !== undefined && units.length >= target
  const report = (ok: boolean, text: string) => {
    scanFeedback(ok)
    setLast({ ok, text })
  }

  const finish = (unit: UnitInput) => {
    setPending(null)
    state.current.pending = null
    const next = [...state.current.units, unit]
    state.current.units = next
    onChange(next)
    report(true, `${unit.serialNumber} added${unit.accessories.length ? ` with ${unit.accessories.length} accessory serial(s)` : ""}`)
  }

  const scan = async (code: string) => {
    const { units: current, pending: waiting } = state.current
    const used = [
      ...current.flatMap((unit) => [unit.serialNumber, ...unit.accessories.map((accessory) => accessory.serialNumber)]),
      ...(waiting ? [waiting.serialNumber, ...waiting.accessories.map((accessory) => accessory.serialNumber)] : []),
    ].map((serial) => serial.toUpperCase())
    if (used.includes(code.toUpperCase())) return report(false, `${code} is already scanned`)
    if (!waiting && target !== undefined && current.length >= target) return report(false, `All ${target} units are scanned`)

    try {
      const [check] = await checkSerialNumbers([code])
      if (check?.result === "exists") {
        return report(false, `${code} is already used${check.existing ? ` (${check.existing.sku})` : ""}`)
      }
    } catch (error) {
      return report(false, `Could not check ${code}: ${(error as Error).message}`)
    }

    if (waiting) {
      const accessory = slots[waiting.accessories.length]!
      const unit = { ...waiting, accessories: [...waiting.accessories, { accessoryId: accessory.id, serialNumber: code }] }
      if (unit.accessories.length >= slots.length) return finish(unit)
      setPending(unit)
      state.current.pending = unit
      return report(true, `${accessory.name}: ${code}. Next: ${slots[unit.accessories.length]!.name}`)
    }
    const unit = { serialNumber: code, palletNumber: palletNumber.trim() || null, accessories: [] }
    if (slots.length === 0) return finish(unit)
    setPending(unit)
    state.current.pending = unit
    report(true, `${code}. Now scan its ${slots[0]!.name}`)
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <ScanInput
          disabled={productAccessories.isPending || (full && !pending)}
          placeholder={pending ? `Scan the ${slots[pending.accessories.length]?.name ?? "accessory"}` : "Scan a serial number"}
          onScan={(code) => {
            queue.current = queue.current.then(() => scan(code))
          }}
        />
        <div className="space-y-1">
          <Label htmlFor="pallet" className="sr-only">
            Pallet number
          </Label>
          <Input
            id="pallet"
            className="h-12"
            placeholder="Pallet (optional)"
            value={palletNumber}
            onChange={(event) => setPalletNumber(event.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className={cn("font-medium", target !== undefined && units.length === target && "text-primary")}>
          {units.length}
          {target !== undefined && ` / ${target}`} scanned
        </span>
        {slots.length > 0 && (
          <span className="text-muted-foreground">Each unit comes with: {slots.map((slot) => slot.name).join(", ")}</span>
        )}
      </div>
      {last && (
        <p className={cn("flex items-center gap-2 text-sm", last.ok ? "text-primary" : "text-destructive")} role="status">
          {last.ok ? <CheckCircle2Icon className="size-4" /> : <XCircleIcon className="size-4" />}
          {last.text}
        </p>
      )}
      {pending && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-2 text-sm">
          <span>
            {pending.serialNumber}: waiting for {slots[pending.accessories.length]?.name}
          </span>
          <Button type="button" size="sm" variant="outline" onClick={() => finish(pending)}>
            <SkipForwardIcon />
            No more accessory serials
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setPending(null)
              state.current.pending = null
            }}
          >
            Discard
          </Button>
        </div>
      )}
      {units.length > 0 && (
        <div className="max-h-80 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Pallet</TableHead>
                <TableHead>Accessories</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((unit, index) => (
                <TableRow key={unit.serialNumber}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-mono">{unit.serialNumber}</TableCell>
                  <TableCell>{unit.palletNumber ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {unit.accessories.map((accessory) => accessory.serialNumber).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${unit.serialNumber}`}
                      onClick={() => onChange(units.filter((other) => other !== unit))}
                    >
                      <Trash2Icon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
