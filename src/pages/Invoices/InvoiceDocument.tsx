import { Document, Font, Image, Page, PDFDownloadLink, PDFViewer, StyleSheet, Text, View } from "@react-pdf/renderer"
import { DownloadIcon } from "lucide-react"

import { useSettings } from "@/app/settings"
import { Button } from "@/components/ui/button"
import { HOME_COUNTRY, useCountryName } from "@/pages/Countries/api"
import { warrantyLabel } from "@/pages/Products/types"

import { invoiceNumberOf, paymentMethodLabels, type Invoice, type InvoiceCustomer } from "./types"

// The printed tax invoice, ported point for point from the old system's (GP-System-Client/src/components/invoices/
// invoicePDFGenerator.js, createTaxInvoicePDF), so it looks the same to customers. Keep the layout, styles and wording
// as they are there. The old react-pdf (v1) took `border: true` etc. as a 1pt border and `false` as none; here they're
// written as widths. Unlike the quotation, the old invoice used Times New Roman with a bold face, so fontWeight is kept.
// Differences, because the data differs:
// - The amounts are the server's: the old Total Discount column multiplied a fixed discount by the quantity; the
//   server's discount is for the whole line. The VAT label uses the saved rate, not a hard-coded 18%.
// - VAT always applies (every invoice here is after the old VAT start date, 2024-01-08).
// - Warranty invoices print "Mode of Payment" too: the old "Collection Method" field isn't kept.
// - A service invoice always prints its Service Charge / VAT / Total rows. The old one printed them only under the
//   received items of the repair received note; the Repairs module isn't built yet, so only that table's header prints.
// - Serial numbers print under each line (with its accessories' serials), and the warranty's end date once finalized,
//   instead of the old separate serial-number page.
// Not ported: the "Inverter" extended-warranty line and the old repair error description rows.

Font.register({
  family: "TimesNewRoman",
  fonts: [{ src: "/fonts/times-new-roman.ttf" }, { src: "/fonts/times-new-roman-bold.ttf", fontWeight: "bold" }],
})

// Company details and terms, as hard-coded in the old system.
const supplier = {
  tin: "101171507",
  name: "Gunda Power (Pvt) Ltd",
  address: "No.184, Buthgamuwa Road, Rajagiriya, Sri Lanka",
  tel: "0112 805 005 / 0761 399 060 / 0761 399 063",
  email: "info@gundapower.com",
  placeOfSupply: "Buthgamuwa Road, Mahaniyara Junction",
}

const ssclNote =
  "* Social Security Contribution Levy (SSCL) imposed with effective from October 01, 2022, at the rate of 2.5% is included in the price."

const paymentTerms = [
  "* Cheques should be made payable to - Gunda Power (Pvt) Ltd",
  "* Forward scanned copy of direct bank deposit slip to : info@gundapower.com",
  "* For any queries, contact our Accountant via email: info@gundapower.com",
  "* Delayed / Overdue payment will be subject to 3% per month on outstanding balances",
  "* Price of items may change according to International Foreign Currency Exchange Rates",
]

const bankAccounts = [
  "* Gunda Power (Pvt) Ltd. - Pan Asia Banking Corporation PLC - Borella Branch -103111002175",
  "* Gunda Power (Pvt) Ltd. - Bank of Ceylon - Rajagiriya Branch - 0085933705",
  "* Gunda Power (Pvt) Ltd. - Hatton National Bank - Head Office Branch - 003010544539",
  "* Gunda Power (Pvt) Ltd. - Commercial Bank of Ceylon PLC - Corporate Branch - 1000367087",
]
const lastBankAccount = "* Gunda Power (Pvt) Ltd. - Nations Trust Bank - Gothatuwa Branch - 200 770 066 897"

// 1234.5 → "1,234.50"
const formatNumber = (value: number) => value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")

// "2026-11-04" → "11/04/2026"
const formatDay = (day: string) => {
  const [year, month, date] = day.split("-")
  return `${month}/${date}/${year}`
}

// The old address was one line, with the country's name added unless it's Sri Lanka.
function documentAddress(customer: InvoiceCustomer, countryName: string) {
  const address = [customer.houseNumber, customer.street, customer.city, customer.district].filter(Boolean).join(", ")
  return customer.country === HOME_COUNTRY ? address : [address, countryName].filter(Boolean).join(", ")
}

const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]
const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

// The old numberToWords (international format).
function numberToWords(num: number): string {
  if (num === 0) return "Zero"
  if (num < 10) return ones[num]
  if (num < 20) return teens[num - 10]
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + ones[num % 10] : "")
  if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 !== 0 ? " " + numberToWords(num % 100) : "")
  if (num < 1000000) {
    return numberToWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 !== 0 ? " " + numberToWords(num % 1000) : "")
  }
  if (num < 1000000000) {
    return numberToWords(Math.floor(num / 1000000)) + " Million" + (num % 1000000 !== 0 ? " " + numberToWords(num % 1000000) : "")
  }
  return (
    numberToWords(Math.floor(num / 1000000000)) +
    " Billion" +
    (num % 1000000000 !== 0 ? " " + numberToWords(num % 1000000000) : "")
  )
}

function amountInWords(amount: number) {
  let rupees = Math.floor(amount)
  let cents = Math.round((amount - rupees) * 100)
  if (cents >= 100) {
    rupees += 1
    cents = 0
  }
  return cents > 0 ? `${numberToWords(rupees)} Rupees and ${numberToWords(cents)} Cents Only` : `${numberToWords(rupees)} Rupees Only`
}

interface InvoiceDocumentProps {
  invoice: Invoice
  // "11/06/2026": the day it was finalized (a draft: made), in the company timezone.
  invoiceDate: string
  // The customer's country, by name (the PDF renders outside the app's data hooks).
  countryName: string
}

export function InvoiceDocument({ invoice, invoiceDate, countryName }: InvoiceDocumentProps) {
  const { customer, items } = invoice
  const number = invoiceNumberOf(invoice)
  const isService = invoice.type === "service"
  const isTypeWithReferences = invoice.type === "warranty" || isService
  const hasDiscount = !isService && items.some((item) => item.discountType !== "none")
  // Every line takes the VAT rate from the settings when it's saved, so they share one.
  const vatRate = (isService ? invoice.serviceTaxRate : items[0]?.taxRate) ?? 0
  const totalValueOfSupply = invoice.subtotal - invoice.discountTotal
  const purchaserTin = customer.tinNumber || customer.vatNumber?.split("-")[0] || "N/A"
  const modeOfPayment = invoice.paymentMethod
    ? `${paymentMethodLabels[invoice.paymentMethod]}${invoice.paymentDetails ? ` (${invoice.paymentDetails})` : ""}`
    : ""

  const summaryRow = (label: string, value: number, bold = false) => (
    <View style={styles.tableRow} wrap={false}>
      <Text style={[styles.tableCell, styles.col5, { textAlign: "left", width: "75%" }]}>{label}</Text>
      <Text style={[styles.tableCell, styles.col7, { borderLeftWidth: 0, textAlign: "right" }, bold ? { fontWeight: "bold" } : {}]}>
        Rs. {formatNumber(value)}
      </Text>
    </View>
  )

  const serviceRow = (label: string, value: number, bold = false) => (
    <View style={styles.tableRow} wrap={false}>
      <Text style={[styles.tableCell, styles.col5, styles.serviceLabel]}>{label}</Text>
      <Text style={[styles.tableCell, styles.col7, { borderLeftWidth: 0, textAlign: "right", fontSize: 11 }, bold ? { fontWeight: "bold" } : {}]}>
        Rs. {formatNumber(value)}
      </Text>
    </View>
  )

  return (
    <Document title={`${number} ${customer.name}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.logoSection}>
            {/* The old system's grey letterhead logo, from public/. */}
            <Image src="/invoice-logo.png" />
          </View>
        </View>

        <View style={styles.taxInvoiceHeaderContainer}>
          <Text style={styles.taxInvoiceTitle}>{invoice.status === "draft" ? "DRAFT INVOICE" : "TAX INVOICE"}</Text>
        </View>

        <View style={styles.topRow}>
          <View style={styles.topField}>
            <Text style={styles.label}>
              Date of Invoice: <Text style={styles.value}>{invoiceDate}</Text>
            </Text>
          </View>
          <View style={styles.topField}>
            <Text style={styles.label}>
              Tax Invoice No.: <Text style={styles.value}>{number}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.supplierPurchaserRow}>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>
              Supplier’s TIN: <Text style={styles.boxValue}>{supplier.tin}</Text>
            </Text>
            <Text style={styles.boxValue}>{supplier.name}</Text>
            <Text style={styles.boxValue}>{supplier.address}</Text>
            <Text style={styles.boxValue}>{supplier.tel}</Text>
            <Text style={styles.boxValue}>{supplier.email}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>
              Purchaser’s TIN: <Text style={styles.boxValue}>{purchaserTin}</Text>
            </Text>
            <Text style={styles.boxLabel}>
              Purchaser’s VAT: <Text style={styles.boxValue}>{customer.vatNumber || "N/A"}</Text>
            </Text>
            <Text style={styles.boxValue}>{customer.name}</Text>
            <Text style={styles.boxValue}>{documentAddress(customer, countryName)}</Text>
            <Text style={styles.boxValue}>{customer.phones.join(" / ")}</Text>
            <Text style={styles.boxValue}>{customer.email ?? ""}</Text>
          </View>
        </View>

        <View style={styles.deliverySupplyRow}>
          <View style={styles.topField}>
            <Text style={styles.label}>
              Date of Delivery: <Text style={styles.value}>{formatDay(invoice.dueDate)}</Text>
            </Text>
          </View>
          <View style={styles.topField}>
            <Text style={styles.label}>
              Place of Supply: <Text style={styles.value}>{supplier.placeOfSupply}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.additionalInfo}>
          <Text>Additional Information: </Text>
          <Text style={styles.value}>* Customer Code: {customer.code}</Text>
          {invoice.quotation && <Text style={styles.value}>* Quotation Ref.: {invoice.quotation.quotationNumber}</Text>}
          {isTypeWithReferences && (
            <Text style={styles.value}>* Invoice Type: {invoice.type === "warranty" ? "Warranty" : "Service"}</Text>
          )}
          {isTypeWithReferences && invoice.troubleshootId && (
            <Text style={styles.value}>* Troubleshooting Ref.: {invoice.troubleshootId}</Text>
          )}
          {isTypeWithReferences && invoice.oldSerialNumber && (
            <Text style={styles.value}>* Old S/N: {invoice.oldSerialNumber}</Text>
          )}
          {isTypeWithReferences && invoice.oldInvoiceNumber && (
            <Text style={styles.value}>* Old Invoice No.: {invoice.oldInvoiceNumber}</Text>
          )}
          <Text style={styles.value}>{ssclNote}</Text>
        </View>

        <View style={styles.table}>
          {isService ? (
            <View style={styles.tableHeader}>
              <View style={[styles.headerCell, styles.col1]}>
                <Text style={{ textAlign: "center" }}>#</Text>
              </View>
              <View style={[styles.headerCell, styles.serviceColSku]}>
                <Text style={{ textAlign: "center" }}>SKU</Text>
              </View>
              <View style={[styles.headerCell, styles.serviceColModel]}>
                <Text style={{ textAlign: "center" }}>Model</Text>
              </View>
              <View style={[styles.headerCell, styles.serviceColCategory]}>
                <Text style={{ textAlign: "center" }}>Category</Text>
              </View>
              <View style={[styles.headerCell, styles.serviceColSerial, { borderRightWidth: 0 }]}>
                <Text style={{ textAlign: "center" }}>Serial Number</Text>
              </View>
            </View>
          ) : (
            <View style={styles.tableHeader}>
              <View style={[styles.headerCell, styles.col1]}>
                <Text style={{ textAlign: "center" }}>Reference</Text>
              </View>
              <View style={[styles.headerCell, styles.col2, hasDiscount ? {} : { width: "35%" }]}>
                <Text style={{ textAlign: "center" }}>Item Description</Text>
              </View>
              <View style={[styles.headerCell, styles.col3]}>
                <Text style={{ textAlign: "center" }}>Qty.</Text>
              </View>
              <View style={[styles.headerCell, styles.col4, hasDiscount ? {} : { width: "20%" }]}>
                <Text style={{ textAlign: "center" }}>Unit Price</Text>
              </View>
              {hasDiscount && (
                <View style={[styles.headerCell, styles.col5]}>
                  <Text style={{ textAlign: "center" }}>Total Discount</Text>
                </View>
              )}
              <View style={[styles.headerCell, styles.col7, hasDiscount ? {} : { width: "25%" }, { borderRightWidth: 0 }]}>
                <Text style={{ textAlign: "center" }}>Amount Excluding VAT (Rs.)</Text>
              </View>
            </View>
          )}

          {!isService &&
            items.map((item, index) => {
              const serials = invoice.serialPicks
                .filter((pick) => pick.productId === item.productId)
                .map(({ serialItem }) => [serialItem.serialNumber, ...serialItem.accessories.map((accessory) => accessory.serialNumber)].join(" / "))
              return (
              // A line with many serials may run onto the next page.
              <View style={styles.tableRow} wrap={serials.length > 20} key={item.id}>
                <Text style={[styles.tableCell, styles.col1]}>{index + 1}</Text>
                <View style={[styles.tableCell, styles.col2, hasDiscount ? {} : { width: "35%" }]}>
                  <Text>{item.description}</Text>
                  {item.product.description && <Text>{item.product.description}</Text>}
                  <Text>{item.product.sku}</Text>
                  {invoice.type !== "warranty" && item.warrantyMonths > 0 && (
                    <Text>
                      Warranty Period - {warrantyLabel(item.warrantyMonths)}
                      {item.warrantyEndsAt && ` (until ${item.warrantyEndsAt.split("-").reverse().join("/")})`}
                    </Text>
                  )}
                  {serials.length > 0 && <Text>S/N: {serials.join(", ")}</Text>}
                </View>
                <Text style={[styles.tableCell, styles.col3]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.col4, hasDiscount ? {} : { width: "20%" }, { textAlign: "right" }]}>
                  {formatNumber(item.unitPrice)}
                </Text>
                {hasDiscount && (
                  <Text style={[styles.tableCell, styles.col5, { textAlign: "right" }]}>
                    {item.discountType === "none" ? "-" : formatNumber(item.discountAmount)}
                  </Text>
                )}
                <Text style={[styles.tableCell, styles.col7, hasDiscount ? {} : { width: "25%" }, { textAlign: "right" }]}>
                  {formatNumber(item.subtotal - item.discountAmount)}
                </Text>
              </View>
              )
            })}

          {!isService && items.length > 0 && (
            <View>
              {summaryRow("Total Value of Supply", totalValueOfSupply)}
              {summaryRow(`VAT Amount (Total Value of Supply @ ${vatRate}%)`, invoice.taxTotal)}
              {summaryRow("Total Amount including VAT", invoice.grandTotal, true)}
            </View>
          )}

          {isService && (
            <View style={{ marginTop: 10 }}>
              {serviceRow("Service Charge", invoice.serviceCharge ?? 0)}
              {serviceRow(`${vatRate}% VAT`, invoice.taxTotal)}
              {serviceRow("TOTAL", invoice.grandTotal, true)}
            </View>
          )}
        </View>

        <View style={styles.bottomFields}>
          <Text style={styles.bottomField}>
            Total Amount in words: <Text style={{ fontWeight: "bold" }}>{amountInWords(invoice.grandTotal)}</Text>
          </Text>
          <Text style={styles.bottomField}>
            Mode of Payment: <Text style={{ fontWeight: "bold" }}>{modeOfPayment}</Text>
          </Text>
        </View>

        <View style={styles.notes}>
          <View wrap={false}>
            <Text style={styles.h2}>Terms and Conditions: Payment</Text>
            {paymentTerms.map((line) => (
              <Text key={line} style={styles.notesText}>
                {line}
              </Text>
            ))}
          </View>
          <View wrap={false}>
            <Text style={[styles.h2, { marginTop: 10 }]}>Banking Information</Text>
            {bankAccounts.map((line) => (
              <Text key={line} style={styles.notesText}>
                {line}
              </Text>
            ))}
            <Text>{lastBankAccount}</Text>
            <Text style={styles.footer} fixed>
              This is a system generated invoice. Signature is not required.
            </Text>
          </View>
        </View>

        <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  )
}

// The PDF on the page and a download button. Loaded on its own (React.lazy), so the PDF library is only fetched when
// an invoice is opened.
export function InvoicePdf({ invoice }: { invoice: Invoice }) {
  const { data: settings } = useSettings()
  const countryName = useCountryName()(invoice.customer.country)
  const invoiceDate = new Intl.DateTimeFormat("en-US", {
    timeZone: settings?.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(invoice.finalizedAt ?? invoice.createdAt))
  const isDraft = invoice.status === "draft"
  const document = <InvoiceDocument invoice={invoice} invoiceDate={invoiceDate} countryName={countryName} />
  return (
    <div className="space-y-2">
      <PDFDownloadLink document={document} fileName={`${invoiceNumberOf(invoice)} ${invoice.customer.name}.pdf`}>
        {({ loading, error }) => (
          <Button type="button" disabled={loading || Boolean(error)}>
            <DownloadIcon />
            {error
              ? "Could not make the PDF"
              : loading
                ? "Preparing PDF…"
                : isDraft
                  ? "Download draft invoice"
                  : "Download tax invoice"}
          </Button>
        )}
      </PDFDownloadLink>
      {/* A4 is 210 × 297 mm; the extra height leaves room for the viewer's margins around the page. */}
      <PDFViewer className="aspect-[210/310] w-full rounded-md border" showToolbar={false}>
        {document}
      </PDFViewer>
    </div>
  )
}

// Same names and values as the old taxInvoiceStyles (only the ones used), with `border: true` written as a 1pt width.
const styles = StyleSheet.create({
  page: {
    backgroundColor: "white",
    marginHorizontal: 30,
    fontSize: 9.5,
    paddingTop: 30,
    paddingBottom: 10,
    fontFamily: "TimesNewRoman",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "90%",
  },
  logoSection: {
    width: "15%",
  },
  taxInvoiceHeaderContainer: {
    width: "90%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    textAlign: "center",
  },
  taxInvoiceTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    width: "100%",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    width: "90%",
  },
  topField: {
    width: "48%",
  },
  label: {
    borderWidth: 1,
    borderColor: "black",
    padding: 5,
  },
  value: {
    fontSize: 9,
  },
  supplierPurchaserRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    width: "90%",
  },
  // The old supplierBox and purchaserBox, which were the same.
  box: {
    width: "48%",
    borderWidth: 1,
    borderColor: "black",
    padding: 5,
  },
  boxLabel: {
    marginBottom: 2,
  },
  boxValue: {
    marginBottom: 2,
  },
  deliverySupplyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    width: "90%",
  },
  additionalInfo: {
    borderWidth: 1,
    borderColor: "black",
    padding: 5,
    marginBottom: 12,
    minHeight: 40,
    width: "90%",
  },
  table: {
    marginBottom: 12,
    width: "90%",
  },
  tableHeader: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    backgroundColor: "#ffffff",
    justifyContent: "space-between",
    borderRightWidth: 1,
    borderRightColor: "black",
    width: "100%",
  },
  headerCell: {
    borderLeftWidth: 1,
    borderColor: "black",
    paddingVertical: 5,
    fontWeight: "bold",
    textTransform: "capitalize",
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderTopWidth: 1,
    marginTop: -1,
    borderRightWidth: 1,
    borderRightColor: "black",
    marginLeft: "auto",
    width: "100%",
  },
  tableCell: {
    borderLeftWidth: 1,
    borderColor: "black",
    padding: 3,
  },
  col1: {
    width: "12%",
    textAlign: "center",
  },
  col2: {
    width: "30%",
  },
  col3: {
    width: "8%",
    textAlign: "center",
  },
  col4: {
    width: "15%",
  },
  col5: {
    width: "15%",
  },
  col7: {
    width: "20%",
  },
  serviceColSku: {
    width: "19%",
  },
  serviceColModel: {
    width: "25%",
  },
  serviceColCategory: {
    width: "25%",
  },
  serviceColSerial: {
    width: "19%",
  },
  // The old inline style of the service summary labels.
  serviceLabel: {
    textAlign: "left",
    width: "75%",
    fontWeight: "bold",
    textTransform: "uppercase",
    fontSize: 11,
  },
  bottomFields: {
    width: "90%",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "black",
    padding: 5,
    minHeight: 30,
  },
  bottomField: {
    marginBottom: 3,
  },
  h2: {
    textDecoration: "underline",
    marginBottom: 5,
  },
  notes: {
    fontSize: 8.5,
  },
  notesText: {
    maxWidth: "90%",
  },
  pageNumber: {
    position: "absolute",
    right: 60,
    top: 20,
    fontSize: 9,
    color: "grey",
  },
  footer: {
    marginVertical: 15,
    left: "27%",
  },
})
