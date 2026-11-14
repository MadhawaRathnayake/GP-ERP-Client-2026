import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon, ListChecksIcon } from "lucide-react"
import { useFieldArray, useForm } from "react-hook-form"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { z } from "zod"

import { useSettings } from "@/app/settings"
import { QueryError } from "@/components/StatusView"
import { TopBarActions } from "@/components/TopBarActions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProductThumbnail } from "@/pages/Quotations/ProductPickerDialog"

import { useAddDelivery, useCreateGoodsReceivedNote, useOrderReceipt } from "./api"
import type { DeliveryFields, OrderReceipt } from "./types"

const schema = z.object({
  receivedDate: z.string().min(1, "Choose the date"),
  supplierInvoiceNumber: z.string().trim().max(100),
  remarks: z.string().trim().max(500),
  lines: z
    .array(
      z
        .object({
          productId: z.string(),
          // Typed as text and converted on submit.
          quantity: z.string().regex(/^\d{1,7}$/, "Whole number, 0 or more"),
          remarks: z.string().trim().max(500),
          // What is still outstanding on the order; the server refuses more.
          outstanding: z.number(),
        })
        .superRefine((line, ctx) => {
          if (Number(line.quantity) > line.outstanding) {
            ctx.addIssue({ code: "custom", path: ["quantity"], message: `At most ${line.outstanding}` })
          }
        }),
    )
    .refine((lines) => lines.some((line) => Number(line.quantity) > 0), "Receive at least one product"),
})

type DeliveryValues = z.infer<typeof schema>

// "purchase order GPPO-0001" or "international IR GPIR-0003": what the goods are received against.
function orderLabel(receipt: Pick<OrderReceipt, "purchaseOrder" | "internalRequisitionNumber">) {
  return receipt.purchaseOrder
    ? `purchase order ${receipt.purchaseOrder.purchaseOrderNumber}`
    : `international IR ${receipt.internalRequisitionNumber}`
}

// Records a delivery (e.g. one container) of an order: the first one makes the order's GRN, later ones are added to it.
export function CreateGoodsReceivedNotePage() {
  const [searchParams] = useSearchParams()
  const requisitionId = searchParams.get("internalRequisitionId")

  return (
    <div className="space-y-4">
      <TopBarActions>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/goods-received-notes">
            <ArrowLeftIcon />
            Back to goods received notes
          </Link>
        </Button>
      </TopBarActions>
      {requisitionId ? (
        <DeliveryForOrder internalRequisitionId={requisitionId} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Goods are received against an approved purchase order or an approved international internal requisition:
          open it and choose "Record delivery".
        </p>
      )}
    </div>
  )
}

function DeliveryForOrder({ internalRequisitionId }: { internalRequisitionId: string }) {
  const navigate = useNavigate()
  const receipt = useOrderReceipt(internalRequisitionId)
  const createNote = useCreateGoodsReceivedNote()
  const addDelivery = useAddDelivery()

  if (receipt.isPending) return <p className="text-sm text-muted-foreground">Loading the order…</p>
  if (receipt.isError) return <QueryError error={receipt.error} />
  // The server refuses it too; say why instead of showing a form that can't be saved.
  if (receipt.data.blockedReason) return <p className="text-sm text-muted-foreground">{receipt.data.blockedReason}.</p>

  const existing = receipt.data.goodsReceivedNote
  const open = (id: number) => navigate(`/goods-received-notes/${id}`)
  const hasSerialLines = receipt.data.lines.some((line) => line.product.trackingType === "serial")
  return (
    <DeliveryForm
      title={`Record a delivery of ${orderLabel(receipt.data)}${existing ? ` on ${existing.grnNumber}` : ""}`}
      note={
        hasSerialLines
          ? "Counted products go into stock when it's saved. Serial-numbered products go into stock as their serial numbers are added, the next step."
          : "The products go into stock when it's saved."
      }
      pending={createNote.isPending || addDelivery.isPending}
      receipt={receipt.data}
      onSubmit={(fields) =>
        existing
          ? addDelivery.mutate({ id: existing.id, ...fields }, { onSuccess: (note) => open(note.id) })
          : createNote.mutate(
              { internalRequisitionId: receipt.data.internalRequisitionId, ...fields },
              { onSuccess: (note) => open(note.id) },
            )
      }
    />
  )
}

interface DeliveryFormProps {
  title: string
  pending: boolean
  // The order's lines, with what is still outstanding.
  receipt: OrderReceipt
  // Shown above the submit button.
  note: string
  onSubmit: (fields: DeliveryFields) => void
}

// One line per order line, as the old form had: what came this time, at most what is still outstanding, 0 for what
// didn't come. "Prepared by" isn't asked: it's who saves it.
function DeliveryForm({ title, pending, receipt, note, onSubmit }: DeliveryFormProps) {
  const { data: settings } = useSettings()
  const form = useForm<DeliveryValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      // Dated today (company timezone, YYYY-MM-DD) unless changed.
      receivedDate: new Date().toLocaleDateString("en-CA", { timeZone: settings?.timezone }),
      supplierInvoiceNumber: "",
      remarks: "",
      lines: receipt.lines.map((line) => ({ productId: line.productId, quantity: "0", remarks: "", outstanding: line.outstandingQuantity })),
    },
  })
  const lines = useFieldArray({ control: form.control, name: "lines" })
  const linesError = form.formState.errors.lines?.message ?? form.formState.errors.lines?.root?.message
  const hasErrors = Object.keys(form.formState.errors).length > 0

  const receiveEverything = () =>
    receipt.lines.forEach((line, index) =>
      form.setValue(`lines.${index}.quantity`, String(line.outstandingQuantity), { shouldDirty: true, shouldValidate: true }),
    )

  const submit = (values: DeliveryValues) =>
    onSubmit({
      receivedDate: values.receivedDate,
      supplierInvoiceNumber: values.supplierInvoiceNumber || null,
      remarks: values.remarks || null,
      items: values.lines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity), remarks: line.remarks || null })),
    })

  const order: [string, string][] = [
    ["Internal requisition", receipt.internalRequisitionNumber],
    ["Purchase order", receipt.purchaseOrder?.purchaseOrderNumber ?? "None (international)"],
    ["Supplier", `${receipt.supplier.code} - ${receipt.supplier.name}`],
    ...(receipt.goodsReceivedNote ? ([["GRN", receipt.goodsReceivedNote.grnNumber]] satisfies [string, string][]) : []),
  ]

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
              {order.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="receivedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date received</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplierInvoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier invoice number</FormLabel>
                    <FormControl>
                      <Input maxLength={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Input maxLength={500} placeholder="Optional, e.g. container no." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Products received</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={receiveEverything}>
              <ListChecksIcon />
              Everything outstanding came
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received before</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Received now</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.fields.map((field, index) => {
                  const line = receipt.lines[index]
                  if (!line) return null
                  return (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">
                        {line.product.sku}
                        {line.product.trackingType === "serial" && <span className="block text-xs text-muted-foreground">Serial numbers</span>}
                      </TableCell>
                      <TableCell className="max-w-64 whitespace-normal">{line.product.title}</TableCell>
                      <TableCell>
                        <ProductThumbnail src={line.product.imageUrl} alt={line.product.title} />
                      </TableCell>
                      <TableCell className="text-right">{line.orderedQuantity}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{line.receivedQuantity}</TableCell>
                      <TableCell className="text-right">{line.outstandingQuantity}</TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`lines.${index}.quantity`}
                          render={({ field: input }) => (
                            <FormItem>
                              <FormControl>
                                <Input className="w-20" inputMode="numeric" disabled={line.outstandingQuantity === 0} {...input} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`lines.${index}.remarks`}
                          render={({ field: input }) => (
                            <FormItem>
                              <FormControl>
                                <Input className="min-w-40" maxLength={500} placeholder="Optional" {...input} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {linesError && (
              <p role="alert" className="text-sm text-destructive">
                {linesError}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {hasErrors ? (
            <p className="text-sm text-destructive">Fill in the fields marked in red above.</p>
          ) : (
            <p className="text-sm text-muted-foreground">{note}</p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Record delivery"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
