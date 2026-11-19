import { UserCheckIcon, UserPlusIcon, type LucideIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat, useSettings } from "@/app/settings"
import { DetailSkeleton } from "@/components/DetailCard"
import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { BackButton, PdfButtons, TopBarButton } from "@/components/TopBarButton"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useCountryName } from "@/pages/Countries/api"
import { ProductThumbnail } from "@/pages/Products/ProductPicker"
import { typeLabels } from "@/pages/Quotations/types"

import { useDeliveryNote, useItemIssuers, useItemVerifiers, useSetItemIssuer, useSetItemVerifier } from "./api"
import { DeliveryNoteProgress, DeliveryNoteStatusLabel } from "./DeliveryNotesPage"
import { type DropdownUser } from "./types"

export function DeliveryNotePage() {
  const countryName = useCountryName()
  const { data: settings } = useSettings()
  const { id = "" } = useParams()
  const can = useCan()
  const format = useFormat()
  const { data: note, isPending, isError, error } = useDeliveryNote(id)
  const isDraft = note?.status === "draft"
  // The verifier can be added or changed while it's a draft; the issuer comes after the verifier and issues it.
  const canSetVerifier = isDraft && can("DELIVERY_NOTES.SET_VERIFIER")
  const canSetIssuer = isDraft && note.itemVerifierId !== null && can("DELIVERY_NOTES.SET_ISSUER")
  const verifiers = useItemVerifiers(canSetVerifier)
  const issuers = useItemIssuers(canSetIssuer)
  const setVerifier = useSetItemVerifier()
  const setIssuer = useSetItemIssuer()

  if (isPending || isError) {
    return (
      <div className="mx-auto max-w-6xl">
        <TopBarActions>
          <BackButton to="/delivery-notes" label="Delivery notes" />
        </TopBarActions>
        {isPending ? <DetailSkeleton label="Loading delivery note" /> : <QueryError error={error} />}
      </div>
    )
  }

  const { invoice } = note
  const { customer } = invoice
  const address = [customer.houseNumber, customer.street, customer.city, customer.district].filter(Boolean).join(", ")
  // The printed "Order Date": the invoice's date in the company's timezone, "16-11-2026".
  const orderDate = new Intl.DateTimeFormat("en-GB", { timeZone: settings?.timezone, day: "2-digit", month: "2-digit", year: "numeric" })
    .format(new Date(invoice.finalizedAt ?? note.createdAt))
    .replaceAll("/", "-")
  const info: [string, string][] = [
    ["Delivery Note No", note.deliveryNoteNumber],
    ["Date", format.date(note.issuedAt ?? note.createdAt)],
    ["Customer Code", customer.code],
    ...(invoice.type !== "sales" ? ([["Type", typeLabels[invoice.type]]] satisfies [string, string][]) : []),
  ]
  const band = note.status === "cancelled"
    ? "bg-destructive"
    : note.status === "issued"
      ? "bg-status-done"
      : note.itemVerifierId
        ? "bg-status-confirmed"
        : "bg-status-open"

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <TopBarActions>
        <BackButton to="/delivery-notes" label="Delivery notes" />
        {canSetVerifier && (
          <PersonDialog
            icon={UserCheckIcon}
            label={note.itemVerifierId ? "Change verifier" : "Add verifier"}
            description="The person who checks the items against the invoice."
            current={note.itemVerifierId}
            users={verifiers.data}
            loadError={verifiers.error?.message}
            pending={setVerifier.isPending}
            onSave={(userId, close) => setVerifier.mutate({ id: note.id, userId }, { onSuccess: close })}
          />
        )}
        {canSetIssuer && (
          <PersonDialog
            icon={UserPlusIcon}
            label="Add issuer"
            description={`The person who issues the items. It can't be the item verifier (${note.itemVerifier?.name}). This issues the delivery note, and neither person can be changed after it.`}
            current={null}
            // The issuer has to be someone other than the verifier.
            users={issuers.data?.filter((user) => user.id !== note.itemVerifierId)}
            loadError={issuers.error?.message}
            pending={setIssuer.isPending}
            onSave={(userId, close) => setIssuer.mutate({ id: note.id, userId }, { onSuccess: close })}
          />
        )}
        {/* Two copies of the same note, as in the old system. A cancelled note has none. */}
        {note.status !== "cancelled" &&
          (["Customer", "Warehouse"] as const).map((copy) => (
            <PdfButtons
              key={copy}
              name={copy.toLowerCase()}
              fileName={`${note.deliveryNoteNumber} ${customer.name} (${copy} Copy).pdf`}
              document={() =>
                import("./DeliveryNoteDocument").then((module) => (
                  <module.DeliveryNoteDocument
                    note={note}
                    copy={copy}
                    orderDate={orderDate}
                    countryName={countryName(customer.country)}
                  />
                ))
              }
            />
          ))}
      </TopBarActions>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isDraft ? "Draft delivery note" : "Delivery note"} {note.deliveryNoteNumber}
        </h1>
        <div className="w-full max-w-md">
          <DeliveryNoteProgress note={note} />
        </div>
      </div>

      {/* The same sheet as the quotation and invoice pages, titled DELIVERY NOTE. */}
      <Card className="gap-0 overflow-hidden py-0 shadow-card">
        {/* A thin band across the top of the sheet, in the status's colour. */}
        <div className={cn("h-1.5", band)} />
        <div className="flex flex-col gap-6 p-5 text-sm sm:p-8">
          {/* Letterhead: the logo, the company on the left, the note's details on the right. */}
          <img src="/document-logo.png" alt="Gunda Power" className="w-48 sm:w-60" />
          <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
            <div className="space-y-5">
              <address className="text-xs leading-relaxed not-italic text-muted-foreground">
                {sender.address}
                <br />
                {sender.city}
                <br />
                {sender.tel}
                <br />
                {sender.web}
              </address>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Deliver To:</p>
                <div className="max-w-sm rounded-md border border-foreground/60 px-3 py-2.5 text-xs leading-relaxed">
                  <Link to={`/customers/${customer.id}`} className="font-medium text-primary hover:underline">
                    {customer.name}
                  </Link>
                  {invoice.deliveryLocation ? (
                    <p className="whitespace-pre-line">{invoice.deliveryLocation}</p>
                  ) : (
                    address && <p>{address}</p>
                  )}
                  {customer.phones.length > 0 && <p>{customer.phones.join(" / ")}</p>}
                  {customer.email && <p>{customer.email}</p>}
                </div>
              </div>
            </div>
            <div className="sm:w-64">
              <h2 className="mb-2 text-base font-semibold tracking-wide">DELIVERY NOTE</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                {info.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right">{value}</dd>
                  </div>
                ))}
                <dt className="text-muted-foreground">Invoice No</dt>
                <dd className="text-right">
                  <Link to={`/invoices/${invoice.id}`} className="text-primary hover:underline">
                    {invoice.invoiceNumber ?? "Open"}
                  </Link>
                </dd>
              </dl>
            </div>
          </div>

          {/* The invoice's products. Only this table scrolls sideways on a phone. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-y text-xs">
              <thead className="border-b font-semibold">
                <tr className="[&>th]:px-2 [&>th]:py-3 [&>th]:text-center">
                  <th className="w-10">#</th>
                  <th>Item Description</th>
                  <th>Image</th>
                  <th className="text-right!">Qty.</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.items.map((item) => {
                  const picks = invoice.serialPicks.filter((pick) => pick.productId === item.productId)
                  return (
                    <tr key={item.lineNo} className="[&>td]:px-2 [&>td]:py-3 [&>td]:text-center">
                      <td>{item.lineNo}</td>
                      <td className="leading-relaxed">
                        {item.description}
                        <span className="block text-muted-foreground">{item.product.sku}</span>
                        {item.warrantyEndsAt && (
                          <span className="block text-muted-foreground">Warranty until {format.date(item.warrantyEndsAt)}</span>
                        )}
                        {picks.length > 0 && (
                          <span className="mt-1 block font-mono">
                            {picks
                              .map(({ serialItem }) =>
                                [serialItem.serialNumber, ...serialItem.accessories.map((accessory) => `${accessory.accessory.name} ${accessory.serialNumber}`)].join(" · "),
                              )
                              .join(", ")}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="inline-flex justify-center">
                          <ProductThumbnail src={item.product.imageUrl} alt={item.description} />
                        </span>
                      </td>
                      <td className="text-right! text-sm font-semibold tabular-nums">{item.quantity}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Who checked the items and who handed them out, like the signature lines at the foot of the note. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Signatory
              icon={UserCheckIcon}
              role="Item verifier"
              hint="Checks the items against the invoice"
              name={note.itemVerifier?.name ?? note.oldItemVerifierName}
            />
            <Signatory
              icon={UserPlusIcon}
              role="Item issuer"
              hint="Issues the items; this issues the note"
              name={note.itemIssuer?.name ?? note.oldItemIssuerName}
              at={note.issuedAt && format.dateTime(note.issuedAt)}
            />
          </div>
        </div>
      </Card>

      {/* What the printed note leaves out: for staff. */}
      <Card className="gap-0 p-5 text-sm shadow-card">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Status">
            <DeliveryNoteStatusLabel status={note.status} />
          </Info>
          {note.isImported && <Info label="Source">Imported from the old system</Info>}
          <Info label="Created">{`${format.dateTime(note.createdAt)}${note.creator ? ` by ${note.creator.name}` : ""}`}</Info>
          <Info label="Issued">{note.issuedAt && format.dateTime(note.issuedAt)}</Info>
        </dl>
      </Card>
    </div>
  )
}

// Company details, as hard-coded in the old system; the same as on the quotation and invoice pages.
const sender = {
  address: "184, Buthgamuwa Road",
  city: "Rajagiriya, Sri Lanka",
  tel: "0112 805 005 / 0761 399 060 / 0761 399 063",
  web: "info@gundapower.com / www.gundapower.com",
}

// One of the two people on the note: their name, or "Not added yet" in the role's place.
function Signatory({
  icon: Icon,
  role,
  hint,
  name,
  at,
}: {
  icon: LucideIcon
  role: string
  hint: string
  name: string | null | undefined
  at?: string | null
}) {
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-4", name ? "border-status-confirmed/40 bg-status-confirmed/5" : "border-dashed")}>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          name ? "bg-status-confirmed/15 text-status-confirmed" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{role}</p>
        <p className={cn("text-base font-semibold", !name && "font-normal text-muted-foreground")}>{name ?? "Not added yet"}</p>
        <p className="text-xs text-muted-foreground">{at ?? hint}</p>
      </div>
    </div>
  )
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words whitespace-pre-line">{children || "—"}</dd>
    </div>
  )
}

interface PersonDialogProps {
  icon: LucideIcon
  label: string
  description: string
  current: string | null
  // undefined while loading.
  users: DropdownUser[] | undefined
  loadError: string | undefined
  pending: boolean
  onSave: (userId: string, close: () => void) => void
}

// Picks one user from a dropdown set up in Admin → Dropdowns.
function PersonDialog({ icon, label, description, current, users, loadError, pending, onSave }: PersonDialogProps) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState("")

  const onOpenChange = (next: boolean) => {
    if (next) setPicked(current ?? "")
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <TopBarButton icon={icon} label={label} />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {loadError ? (
          <p className="text-sm text-destructive">Could not load the list: {loadError}</p>
        ) : !users ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one can be picked yet. An admin adds people in Admin → Dropdowns.</p>
        ) : (
          <Select value={picked} onValueChange={setPicked}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a person" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Back</Button>
          </DialogClose>
          <Button disabled={!picked || picked === current || pending} onClick={() => onSave(picked, () => setOpen(false))}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
