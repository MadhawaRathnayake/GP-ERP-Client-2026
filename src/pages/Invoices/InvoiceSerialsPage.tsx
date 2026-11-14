import { ArrowLeftIcon, CheckCircle2Icon, Trash2Icon, XCircleIcon } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { QueryError } from "@/components/StatusView"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { scanFeedback } from "@/pages/SerialItems/scan"
import { ScanInput } from "@/pages/SerialItems/ScanInput"

import { useInvoice, useReleaseInvoiceSerial, useScanInvoiceSerial } from "./api"
import { invoiceNumberOf, serialProgress } from "./types"

// The warehouse completes a draft on its phone (Zebra TC21): scan a serial for every unit of each serial-numbered line.
// Anything works: the unit's serial, one of its accessory serials (e.g. the WiFi module's), or a pallet number (which
// adds that pallet's units the line still needs). Each scan is saved at once, so nothing is lost if the phone drops.
export function InvoiceSerialsPage() {
  const { id = "" } = useParams()
  const { data: invoice, isPending, isError, error } = useInvoice(id)
  const scan = useScanInvoiceSerial()
  const release = useReleaseInvoiceSerial()
  const [last, setLast] = useState<{ ok: boolean; text: string } | null>(null)

  if (isPending) return <p className="text-sm text-muted-foreground">Loading invoice…</p>
  if (isError) return <QueryError error={error} />

  const lines = serialProgress(invoice)
  const unscanned = lines.reduce((total, line) => total + line.item.quantity - line.picks.length, 0)
  const isDraft = invoice.status === "draft"

  const report = (ok: boolean, text: string) => {
    scanFeedback(ok)
    setLast({ ok, text })
  }
  const onScan = (code: string) =>
    scan.mutate(
      { id: invoice.id, code },
      {
        onSuccess: ({ added, skipped }) =>
          report(
            true,
            added.length === 1
              ? `${added[0]!.serialNumber} (${added[0]!.sku}) added`
              : `${added.length} units of pallet ${code} added${skipped ? `, ${skipped} skipped` : ""}`,
          ),
        onError: (scanError) => report(false, scanError.message),
      },
    )

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/invoices/${invoice.id}`}>
          <ArrowLeftIcon />
          Back to {invoiceNumberOf(invoice)}
        </Link>
      </Button>
      <h1 className="text-xl font-semibold">Serial numbers for {invoiceNumberOf(invoice)}</h1>
      <p className="text-sm text-muted-foreground">
        {invoice.customer.code} · {invoice.customer.name}
      </p>

      {!isDraft ? (
        <p className="text-sm text-muted-foreground">Serials are scanned on a draft; this invoice isn&apos;t one any more.</p>
      ) : (
        <>
          <ScanInput onScan={onScan} disabled={scan.isPending || unscanned === 0} placeholder="Scan a serial, WiFi serial or pallet" />
          <p className={cn("text-sm font-medium", unscanned === 0 && "text-primary")}>
            {unscanned === 0 ? "Every unit is scanned: the invoice can be finalized." : `${unscanned} unit(s) still to scan`}
          </p>
          {last && (
            <p className={cn("flex items-center gap-2 text-sm", last.ok ? "text-primary" : "text-destructive")} role="status">
              {last.ok ? <CheckCircle2Icon className="size-4" /> : <XCircleIcon className="size-4" />}
              {last.text}
            </p>
          )}
        </>
      )}

      <div className="space-y-3">
        {lines.map(({ item, picks }) => (
          <section key={item.id} className="rounded-md border p-3">
            <h2 className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-medium">
              <span>
                {item.product.sku} <span className="font-normal text-muted-foreground">{item.description}</span>
              </span>
              <span className={picks.length < item.quantity ? "text-destructive" : "text-primary"}>
                {picks.length} / {item.quantity}
              </span>
            </h2>
            <ul className="mt-2 space-y-1">
              {picks.map(({ serialItem }) => (
                <li key={serialItem.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-mono">
                    {serialItem.serialNumber}
                    {serialItem.accessories.map((accessory) => (
                      <span key={accessory.serialNumber} className="block text-xs text-muted-foreground">
                        {accessory.accessory.name}: {accessory.serialNumber}
                      </span>
                    ))}
                  </span>
                  {isDraft && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Take ${serialItem.serialNumber} off`}
                      disabled={release.isPending}
                      onClick={() => release.mutate({ id: invoice.id, serialItemId: serialItem.id })}
                    >
                      <Trash2Icon />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
