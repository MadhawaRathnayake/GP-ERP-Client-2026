import { ArrowLeftIcon, PencilIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { QueryError } from "@/components/StatusView"
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
import { Label } from "@/components/ui/label"

import { useSerialItem, useUpdateSerialItem } from "./api"
import { SerialItemStatusLabel } from "./SerialItemsPage"
import { serialItemStatusLabels, type SerialItem } from "./types"

// One unit: what it is, where it is now, and everything that happened to it.
export function SerialItemPage() {
  const { id = "" } = useParams()
  const can = useCan()
  const format = useFormat()
  const { data: item, isPending, isError, error } = useSerialItem(Number(id))

  if (isPending || isError) {
    return (
      <div className="space-y-4">
        <BackLink />
        {isPending ? <p className="text-sm text-muted-foreground">Loading unit…</p> : <QueryError error={error} />}
      </div>
    )
  }

  const details: [string, ReactNode][] = [
    ["Serial number", <span className="font-mono">{item.serialNumber}</span>],
    [
      "Product",
      <Link to={`/products/${item.product.id}`} className="underline underline-offset-4">
        {item.product.sku} · {item.product.title}
      </Link>,
    ],
    ["Status", <SerialItemStatusLabel status={item.status} />],
    ["Pallet", item.palletNumber ?? "—"],
    ...item.accessories.map(
      ({ accessory, serialNumber }): [string, ReactNode] => [accessory.name, <span className="font-mono">{serialNumber}</span>],
    ),
    [
      "Invoice",
      item.invoice ? (
        <Link to={`/invoices/${item.invoice.id}`} className="underline underline-offset-4">
          {item.invoice.invoiceNumber ?? `#${item.invoice.id}`}
        </Link>
      ) : (
        "—"
      ),
    ],
    ["Customer", item.invoice ? `${item.invoice.customer.code} · ${item.invoice.customer.name}` : "—"],
    ["Sold", item.invoice?.finalizedAt ? format.date(item.invoice.finalizedAt) : "—"],
    ["Registered", `${format.dateTime(item.createdAt)}${item.creator ? ` by ${item.creator.name}` : ""}`],
  ]

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-2xl font-semibold">{item.serialNumber}</h1>
      <BackLink />
      <dl className="max-w-3xl border-t">
        {details.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[minmax(8rem,14rem)_1fr] gap-4 border-b px-2 py-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
      {can("SERIAL_ITEMS.EDIT") && <EditUnitButton item={item} />}

      <h2 className="pt-4 text-lg font-semibold">History</h2>
      <ol className="max-w-3xl space-y-3 border-l pl-4">
        {item.movements.map((movement) => (
          <li key={movement.id} className="space-y-0.5">
            <p className="text-sm font-medium">
              {movement.fromStatus === null
                ? `Registered: ${serialItemStatusLabels[movement.toStatus]}`
                : movement.fromStatus === movement.toStatus
                  ? "Corrected"
                  : `${serialItemStatusLabels[movement.fromStatus]} → ${serialItemStatusLabels[movement.toStatus]}`}
              {movement.invoice && (
                <>
                  {" · "}
                  <Link to={`/invoices/${movement.invoice.id}`} className="underline underline-offset-4">
                    {movement.invoice.invoiceNumber ?? `Invoice #${movement.invoice.id}`}
                  </Link>
                </>
              )}
            </p>
            {movement.remarks && <p className="text-sm text-muted-foreground">{movement.remarks}</p>}
            <p className="text-xs text-muted-foreground">
              {format.dateTime(movement.createdAt)}
              {movement.creator && ` · ${movement.creator.name}`}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}

// Correct a typo in the serial, the pallet or an accessory serial.
function EditUnitButton({ item }: { item: SerialItem }) {
  const updateItem = useUpdateSerialItem()
  const [open, setOpen] = useState(false)
  const [serialNumber, setSerialNumber] = useState(item.serialNumber)
  const [palletNumber, setPalletNumber] = useState(item.palletNumber ?? "")
  const [accessories, setAccessories] = useState(item.accessories.map((accessory) => accessory.serialNumber))
  const changeOpen = (next: boolean) => {
    setSerialNumber(item.serialNumber)
    setPalletNumber(item.palletNumber ?? "")
    setAccessories(item.accessories.map((accessory) => accessory.serialNumber))
    setOpen(next)
  }
  const blank = serialNumber.trim() === "" || accessories.some((serial) => serial.trim() === "")

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PencilIcon />
          Correct
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct {item.serialNumber}</DialogTitle>
          <DialogDescription>For a typo. The change is kept in the unit&apos;s history.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serialNumber">Serial number</Label>
            <Input id="serialNumber" value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="palletNumber">Pallet</Label>
            <Input id="palletNumber" placeholder="Optional" value={palletNumber} onChange={(event) => setPalletNumber(event.target.value)} />
          </div>
          {item.accessories.map(({ accessory }, index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`accessory-${index}`}>{accessory.name}</Label>
              <Input
                id={`accessory-${index}`}
                value={accessories[index]}
                onChange={(event) => setAccessories(accessories.map((serial, i) => (i === index ? event.target.value : serial)))}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={updateItem.isPending || blank}
            onClick={() =>
              updateItem.mutate(
                {
                  id: item.id,
                  serialNumber: serialNumber.trim(),
                  palletNumber: palletNumber.trim() || null,
                  accessories: item.accessories.map(({ accessory }, index) => ({
                    accessoryId: accessory.id,
                    serialNumber: accessories[index]!.trim(),
                  })),
                },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            {updateItem.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to="/serial-items">
        <ArrowLeftIcon />
        Back to serial numbers
      </Link>
    </Button>
  )
}
