import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon, ListChecksIcon } from "lucide-react"
import { useMemo, type ReactNode } from "react"
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

import { useCreateGoodsReceivedNote, useOrderReceipt } from "./api"
import type { GoodsReceivedNote, GoodsReceivedNoteFields, OrderReceipt } from "./types"

const schema = z.object({
  receivedDate: z.string().min(1, "Choose the date"),
  supplierInvoiceNumber: z.string().trim().max(100),
  lines: z
    .array(
      z
        .object({
          productId: z.string(),
          // Typed as text and converted on submit.
          receivedQuantity: z.string().regex(/^\d{1,7}$/, "Whole number, 0 or more"),
          remarks: z.string().trim().max(500),
          // What is still outstanding on the order; the server refuses more.
          outstanding: z.number(),
        })
        .superRefine((line, ctx) => {
          if (Number(line.receivedQuantity) > line.outstanding) {
            ctx.addIssue({ code: "custom", path: ["receivedQuantity"], message: `At most ${line.outstanding}` })
          }
        }),
    )
    .refine((lines) => lines.some((line) => Number(line.receivedQuantity) > 0), "Receive at least one product"),
})

type GoodsReceivedNoteValues = z.infer<typeof schema>

// "purchase order GPPO-0001" or "international IR GPIR-0003": what the goods are received against.
function orderLabel(receipt: Pick<OrderReceipt, "purchaseOrder" | "internalRequisitionNumber">) {
  return receipt.purchaseOrder
    ? `purchase order ${receipt.purchaseOrder.purchaseOrderNumber}`
    : `international IR ${receipt.internalRequisitionNumber}`
}

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
        <CreateForOrder internalRequisitionId={requisitionId} />
      ) : (
        <p className="text-sm text-muted-foreground">
          A GRN is made from an approved purchase order or an approved international internal requisition: open it and
          choose "Create GRN".
        </p>
      )}
    </div>
  )
}

function CreateForOrder({ internalRequisitionId }: { internalRequisitionId: string }) {
  const navigate = useNavigate()
  const receipt = useOrderReceipt(internalRequisitionId)
  const createNote = useCreateGoodsReceivedNote()

  if (receipt.isPending) return <p className="text-sm text-muted-foreground">Loading the order…</p>
  if (receipt.isError) return <QueryError error={receipt.error} />
  // The server refuses it too; say why instead of showing a form that can't be saved.
  if (receipt.data.blockedReason) return <p className="text-sm text-muted-foreground">{receipt.data.blockedReason}.</p>

  return (
    <GoodsReceivedNoteForm
      title={`Create GRN for ${orderLabel(receipt.data)}`}
      submitLabel="Create GRN"
      note="Once approved, the received quantities go into stock."
      pending={createNote.isPending}
      receipt={receipt.data}
      onSubmit={(fields) =>
        createNote.mutate(
          { internalRequisitionId: receipt.data.internalRequisitionId, ...fields },
          { onSuccess: (created) => navigate(`/goods-received-notes/${created.id}`) },
        )
      }
    />
  )
}

interface GoodsReceivedNoteFormProps {
  title: string
  submitLabel: string
  pending: boolean
  // The order's lines, with what is still outstanding (approved GRNs only, so not this one).
  receipt: OrderReceipt
  // Edit passes the saved GRN; create starts every line at 0.
  goodsReceivedNote?: GoodsReceivedNote
  // Shown above the submit button.
  note?: ReactNode
  onSubmit: (fields: GoodsReceivedNoteFields) => void
}

// Shared by the create and edit pages. One line per order line, as the old form had: what came this time, at most what
// is still outstanding, 0 for what didn't come. "Prepared by" isn't asked: it's who saves it.
export function GoodsReceivedNoteForm({ title, submitLabel, pending, receipt, goodsReceivedNote, note, onSubmit }: GoodsReceivedNoteFormProps) {
  const { data: settings } = useSettings()
  const savedItems = useMemo(() => new Map(goodsReceivedNote?.items.map((item) => [item.productId, item])), [goodsReceivedNote])

  const form = useForm<GoodsReceivedNoteValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      // A new GRN is dated today (company timezone, YYYY-MM-DD) unless changed.
      receivedDate: goodsReceivedNote?.receivedDate ?? new Date().toLocaleDateString("en-CA", { timeZone: settings?.timezone }),
      supplierInvoiceNumber: goodsReceivedNote?.supplierInvoiceNumber ?? "",
      lines: receipt.lines.map((line) => {
        const saved = savedItems.get(line.productId)
        return {
          productId: line.productId,
          receivedQuantity: String(saved?.receivedQuantity ?? 0),
          remarks: saved?.remarks ?? "",
          outstanding: line.outstandingQuantity,
        }
      }),
    },
  })
  const lines = useFieldArray({ control: form.control, name: "lines" })
  const linesError = form.formState.errors.lines?.message ?? form.formState.errors.lines?.root?.message
  const hasErrors = Object.keys(form.formState.errors).length > 0

  const receiveEverything = () =>
    receipt.lines.forEach((line, index) =>
      form.setValue(`lines.${index}.receivedQuantity`, String(line.outstandingQuantity), { shouldDirty: true, shouldValidate: true }),
    )

  const submit = (values: GoodsReceivedNoteValues) =>
    onSubmit({
      receivedDate: values.receivedDate,
      supplierInvoiceNumber: values.supplierInvoiceNumber || null,
      items: values.lines.map((line) => ({
        productId: line.productId,
        receivedQuantity: Number(line.receivedQuantity),
        remarks: line.remarks || null,
      })),
    })

  const order: [string, string][] = [
    ["Internal requisition", receipt.internalRequisitionNumber],
    ["Purchase order", receipt.purchaseOrder?.purchaseOrderNumber ?? "None (international)"],
    ["Supplier", `${receipt.supplier.code} - ${receipt.supplier.name}`],
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
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="receivedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
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
                      <TableCell className="font-medium">{line.product.sku}</TableCell>
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
                          name={`lines.${index}.receivedQuantity`}
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
            note && <p className="text-sm text-muted-foreground">{note}</p>
          )}
          <Button type="submit" disabled={pending || (goodsReceivedNote !== undefined && !form.formState.isDirty)}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
