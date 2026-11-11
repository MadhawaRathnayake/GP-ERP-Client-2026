import { ArrowLeftIcon, UserCheckIcon, UserPlusIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"

import { useCan } from "@/app/auth"
import { useFormat } from "@/app/settings"
import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProductThumbnail } from "@/pages/Quotations/ProductPickerDialog"
import { typeLabels } from "@/pages/Quotations/types"

import { useDeliveryNote, useItemIssuers, useItemVerifiers, useSetItemIssuer, useSetItemVerifier } from "./api"
import { DeliveryNoteProgress, DeliveryNoteStatusLabel } from "./DeliveryNotesPage"
import type { DropdownUser } from "./types"

export function DeliveryNotePage() {
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
      <div className="space-y-4">
        <TopBarActions>
          <BackLink />
        </TopBarActions>
        {isPending ? <p className="text-sm text-muted-foreground">Loading delivery note…</p> : <QueryError error={error} />}
      </div>
    )
  }

  const { invoice } = note
  const details: [string, ReactNode][] = [
    ["Delivery note number", note.deliveryNoteNumber],
    ["Status", <DeliveryNoteStatusLabel status={note.status} />],
    [
      "Invoice",
      <Link to={`/invoices/${invoice.id}`} className="hover:underline">
        {invoice.invoiceNumber ?? invoice.id}
      </Link>,
    ],
    ["Type", typeLabels[invoice.type]],
    [
      "Customer",
      <Link to={`/customers/${invoice.customer.id}`} className="hover:underline">
        {invoice.customer.code} - {invoice.customer.name}
      </Link>,
    ],
    ["Deliver to", <span className="whitespace-pre-line">{invoice.deliveryLocation ?? "—"}</span>],
    ["Item verifier", note.itemVerifier?.name ?? "—"],
    ["Item issuer", note.itemIssuer?.name ?? "—"],
    ["Created", `${format.dateTime(note.createdAt)}${note.creator ? ` by ${note.creator.name}` : ""}`],
    ...(note.issuedAt ? [["Issued", format.dateTime(note.issuedAt)] satisfies [string, ReactNode]] : []),
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">
        {isDraft ? "Draft delivery note" : "Delivery note"} {note.deliveryNoteNumber}
      </h1>
      <div className="space-y-6">
        <div className="max-w-3xl px-2">
          <DeliveryNoteProgress note={note} />
        </div>
        <TopBarActions>
          <BackLink />
          {canSetVerifier && (
            <PersonDialog
              icon={<UserCheckIcon />}
              label={note.itemVerifierId ? "Change item verifier" : "Add item verifier"}
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
              icon={<UserPlusIcon />}
              label="Add item issuer"
              description={`The person who issues the items. It can't be the item verifier (${note.itemVerifier?.name}). This issues the delivery note, and neither person can be changed after it.`}
              current={null}
              // The issuer has to be someone other than the verifier.
              users={issuers.data?.filter((user) => user.id !== note.itemVerifierId)}
              loadError={issuers.error?.message}
              pending={setIssuer.isPending}
              onSave={(userId, close) => setIssuer.mutate({ id: note.id, userId }, { onSuccess: close })}
            />
          )}
        </TopBarActions>
        <dl className="max-w-3xl border-t">
          {details.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[minmax(8rem,14rem)_1fr] gap-4 border-b px-2 py-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Image</TableHead>
              <TableHead className="text-right">Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item) => (
              <TableRow key={item.lineNo}>
                <TableCell>{item.lineNo}</TableCell>
                <TableCell>{item.product.sku}</TableCell>
                <TableCell className="whitespace-normal">{item.description}</TableCell>
                <TableCell>
                  <ProductThumbnail src={item.product.imageUrl} alt={item.description} />
                </TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

interface PersonDialogProps {
  icon: ReactNode
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
        <Button variant="outline">
          {icon}
          {label}
        </Button>
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

function BackLink() {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to="/delivery-notes">
        <ArrowLeftIcon />
        Back to delivery notes
      </Link>
    </Button>
  )
}
