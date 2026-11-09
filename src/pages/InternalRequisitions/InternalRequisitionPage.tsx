import { ArrowLeftIcon, BanIcon, CheckIcon, PencilIcon, XIcon } from "lucide-react"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { ProductThumbnail } from "@/pages/Quotations/ProductPickerDialog"
import { ConfirmButton } from "@/pages/Quotations/QuotationPage"

import {
  useApproveInternalRequisition,
  useCancelInternalRequisition,
  useInternalRequisition,
  useRejectInternalRequisition,
} from "./api"
import { InternalRequisitionStatusLabel } from "./InternalRequisitionsPage"
import { isCancelled, isEditable } from "./types"

export function InternalRequisitionPage() {
  const { id = "" } = useParams()
  const can = useCan()
  const format = useFormat()
  const { data: requisition, isPending, isError, error } = useInternalRequisition(id)
  const approve = useApproveInternalRequisition()
  const reject = useRejectInternalRequisition()
  const cancel = useCancelInternalRequisition()

  if (isPending || isError) {
    return (
      <div className="space-y-4">
        <BackLink />
        {isPending ? <p className="text-sm text-muted-foreground">Loading internal requisition…</p> : <QueryError error={error} />}
      </div>
    )
  }

  const { status, internalRequisitionNumber: number } = requisition
  // Who did it and when, e.g. "9 Nov 2026, 10:15 by Nimal".
  const when = (at: string | null, by: { name: string } | null) =>
    at ? `${format.dateTime(at)}${by ? ` by ${by.name}` : ""}` : "—"

  const details: [string, ReactNode][] = [
    ["IR number", number],
    ["Status", <InternalRequisitionStatusLabel status={status} />],
    ["Date", format.date(requisition.createdAt)],
    [
      "Supplier",
      can("SUPPLIERS.VIEW") ? (
        <Link to={`/suppliers/${requisition.supplierId}`} className="hover:underline">
          {requisition.supplier.code} - {requisition.supplier.name}
        </Link>
      ) : (
        `${requisition.supplier.code} - ${requisition.supplier.name}`
      ),
    ],
    ["Supplier VAT number", requisition.supplier.vatNumber ?? "—"],
    ["Local / international", requisition.isInternational ? "International (no purchase order)" : "Local"],
    ["ETA", requisition.eta ? format.date(requisition.eta) : "Not set"],
    ["Prepared by", requisition.creator?.name ?? "—"],
    ["Created", when(requisition.createdAt, requisition.creator)],
    ...(isCancelled(status)
      ? ([
          ["Cancelled", when(requisition.cancelledAt, requisition.canceller)],
          ["Reason for cancelling", requisition.cancelReason ?? "—"],
        ] satisfies [string, ReactNode][])
      : []),
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Internal requisition {number}</h1>
      <BackLink />
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {status === "pending" && can("INTERNAL_REQUISITIONS.APPROVE") && (
            <ConfirmButton
              icon={<CheckIcon />}
              label="Approve"
              title={`Approve ${number}?`}
              description="It can't be edited after this."
              pending={approve.isPending}
              onConfirm={(close) => approve.mutate(requisition.id, { onSuccess: close })}
            />
          )}
          {status === "pending" && can("INTERNAL_REQUISITIONS.REJECT") && (
            <ReasonButton
              icon={<XIcon />}
              label="Reject"
              title={`Reject ${number}?`}
              description="It goes back to whoever can edit it, who can change it and submit it again."
              pending={reject.isPending}
              onConfirm={(reason, close) => reject.mutate({ id: requisition.id, reason }, { onSuccess: close })}
            />
          )}
          {!isCancelled(status) && can("INTERNAL_REQUISITIONS.CANCEL") && (
            <ReasonButton
              icon={<BanIcon />}
              label="Cancel IR"
              title={`Cancel ${number}?`}
              description="This can't be undone."
              destructive
              pending={cancel.isPending}
              onConfirm={(reason, close) => cancel.mutate({ id: requisition.id, reason }, { onSuccess: close })}
            />
          )}
          {isEditable(status) && can("INTERNAL_REQUISITIONS.EDIT") && (
            <Button asChild>
              <Link to={`/internal-requisitions/${requisition.id}/edit`}>
                <PencilIcon />
                {status === "rejected" ? "Edit & resubmit" : "Edit"}
              </Link>
            </Button>
          )}
        </div>
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
              <TableHead className="text-right">Available qty</TableHead>
              <TableHead className="text-right">Minimum stock</TableHead>
              <TableHead className="text-right">Order qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requisition.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.lineNo}</TableCell>
                <TableCell>{item.product.sku}</TableCell>
                <TableCell className="whitespace-normal">{item.product.title}</TableCell>
                <TableCell>
                  <ProductThumbnail src={item.product.imageUrl} alt={item.product.title} />
                </TableCell>
                <TableCell className="text-right">{item.stockInHand}</TableCell>
                <TableCell className="text-right">{item.minimumStock}</TableCell>
                <TableCell className="text-right font-medium">{item.quantity}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-sm text-muted-foreground">Available qty and minimum stock are as they were when the IR was saved.</p>

        <section className="max-w-3xl space-y-2">
          <h2 className="text-lg font-semibold">Approval history</h2>
          {requisition.approvals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No decisions yet.</p>
          ) : (
            <ul className="border-t">
              {requisition.approvals.map((approval) => (
                <li key={approval.id} className="space-y-1 border-b px-2 py-3">
                  <p>
                    <span
                      className={cn("font-medium", approval.decision === "approved" ? "text-status-confirmed" : "text-destructive")}
                    >
                      {approval.decision === "approved" ? "Approved" : "Rejected"}
                    </span>
                    {approval.isAutomatic && <span className="text-muted-foreground"> automatically (approval was off)</span>}{" "}
                    <span className="text-sm text-muted-foreground">{when(approval.createdAt, approval.creator)}</span>
                  </p>
                  {approval.reason && <p className="text-sm whitespace-pre-line">{approval.reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

interface ReasonButtonProps {
  icon: ReactNode
  label: string
  title: string
  description: string
  destructive?: boolean
  pending: boolean
  // `close` closes the dialog; call it when the action succeeds.
  onConfirm: (reason: string, close: () => void) => void
}

// Like ConfirmButton, but the action needs a reason (reject, cancel).
function ReasonButton({ icon, label, title, description, destructive, pending, onConfirm }: ReasonButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const changeOpen = (next: boolean) => {
    if (!next) setReason("")
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button variant={destructive ? "destructive" : "outline"}>
          {icon}
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason">Reason</Label>
          <Input id="reason" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Back</Button>
          </DialogClose>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending || reason.trim() === ""}
            onClick={() => onConfirm(reason.trim(), () => changeOpen(false))}
          >
            {pending ? "Saving…" : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to="/internal-requisitions">
        <ArrowLeftIcon />
        Back to internal requisitions
      </Link>
    </Button>
  )
}
