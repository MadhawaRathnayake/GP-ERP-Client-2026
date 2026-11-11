import { Document, Image, Page, PDFDownloadLink, PDFViewer, StyleSheet, Text, View } from "@react-pdf/renderer"
import { DownloadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatDateTime, supplierAddress, supplierTelephone } from "@/pages/InternalRequisitions/types"

import type { PurchaseOrder, PurchaseOrderItem } from "./types"

// The printed purchase order, ported point for point from the old system's (GP-System-Client/src/components/
// purchaseOrders/poPdfGenerator.js), so it looks the same to suppliers. Keep the layout, styles and wording as they are
// there. The old react-pdf (v1) took `border: true` etc. as a 1pt border and `0` as none; here they're written as
// widths. The old styles object had `footer` twice; the second one won, so it's the only one here. Differences, because
// the data differs:
// - The amounts are the server's, summed from lines rounded one by one; the old VAT was 18% of the whole subtotal.
// - The VAT lines show when the saved rate is above 0 and use that rate; the old ones used 18% from 8 Jan 2024.
// - An empty comment or supplier VAT number is null here, and prints as the old empty string did (left out).
// - The old supplier had one address field and one telephone field: here they're joined from the address fields and
//   the phone numbers, as on the printed IR.
// - "Approved by" is the latest approval decision.
// Layout differences of the new react-pdf, made up for where marked: rows wider than 100% (the totals), and the fixed
// footer. One it can't: a PO longer than a page has its rows on the next pages 1pt (0.35 mm) higher, because the old
// react-pdf drew the table's top border again on each page and this one doesn't.
// Checked against the old file (one- and two-page POs): apart from that, every text item at the same place, font, size.

// Company details, as hard-coded in the old file.
const company = [
  "123/10, Pannipitiya Road,",
  "Battaramulla, Sri Lanka",
  "Mobile No.: +94 76 139 9057",
  "Office Tel No: +94 112 805 005",
  "info@gundapower.com",
  "www.gundapower.com",
]
const deliverTo = ["Gunda Power (Pvt) Ltd", "184, Buthgamuwa Road", "Rajagiriya", "+94761399061"]

// 1234.5 → "1,234.50", the old formatNumber.
const formatNumber = (value: number) => value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")

// "2026-11-10" → "10/11/2026", the old en-GB date.
const formatDate = (day: string) => {
  const [year, month, date] = day.split("-")
  return `${date}/${month}/${year}`
}

// The old discount column: "10%", "500LKR", or "-" without one.
const discountLabel = (item: PurchaseOrderItem) =>
  item.discountType === "none" ? "-" : `${item.discountValue}${item.discountType === "fixed" ? "LKR" : "%"}`

export function PurchaseOrderDocument({ order }: { order: PurchaseOrder }) {
  const { supplier } = order
  const vatRate = order.items[0]?.taxRate ?? 0
  const isVatApplicable = vatRate > 0
  const approval = order.approvals.findLast((decision) => decision.decision === "approved")

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Info Header */}
        <View style={styles.infoHeader}>
          <View style={styles.header}>
            {/* The old letterhead logo, from public/. */}
            <Image src="/document-logo.png" />
            <View style={styles.companyInfo}>
              {company.map((line) => (
                <Text key={line}>{line}</Text>
              ))}
            </View>
          </View>

          {/* PO Info */}
          <View>
            <Text style={styles.title}>PURCHASE ORDER</Text>
            <View style={styles.row}>
              <Text style={styles.cell1}>Date</Text>
              <Text style={styles.cell2}>{formatDate(order.purchaseOrderDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell1}>PO No.</Text>
              <Text style={styles.cell2}>{order.purchaseOrderNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell1}>IR No.</Text>
              <Text style={styles.cell2}>{order.internalRequisition.internalRequisitionNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell1}>Supplier Code</Text>
              <Text style={styles.cell2}>{supplier.code}</Text>
            </View>
            {supplier.vatNumber && (
              <View style={styles.row}>
                <Text style={styles.cell1}>Supplier VAT No.</Text>
                <Text style={styles.cell2}>{supplier.vatNumber}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Vendor and Deliver To Section */}
        <View style={styles.infoSection}>
          <View style={styles.vendorSection}>
            <Text style={styles.sectionHeader}>VENDOR:-</Text>
            <Text style={styles.cell}>{supplier.name}</Text>
            <Text style={styles.cell}>{supplierAddress(supplier)}</Text>
            <Text style={styles.cell}>{supplier.email ?? ""}</Text>
            <Text style={styles.cell}>{supplierTelephone(supplier)}</Text>
          </View>

          <View style={styles.deliverToSection}>
            <Text style={styles.sectionHeader}>Deliver To:-</Text>
            {deliverTo.map((line) => (
              <Text key={line} style={styles.cell}>
                {line}
              </Text>
            ))}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.col1]}>Item Code</Text>
            <Text style={[styles.headerCell, styles.col2]}>Description</Text>
            <Text style={[styles.headerCell, styles.col3]}>Qty.</Text>
            <Text style={[styles.headerCell, styles.col4]}>Unit Price</Text>
            <Text style={[styles.headerCell, styles.col5]}>Discount</Text>
            <Text style={[styles.headerCell, styles.col6]}>Total</Text>
          </View>

          {order.items.map((item) => (
            <View style={styles.tableRow} wrap={false} key={item.id}>
              <Text style={[styles.tableCell, styles.col1, { textAlign: "left" }]}>{item.product.sku}</Text>
              <Text style={[styles.tableCell, styles.col2, { textAlign: "left" }]}>{item.product.title}</Text>
              <Text style={[styles.tableCell, styles.col3]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.col4, { textAlign: "right" }]}>{item.unitPrice.toFixed(2)}</Text>
              <Text style={[styles.tableCell, styles.col5]}>{discountLabel(item)}</Text>
              <Text style={[styles.tableCell, styles.col6, { textAlign: "right" }]}>
                {formatNumber(item.subtotal - item.discountAmount)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.tableFooter}>
          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={[styles.sectionHeader, { textDecoration: "underline" }]}>Comments or Special Instructions:-</Text>
            {isVatApplicable && <Text style={[styles.cell]}>{`* VAT Included ${vatRate}%`}</Text>}
            {order.comments && <Text style={styles.cell}>* {order.comments}</Text>}
          </View>

          {/* Totals Section. The old widths add up to 100.2%, and the old react-pdf let the row overflow; this one would
              shrink both boxes to fit (it reads flexShrink: 0 as 1), so the margin takes the extra 0.2% back. */}
          <View style={[styles.totalSection, { marginRight: "-0.2%" }]}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>SUB TOTAL:</Text>
              <Text style={styles.totalValue}>{formatNumber(order.subtotal - order.discountTotal)}</Text>
            </View>
            {isVatApplicable && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{`VAT ${vatRate}%:`}</Text>
                <Text style={styles.totalValue}>{formatNumber(order.taxTotal)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL:</Text>
              <Text style={styles.totalValue}>{formatNumber(order.grandTotal)}</Text>
            </View>
          </View>
        </View>

        <Text style={{ fontSize: 8, marginTop: 5 }}>
          Created by: {order.creator?.name} on {formatDateTime(order.createdAt)}
        </Text>
        {approval && (
          <Text style={{ fontSize: 8 }}>
            Approved by: {approval.creator?.name} on {formatDateTime(approval.createdAt)}
          </Text>
        )}

        {/* `fixed` in the old file, but the old react-pdf printed this in-flow text once, where it falls (the last page);
            this one would repeat it on every page, so it isn't fixed here. */}
        <Text style={styles.footer}>
          This is a system generated document. Signature is not required.
        </Text>

        {/* Contact Information */}
        <View style={styles.footer}>
          <Text>If you have any questions on the Purchase Order, please contact</Text>
          <Text>
            Gunda Power (Pvt) Ltd. Phone # +94 761399060 / +94 777275628 / +94 112 872 395 , email: info@gundapower.com
          </Text>
        </View>

        {/* Page Number */}
        <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  )
}

// The PDF on the page and a download button. Loaded on its own (React.lazy), so the PDF library is only fetched when
// a PO is opened.
export function PurchaseOrderPdf({ order }: { order: PurchaseOrder }) {
  return (
    <div className="space-y-2">
      <PDFDownloadLink document={<PurchaseOrderDocument order={order} />} fileName={`${order.purchaseOrderNumber}.pdf`}>
        {({ loading, error }) => (
          <Button type="button" disabled={loading || Boolean(error)}>
            <DownloadIcon />
            {error ? "Could not make the PDF" : loading ? "Preparing PDF…" : "Download purchase order"}
          </Button>
        )}
      </PDFDownloadLink>
      {/* A4 is 210 × 297 mm; the extra height leaves room for the viewer's margins around the page. */}
      <PDFViewer className="aspect-[210/310] w-full rounded-md border" showToolbar={false}>
        <PurchaseOrderDocument order={order} />
      </PDFViewer>
    </div>
  )
}

// Same names and values as the old poPdfGenerator.js styles (only the ones it uses), without fontWeight (the old
// react-pdf ignored it for the built-in Helvetica, so the old PDFs have no bold text) and textOverflow.
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
    marginBottom: 10,
  },
  companyInfo: {
    fontSize: 9,
    marginTop: 10,
  },
  title: {
    marginBottom: 5,
    fontSize: 15,
  },
  infoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 10,
    width: "90%",
    marginVertical: 10,
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
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    width: "90%",
  },
  vendorSection: {
    width: "48%",
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 3,
    padding: 3,
  },
  deliverToSection: {
    width: "48%",
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 3,
    padding: 3,
  },
  sectionHeader: {
    fontSize: 8,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  cell: {
    fontSize: 8,
    paddingVertical: 1,
  },
  table: {
    width: "90%",
    borderWidth: 1,
    borderColor: "black",
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "black",
    backgroundColor: "#f2f2f2",
    justifyContent: "space-between",
    borderRightWidth: 0,
    borderRightColor: "black",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "black",
    marginTop: -1,
    borderRightWidth: 0,
    borderRightColor: "black",
  },
  col1: {
    width: "17%",
    textAlign: "center",
  },
  col2: {
    width: "35%",
    textAlign: "center",
  },
  col3: {
    width: "8%",
    textAlign: "center",
  },
  col4: {
    width: "12%",
    textAlign: "center",
  },
  col5: {
    width: "10%",
    textAlign: "center",
  },
  col6: {
    width: "18%",
    textAlign: "center",
  },
  headerCell: {
    borderRightWidth: 1,
    borderLeftWidth: 0,
    borderColor: "black",
    padding: 6,
    fontSize: 8,
    overflow: "hidden",
  },
  tableCell: {
    borderRightWidth: 1,
    borderLeftWidth: 0,
    borderColor: "black",
    padding: 3,
    fontSize: 8,
  },
  tableFooter: {
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "black",
    borderTopWidth: 0,
  },
  commentsSection: {
    width: "72.2%",
    padding: 3,
    borderRightWidth: 1,
    borderColor: "black",
    minHeight: 40,
  },
  totalSection: {
    width: "28%",
    padding: 3,
    minHeight: 40,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 1,
  },
  totalLabel: {
    fontSize: 8,
    textAlign: "left",
  },
  totalValue: {
    fontSize: 8,
  },
  footer: {
    textAlign: "center",
    fontSize: 8,
    marginTop: 20,
    width: "90%",
  },
  pageNumber: {
    position: "absolute",
    right: 60,
    top: 30,
    fontSize: 9,
    color: "grey",
  },
})
