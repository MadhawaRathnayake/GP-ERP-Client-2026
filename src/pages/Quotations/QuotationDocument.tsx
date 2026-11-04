import { Document, Image, Page, PDFDownloadLink, PDFViewer, StyleSheet, Text, View } from "@react-pdf/renderer"
import { DownloadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

import { quotationNumber, type DocumentCustomer, type Quotation } from "./types"

// The printed quotation, ported point for point from the old system's PDF (GP-System-Client/src/components/
// pdfGenerator.js, document "quotation"), so it looks the same to customers. Keep the layout, styles and wording as
// they are there, typos included. Differences, because the data differs: no Payment Terms row, the sales person is the
// quotation's sales manager, and the amounts are the server's (the old Total Discount column multiplied a fixed discount
// by the quantity; the server's discount is for the whole line).

// Company details, as hard-coded in the old system.
const sender = {
  address: "184, Buthgamuwa Road",
  city: "Rajagiriya, Sri Lanka",
  vatRegistration: "VAT Registration No: 101171507-7000",
  tin: "TIN No: 101171507",
  tel: "0112 805 005 / 0761 399 060 / 0761 399 063",
  web: "info@gundapower.com / www.gundapower.com",
}

const warrantyTerms = [
  "* Invoice / Warranty card must be produced for warranty claims.",
  "* For warranty claims, contact Gunda Power (Pvt) Ltd on 0777 275 626 / 0112872395",
  "* Good sold are not refundable / returned or exchangeable under any circumstances.",
  "* Wear and tear on wiring, scratches, stains, etc..that do not affect the function of goods, wiring & other accessories on equipment cannot be claimed under warranty.",
  "* Natural perils, misuse of equipment, burnt marks, repairs made by 3rd party other than Gunda Power (Pvt) Ltd. and any tampering or misuse of equipment renders the warranty void.",
  '* Installers and End Consumers are advised to insure the Solar System under "General Insurance Policy", as under no circumstances will Gunda Power (Pvt) Ltd be liable for consequential, special, direct/indirect, incidental, punitive damages, losses or expenses occurred in any such situations.',
  "* Anyone installing batteries that are not compatible with Solis will take the risk of warranty not being honored by the manufacturer company. Similarly we Gunda Power will also not issue replacements if Manufacturer does not advice us to offer this.",
]

const paymentTerms = [
  "* This quotation is only valid for 3 days.",
  "* Cheques should be made payable to - Gunda Power (Pvt) Ltd",
  "* Forward scanned copy of direct bank deposit slip to : info@gundapower.com",
  "* For any querries contact our Accountnatnt on email - info@gundapower.com",
  "* Delayed / Overdue payment will be subject to 3% per month on outstanding balances",
  "* Price on items may change according to International Foreign Currency Exchange Rates",
]

const bankAccounts = [
  "* Gunda Power (Pvt) Ltd. - Pan Asia Banking Corporation PLC - Borella Branch -103111002175",
  "* Gunda Power (Pvt) Ltd. - Bank of Ceylon - Rajagiriya Branch - 0085933705",
  "* Gunda Power (Pvt) Ltd. - Hatton National Bank - Head Office Branch - 003010544539",
  "* Gunda Power (Pvt) Ltd. - Commercial Bank of Ceylon PLC - Corporate Branch - 1000367087",
]
const lastBankAccount = "* Gunda Power (Pvt) Ltd. - Nations Trust Bank - Gothatuwa Branch - 200 770 066 897"

// VAT applies to quotations dated from 8 January 2024, as in the old system.
const VAT_FROM = "2024-01-08"

// 1234.5 → "1,234.50"
const formatNumber = (value: number) => value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")

// "2026-11-04" → "11/04/2026"
const formatDate = (day: string) => {
  const [year, month, date] = day.split("-")
  return `${month}/${date}/${year}`
}

// The old address was one line, with the country added unless it's Sri Lanka.
function documentAddress(customer: DocumentCustomer) {
  const address = [customer.houseNumber, customer.street, customer.city, customer.district].filter(Boolean).join(", ")
  const isSriLanka = customer.country.toLowerCase().replace(/\s+/g, "") === "srilanka"
  return isSriLanka ? address : [address, customer.country].filter(Boolean).join(", ")
}

// The PDF can only draw PNG and JPEG images; anything else shows "N/A", as a missing image does.
const drawableImage = (url: string | null) => (url && /\.(png|jpe?g)$/i.test(new URL(url).pathname) ? url : null)

export function QuotationDocument({ quotation }: { quotation: Quotation }) {
  const { customer, items } = quotation
  const isVatApplicable = quotation.quotationDate >= VAT_FROM
  const vatNumber = (isVatApplicable && customer.vatNumber) || "-"
  const hasDiscounts = items.some((item) => item.discountType !== "none")
  const descCol = hasDiscounts ? styles.qCol2 : styles.qCol2Wide
  const amountCol = hasDiscounts ? styles.qCol8 : styles.qCol8Wide
  const summaryLabelWidth = hasDiscounts ? "74%" : "66%"
  // The old Subtotal is the lines after their discounts, before VAT.
  const afterDiscounts = quotation.subtotal - quotation.discountTotal
  // Every line takes the VAT rate from the settings when it's saved, so they share one.
  const vatRate = items[0]?.taxRate ?? 0

  const summaryRow = (label: string, value: number) => (
    <View style={[styles.tableRow, styles.quoteTable]} wrap={false}>
      <View style={[styles.tableCell, { width: summaryLabelWidth }]}>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
      <View style={[styles.tableCell, amountCol, { borderLeftWidth: 0 }]}>
        <Text style={styles.summaryValue}>Rs. {formatNumber(value)}</Text>
      </View>
    </View>
  )

  return (
    <Document title={`${quotationNumber(quotation.id)} ${customer.name}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {/* The old letterhead logo, from public/ (PNG: the PDF can't draw the app's WebP logo). */}
          <Image src="/document-logo.png" />
        </View>

        {/* Sender & Receiver Info */}
        <View style={styles.infoHeader}>
          <View>
            <View style={styles.sender}>
              <Text>{sender.address}</Text>
              <Text>{sender.city}</Text>
              {isVatApplicable && <Text>{sender.vatRegistration}</Text>}
              {isVatApplicable && <Text>{sender.tin}</Text>}
              <Text>{sender.tel}</Text>
              <Text>{sender.web}</Text>
            </View>

            <View>
              <Text style={{ fontSize: 9, marginTop: 15, marginBottom: 5 }}>Bill To:</Text>
              <View style={styles.customerInfo}>
                <Text>{customer.name}</Text>
                <Text>{documentAddress(customer)}</Text>
                {customer.email && <Text>{customer.email}</Text>}
                {customer.phones.length > 0 && <Text>Company Tp: {customer.phones.join(" / ")}</Text>}
                {customer.contactPerson && customer.contactPhones.length > 0 && (
                  <Text>{`Contact Person Tp: ${customer.contactPhones.join(" / ")} (${customer.contactPerson})`}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Quotation Info */}
          <View style={{ marginTop: -40 }}>
            <Text style={{ marginBottom: 5, fontSize: 15 }}>QUOTATION</Text>
            <View style={styles.row}>
              <Text style={styles.cell1}>Date</Text>
              <Text style={styles.cell2}>{formatDate(quotation.quotationDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell1}>Quotation No.</Text>
              <Text style={styles.cell2}>{quotationNumber(quotation.id)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell1}>Sales Person</Text>
              <Text style={styles.cell2}>{quotation.salesManager.name || "N/A"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell1}>Customer Code</Text>
              <Text style={styles.cell2}>{customer.code}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell1}>Customer VAT No.</Text>
              <Text style={styles.cell2}>{vatNumber}</Text>
            </View>
          </View>
        </View>

        {/* Main Part */}
        <View style={styles.table}>
          <View style={[styles.tableHeader, styles.quoteTable]}>
            <Text style={[styles.headerCell, styles.qCol1]}>#</Text>
            <Text style={[styles.headerCell, descCol]}>Item Description</Text>
            <Text style={[styles.headerCell, styles.qCol3]}>Image</Text>
            <Text style={[styles.headerCell, styles.qCol4]}>Qty.</Text>
            <Text style={[styles.headerCell, styles.qCol5]}>Unit Price (LKR)</Text>
            {hasDiscounts && <Text style={[styles.headerCell, styles.qCol7]}>Total Discount (LKR)</Text>}
            <Text style={[styles.headerCell, amountCol, { borderRightWidth: 0 }]}>Amount (LKR)</Text>
          </View>

          {items.map((item, index) => {
            const imageSrc = drawableImage(item.product.imageUrl)
            return (
              <View style={[styles.tableRow, styles.quoteTable]} wrap={false} key={item.id}>
                <Text style={[styles.tableCell, styles.qCol1]}>{index + 1}</Text>
                <View style={[styles.tableCell, descCol]}>
                  <Text>{item.description}</Text>
                  {item.product.description !== "N/A" && <Text>{item.product.description}</Text>}
                  <Text>{item.product.sku}</Text>
                </View>
                <View style={[styles.tableCell, styles.qCol3]}>
                  {imageSrc ? (
                    <Image src={imageSrc} style={{ marginHorizontal: "auto", width: 32, height: 32 }} />
                  ) : (
                    <Text>N/A</Text>
                  )}
                </View>
                <Text style={[styles.tableCell, styles.qCol4]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.qCol5]}>{formatNumber(item.unitPrice)}</Text>
                {hasDiscounts && (
                  <Text style={[styles.tableCell, styles.qCol7]}>
                    {item.discountType === "none" ? "-" : formatNumber(item.discountAmount)}
                  </Text>
                )}
                <Text style={[styles.tableCell, amountCol]}>{formatNumber(item.subtotal - item.discountAmount)}</Text>
              </View>
            )
          })}

          {items.length > 0 &&
            (isVatApplicable ? (
              <View>
                {summaryRow("Subtotal", afterDiscounts)}
                {summaryRow(`${vatRate}% VAT`, quotation.taxTotal)}
                {summaryRow("Total", quotation.grandTotal)}
              </View>
            ) : (
              <View>
                <View style={styles.tableRow} wrap={false}>
                  <View style={[styles.tableCell, { width: summaryLabelWidth }]}>
                    <Text style={styles.summaryLabel}>Total</Text>
                  </View>
                  <View style={[styles.tableCell, amountCol, { borderLeftWidth: 0 }]}>
                    <Text style={styles.summaryValue}>Rs. {formatNumber(afterDiscounts)}</Text>
                  </View>
                </View>
              </View>
            ))}
        </View>

        {/* Conditions & Notes */}
        <View style={styles.notes}>
          <View>
            <View wrap={false}>
              <Text style={styles.h2}>Terms and Conditions: Warranty</Text>
              <Text>* Warranty covers manufacturing defects only.</Text>
              {warrantyTerms.map((line) => (
                <Text key={line} style={styles.notesText}>
                  {line}
                </Text>
              ))}
            </View>

            <View wrap={false}>
              <Text style={[styles.h2, { marginTop: 10 }]}>Terms and Conditions: Payment</Text>
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
            </View>

            <View wrap={false}>
              <Text style={[styles.notesText, { marginTop: 10 }]}>
                * Stock will be reserved on a *first-come, first-served basis* upon receipt of the *full payment*.
              </Text>
              <Text style={styles.notesText}>
                * Once the payment is received and confirmed by Gunda Power, the stock will be officially reserved for
                your order.
              </Text>
            </View>
          </View>
          <Text style={styles.footer}>
            This is a system generated <Text style={{ textTransform: "capitalize" }}>quotation</Text>. Signature is not
            required.
          </Text>
        </View>

        <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  )
}

// The PDF on the page and a download button. Loaded on its own (React.lazy), so the PDF library is only fetched when
// a quotation is opened.
export function QuotationPdf({ quotation }: { quotation: Quotation }) {
  const fileName = `${quotationNumber(quotation.id)} ${quotation.customer.name}.pdf`
  return (
    <div className="space-y-2">
      <PDFDownloadLink document={<QuotationDocument quotation={quotation} />} fileName={fileName}>
        {({ loading, error }) => (
          <Button type="button" disabled={loading || Boolean(error)}>
            <DownloadIcon />
            {error ? "Could not make the PDF" : loading ? "Preparing PDF…" : "Download quotation"}
          </Button>
        )}
      </PDFDownloadLink>
      <PDFViewer className="h-[80svh] w-full rounded-md border" showToolbar={false}>
        <QuotationDocument quotation={quotation} />
      </PDFViewer>
    </div>
  )
}

// Same names and values as the old pdfGenerator.js styles (only the ones the quotation uses), without its fontWeight:
// the old react-pdf (v1) ignored it for the built-in Helvetica, so the old PDFs have no bold text, and the current
// version would make the headings bold and wider.
const styles = StyleSheet.create({
  page: {
    backgroundColor: "white",
    marginHorizontal: 30,
    fontSize: 12,
    paddingTop: 40,
    paddingBottom: 10,
  },
  header: {
    width: "25%",
    marginBottom: 20,
  },
  customerInfo: {
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 3,
    padding: 10,
    maxWidth: 300,
  },
  row: {
    flexDirection: "row",
    padding: 2,
    borderWidth: 1,
    borderColor: "black",
    marginTop: -1,
  },
  cell1: {
    paddingRight: 10,
    fontSize: 9,
  },
  cell2: {
    paddingLeft: 40,
    marginLeft: "auto",
  },
  infoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 10,
    width: "90%",
  },
  sender: {
    fontSize: 10,
  },
  h2: {
    textDecoration: "underline",
    marginBottom: 5,
  },
  notes: {
    marginTop: 15,
    fontSize: 8,
  },
  notesText: {
    maxWidth: "90%",
  },
  pageNumber: {
    position: "absolute",
    right: 60,
    top: 30,
    fontSize: 9,
    color: "grey",
  },
  table: {
    marginTop: 15,
    width: "90%",
  },
  // # + description + image + qty + price + discount + amount = 96%
  qCol1: {
    width: "4%",
  },
  qCol2: {
    width: "23%",
  },
  qCol2Wide: {
    width: "30%",
  },
  qCol3: {
    width: "11%",
    textAlign: "center",
  },
  qCol4: {
    width: "6%",
    textAlign: "center",
  },
  qCol5: {
    width: "15%",
    textAlign: "right",
  },
  qCol7: {
    width: "15%",
    textAlign: "right",
  },
  qCol8: {
    width: "22%",
    textAlign: "right",
  },
  qCol8Wide: {
    width: "30%",
    textAlign: "right",
  },
  quoteTable: {
    justifyContent: "flex-start",
  },
  summaryLabel: {
    textAlign: "right",
    width: "100%",
    textTransform: "uppercase",
    fontSize: 11,
  },
  summaryValue: {
    textAlign: "right",
    width: "100%",
    fontSize: 11,
  },
  tableHeader: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    backgroundColor: "#f2f2f2",
    justifyContent: "space-between",
    borderRightWidth: 1,
    borderRightColor: "black",
    textAlign: "center",
  },
  headerCell: {
    borderRightWidth: 1,
    borderLeftWidth: 1,
    borderColor: "black",
    borderRightColor: "#f2f2f2",
    padding: 6,
    textTransform: "capitalize",
    fontSize: 8,
    overflow: "hidden",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderTopWidth: 1,
    marginTop: -1,
    borderRightWidth: 1,
    borderRightColor: "black",
  },
  tableCell: {
    borderLeftWidth: 1,
    borderColor: "black",
    padding: 3,
    fontSize: 9,
  },
  footer: {
    marginTop: 15,
    left: "27%",
  },
})
