import { XIcon } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useInvoices } from "@/pages/Invoices/api"
import { useSerialItems } from "@/pages/SerialItems/api"
import type { SerialItemSummary } from "@/pages/SerialItems/types"

// The two links of a service or warranty quotation or invoice: the unit it's about and the invoice it was sold on. The
// form keeps the id ("" = none) and the number to show. A number without an id is old-system text on an imported
// quotation: it stays as it is until a linked unit or invoice is chosen in its place.
export interface ReferenceChoice {
  id: string
  label: string
}

interface PickerProps {
  value: ReferenceChoice
  onChange: (choice: ReferenceChoice) => void
}

// Search for a unit by serial, accessory serial or pallet (a scanner works too). onUnit also gets the unit, so the form
// can fill in the invoice it was sold on.
export function OldSerialPicker({ value, onChange, onUnit }: PickerProps & { onUnit?: (unit: SerialItemSummary) => void }) {
  const [query, setQuery] = useState("")
  const search = query.trim()
  const units = useSerialItems({ search, limit: 8 }, search.length >= 2)

  return (
    <Picker value={value} onChange={onChange} query={query} onQuery={setQuery} placeholder="Type or scan a serial number">
      {search.length >= 2 &&
        (units.isError ? (
          <Note>{units.error.message}</Note>
        ) : units.data?.data.length === 0 ? (
          <Note>No unit found</Note>
        ) : (
          units.data?.data.map((unit) => (
            <Option
              key={unit.id}
              onClick={() => {
                onChange({ id: String(unit.id), label: unit.serialNumber })
                onUnit?.(unit)
                setQuery("")
              }}
            >
              <span className="font-mono">{unit.serialNumber}</span>{" "}
              <span className="text-muted-foreground">
                {unit.product.sku}
                {unit.invoice?.invoiceNumber && ` · ${unit.invoice.invoiceNumber}`}
              </span>
            </Option>
          ))
        ))}
    </Picker>
  )
}

// Search the finalized invoices by number or customer.
export function OldInvoicePicker({ value, onChange }: PickerProps) {
  const [query, setQuery] = useState("")
  const search = query.trim().toLowerCase()
  const invoices = useInvoices(search.length >= 2)
  const matches = (invoices.data ?? [])
    .filter(
      (invoice) =>
        invoice.invoiceNumber &&
        [invoice.invoiceNumber, invoice.customer.code, invoice.customer.name].some((text) => text.toLowerCase().includes(search)),
    )
    .slice(0, 8)

  return (
    <Picker value={value} onChange={onChange} query={query} onQuery={setQuery} placeholder="Type an invoice number or customer">
      {search.length >= 2 &&
        (invoices.isError ? (
          <Note>{invoices.error.message}</Note>
        ) : invoices.isPending ? (
          <Note>Searching…</Note>
        ) : matches.length === 0 ? (
          <Note>No finalized invoice found</Note>
        ) : (
          matches.map((invoice) => (
            <Option
              key={invoice.id}
              onClick={() => {
                onChange({ id: String(invoice.id), label: invoice.invoiceNumber! })
                setQuery("")
              }}
            >
              {invoice.invoiceNumber}{" "}
              <span className="text-muted-foreground">
                {invoice.customer.code} · {invoice.customer.name}
              </span>
            </Option>
          ))
        ))}
    </Picker>
  )
}

interface PickerShellProps extends PickerProps {
  query: string
  onQuery: (query: string) => void
  placeholder: string
  children: ReactNode
}

function Picker({ value, onChange, query, onQuery, placeholder, children }: PickerShellProps) {
  const linked = value.id !== ""
  return (
    <div className="space-y-1">
      {value.label && (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono">{value.label}</span>
          {linked ? (
            <Button type="button" variant="ghost" size="icon" aria-label="Clear" onClick={() => onChange({ id: "", label: "" })}>
              <XIcon />
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">(old system, not linked: choose one below to link it)</span>
          )}
        </div>
      )}
      {!linked && (
        <>
          <Input placeholder={placeholder} value={query} onChange={(event) => onQuery(event.target.value)} />
          {query.trim().length >= 2 && <ul className="max-h-48 overflow-auto rounded-md border">{children}</ul>}
        </>
      )}
    </div>
  )
}

function Option({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <li>
      <button type="button" className="w-full px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={onClick}>
        {children}
      </button>
    </li>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <li className="px-2 py-1.5 text-sm text-muted-foreground">{children}</li>
}
