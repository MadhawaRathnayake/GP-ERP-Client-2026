import { z } from "zod"

import type { TypeField } from "./types"

// Product lines and references, shared by the quotation form (CreateQuotationPage.tsx) and the invoice form
// (pages/Invoices/InvoiceForm.tsx), which edit lines the same way.

export const optionalAmount = z.string().regex(/^(\d+(\.\d{1,2})?)?$/, "Enter an amount, e.g. 1250.50")

// Half-up to 2 decimals, like the server.
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export interface LineValues {
  price: number
  quantity: string
  specialPrice: string
  discount: string
  discountType: "percentage" | "fixed"
}

// Preview of the server's sums (GP-ERP-Server quotations.amounts.ts): the discount comes off the line, then VAT is
// added to what's left. The server saves its own figures.
export function lineAmounts(line: LineValues, vatRate: number) {
  const unitPrice = line.specialPrice === "" ? line.price : Number(line.specialPrice)
  const subtotal = round(unitPrice * (Number(line.quantity) || 0))
  const value = Number(line.discount) || 0
  const discount = round(line.discountType === "percentage" ? (subtotal * value) / 100 : value)
  const tax = round(((subtotal - discount) * vatRate) / 100)
  return { subtotal, discount, tax, total: subtotal - discount + tax }
}

// Number fields are typed as text and converted on submit. sku is shown, not sent. price is the product's price for a
// new line and the saved price for an existing one; specialPrice replaces it when filled in.
export const lineSchema = z
  .object({
    productId: z.string(),
    sku: z.string(),
    description: z.string(),
    price: z.number(),
    quantity: z.string().regex(/^[1-9]\d*$/, "At least 1"),
    specialPrice: optionalAmount,
    discount: optionalAmount,
    discountType: z.enum(["percentage", "fixed"]),
  })
  .superRefine((line, ctx) => {
    if (line.discountType === "percentage" && Number(line.discount) > 100) {
      ctx.addIssue({ code: "custom", path: ["discount"], message: "Up to 100%" })
    } else if (line.discountType === "fixed") {
      const { subtotal, discount } = lineAmounts(line, 0)
      if (discount > subtotal) ctx.addIssue({ code: "custom", path: ["discount"], message: "More than the line" })
    }
  })

export interface ReferenceOption {
  id: string
  label: string
}

// NOT BUILT YET: the Repairs, Troubleshoots and Serial numbers modules don't exist, and old invoice numbers come from
// the old system, so these selects have no options and show as unavailable. When a module is built, load its records
// here (e.g. from its useX() hook) and check the id on the server (quotations.types.ts there).
export const referenceOptions: Record<Exclude<TypeField, "productModel">, ReferenceOption[]> = {
  repairReceiveNoteId: [],
  troubleshootId: [],
  oldInvoiceId: [],
  oldSerialNumberId: [],
}
