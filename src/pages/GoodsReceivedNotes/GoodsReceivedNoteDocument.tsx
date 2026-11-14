import { Document, Image, Page, PDFDownloadLink, PDFViewer, StyleSheet, Text, View } from "@react-pdf/renderer"
import { DownloadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatDateTime, supplierAddress, supplierTelephone } from "@/pages/InternalRequisitions/types"
import { company, deliverTo } from "@/pages/PurchaseOrders/types"

import type { GoodsReceivedNote } from "./types"

// The printed GRN, ported from the old system's (GP-System-Client/src/components/grn/grnPdfGenerator.js) the way the IR
// and PO documents were, so it looks the same. Keep the layout, styles and wording as they are there. The old react-pdf
// (v1) took `border: true` etc. as a 1pt border and `0` as none; here they're written as widths. Differences, because
// the data differs:
// - A GRN of an international IR has no PO, and a GRN without a supplier invoice number or a supplier without a VAT
//   number has null: those rows are left out. (The old file printed them empty when the value was missing.)
// - The old supplier had one address field and one telephone field: here they're joined from the address fields and
//   the phone numbers, as on the printed IR and PO.
// - A GRN now holds every delivery of its order (there is no approval): the date is the latest delivery's, the
//   supplier invoices are every delivery's, Delivered Qty is the total so far and Remarks joins the deliveries' line
//   remarks. A line under the table lists the deliveries.
// - The footer isn't `fixed`, as on the printed PO: the old react-pdf printed it once, on the last page.
// Not yet proven against the old file with the invoices.md §7 method.

// "2026-11-11" → "11/11/2026", the old moment format "DD/MM/YYYY".
const formatDate = (day: string) => {
  const [year, month, date] = day.split("-")
  return `${date}/${month}/${year}`
}

export function GoodsReceivedNoteDocument({ goodsReceivedNote: grn }: { goodsReceivedNote: GoodsReceivedNote }) {
  const { supplier, internalRequisition } = grn
  const lastDelivery = grn.deliveries.at(-1)
  const invoices = grn.deliveries.flatMap((delivery) => (delivery.supplierInvoiceNumber ? [delivery.supplierInvoiceNumber] : []))
  const remarks = (productId: string) =>
    grn.deliveries
      .flatMap((delivery) => delivery.items.filter((item) => item.productId === productId && item.remarks).map((item) => item.remarks))
      .join("; ")
  const infoRows: [string, string | null][] = [
    ["Date", lastDelivery ? formatDate(lastDelivery.receivedDate) : null],
    ["GRN No.", grn.grnNumber],
    ["PO No.", internalRequisition.purchaseOrder?.purchaseOrderNumber ?? null],
    ["IR No.", internalRequisition.internalRequisitionNumber],
    ["Supplier Code", supplier.code],
    ["Supplier Invoice", invoices.join(", ") || null],
    ["Supplier VAT No.", supplier.vatNumber],
  ]

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

          {/* GRN Info */}
          <View>
            <Text style={styles.title}>GOODS RECEIVED NOTE</Text>
            {infoRows.map(
              ([label, value]) =>
                value && (
                  <View key={label} style={styles.row}>
                    <Text style={styles.cell1}>{label}</Text>
                    <Text style={styles.cell2}>{value}</Text>
                  </View>
                ),
            )}
          </View>
        </View>

        {/* Supplier and Company Section */}
        <View style={styles.infoSection}>
          <View style={styles.supplierSection}>
            <Text style={styles.sectionHeader}>SUPPLIER:-</Text>
            <Text style={styles.cell}>{supplier.name}</Text>
            <Text style={styles.cell}>{supplierAddress(supplier)}</Text>
            <Text style={styles.cell}>{supplier.email ?? ""}</Text>
            <Text style={styles.cell}>{supplierTelephone(supplier)}</Text>
          </View>

          <View style={styles.companySection}>
            <Text style={styles.sectionHeader}>Received By:-</Text>
            {deliverTo.map((line) => (
              <Text key={line} style={styles.cell}>
                {line}
              </Text>
            ))}
            {grn.creator && <Text style={[styles.cell, { marginTop: 5 }]}>Prepared By: {grn.creator.name}</Text>}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.col1]}>Item Code</Text>
            <Text style={[styles.headerCell, styles.col2]}>Description</Text>
            <Text style={[styles.headerCell, styles.col3]}>Ordered Qty</Text>
            <Text style={[styles.headerCell, styles.col4]}>Delivered Qty</Text>
            <Text style={[styles.headerCell, styles.col5]}>Remarks</Text>
          </View>

          {grn.items.map((item) => (
            <View style={styles.tableRow} wrap={false} key={item.id}>
              <Text style={[styles.tableCell, styles.col1, { textAlign: "left" }]}>{item.product.sku}</Text>
              <Text style={[styles.tableCell, styles.col2, { textAlign: "left" }]}>{item.product.title}</Text>
              <Text style={[styles.tableCell, styles.col3]}>{item.orderedQuantity}</Text>
              <Text style={[styles.tableCell, styles.col4]}>{item.receivedQuantity}</Text>
              <Text style={[styles.tableCell, styles.col5, { textAlign: "left" }]}>{remarks(item.productId) || "-"}</Text>
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 8, marginTop: 5 }}>
          Created by: {grn.creator?.name} on {formatDateTime(grn.createdAt)}
        </Text>
        <Text style={{ fontSize: 8 }}>
          Deliveries:{" "}
          {grn.deliveries
            .map((delivery) => `${delivery.deliveryNo}) ${formatDate(delivery.receivedDate)}${delivery.supplierInvoiceNumber ? ` (${delivery.supplierInvoiceNumber})` : ""}`)
            .join("  ")}
        </Text>

        <View style={styles.contactInfo}>
          <Text>I do hereby confirmed that ordered quantity is received same and under good environment.</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>This is a system generated document. Signature is not required.</Text>

        {/* Page Number */}
        <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  )
}

// The PDF on the page and a download button. Loaded on its own (React.lazy), so the PDF library is only fetched when
// a GRN is opened.
export function GoodsReceivedNotePdf({ goodsReceivedNote }: { goodsReceivedNote: GoodsReceivedNote }) {
  return (
    <div className="space-y-2">
      <PDFDownloadLink
        document={<GoodsReceivedNoteDocument goodsReceivedNote={goodsReceivedNote} />}
        fileName={`${goodsReceivedNote.grnNumber}.pdf`}
      >
        {({ loading, error }) => (
          <Button type="button" disabled={loading || Boolean(error)}>
            <DownloadIcon />
            {error ? "Could not make the PDF" : loading ? "Preparing PDF…" : "Download GRN"}
          </Button>
        )}
      </PDFDownloadLink>
      {/* A4 is 210 × 297 mm; the extra height leaves room for the viewer's margins around the page. */}
      <PDFViewer className="aspect-[210/310] w-full rounded-md border" showToolbar={false}>
        <GoodsReceivedNoteDocument goodsReceivedNote={goodsReceivedNote} />
      </PDFViewer>
    </div>
  )
}

// Same names and values as the old grnPdfGenerator.js styles (only the ones it uses), without fontWeight (the old
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
    padding: 3,
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
  supplierSection: {
    width: "48%",
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 3,
    padding: 3,
  },
  companySection: {
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
    width: "20%",
    textAlign: "center",
  },
  col2: {
    width: "35%",
    textAlign: "center",
  },
  col3: {
    width: "12%",
    textAlign: "center",
  },
  col4: {
    width: "12%",
    textAlign: "center",
  },
  col5: {
    width: "20%",
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
  contactInfo: {
    textAlign: "center",
    fontSize: 8,
    marginTop: 20,
    width: "90%",
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
