import { Document, Image, Page, PDFDownloadLink, PDFViewer, StyleSheet, Text, View } from "@react-pdf/renderer"
import { DownloadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useCountryName } from "@/pages/Countries/api"

import { formatDateTime, supplierAddress, supplierTelephone, type InternalRequisition } from "./types"

// The printed internal requisition, ported point for point from the old system's (GP-System-Client/src/components/
// internalRequisition/irPdfGenerator.js), so it looks the same. Keep the layout, styles and wording as they are there.
// The old react-pdf (v1) took `border: true` etc. as a 1pt border; here they're written as widths. Differences, because
// the data differs:
// - The IR date is when it was saved (createdAt); the old IR stored the same day in `date`.
// - The old supplier had one address field and one telephone field: here they're joined from the address fields (the
//   country added unless it's Sri Lanka) and the phone numbers.
// - Available Qty and MOQ are the line's stock in hand and minimum stock when the IR was saved.
// Layout differences of the new react-pdf are made up for where marked (the header row wider than 100%, the fixed
// footer). Checked against the old file (one- and two-page IRs): every text item at the same place, font and size.

// The old formatDate: "10 Nov 26".
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  })

// countryName: the supplier's country, by name (the PDF renders outside the app's data hooks).
export function InternalRequisitionDocument({ requisition, countryName }: { requisition: InternalRequisition; countryName: string }) {
  const { supplier } = requisition
  const createdBy = requisition.creator?.name

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Info Header */}
        <View style={styles.infoHeader}>
          <View style={styles.header}>
            {/* The old letterhead logo, from public/. */}
            <Image src="/document-logo.png" />
            <View>
              <Text
                style={{
                  fontSize: 9,
                  marginTop: 15,
                  marginBottom: 5,
                }}
              >
                Supplier:
              </Text>
              <View>
                <Text>{supplier.name}</Text>
                <Text>{supplierAddress(supplier, countryName)}</Text>
                <Text>{supplier.email ?? ""}</Text>
                <Text>{supplierTelephone(supplier)}</Text>
              </View>
            </View>
          </View>

          <View>
            <Text style={styles.title}>INTERNAL REQUISITION</Text>
            <View style={styles.row}>
              <Text style={styles.cell1}>Date</Text>
              <Text style={styles.cell2}>{formatDate(requisition.createdAt)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell1}>IR No.</Text>
              <Text style={styles.cell2}>{requisition.internalRequisitionNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell1}>Supplier Code</Text>
              <Text style={styles.cell2}>{supplier.code}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell1}>Supplier VAT No.</Text>
              <Text style={styles.cell2}>{supplier.vatNumber ?? ""}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell1}>Created by</Text>
              <Text style={styles.cell2}>{createdBy ?? ""}</Text>
            </View>
          </View>
        </View>

        {/* Main Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.col1]}>#</Text>
            <Text style={[styles.headerCell, styles.col2]}>Item Code</Text>
            <Text style={[styles.headerCell, styles.col3]}>Description</Text>
            <Text style={[styles.headerCell, styles.col4]}>Order Qty</Text>
            <Text style={[styles.headerCell, styles.col5]}>Available Qty</Text>
            {/* The old header's widths add up to 102%, and the old react-pdf let the row overflow; this one would shrink
                every cell to fit (it reads flexShrink: 0 as 1), so the last cell's margin takes the extra 2% back. */}
            <Text style={[styles.headerCell, styles.col4, { marginRight: "-2%" }]}>MOQ</Text>
          </View>

          {requisition.items.map((item, idx) => (
            <View style={styles.tableRow} wrap={false} key={item.id}>
              <Text style={[styles.tableCell, styles.col1]}>{idx + 1}</Text>
              <Text style={[styles.tableCell, styles.col2, { textAlign: "left" }]}>{item.product.sku}</Text>
              <Text style={[styles.tableCell, styles.col3, { textAlign: "left" }]}>{item.product.title}</Text>
              <Text style={[styles.tableCell, styles.col4]}>{item.quantity || "0"}</Text>
              <Text style={[styles.tableCell, styles.col5]}>{item.stockInHand || "0"}</Text>
              {/* col6 under the col4 header, as in the old file. */}
              <Text style={[styles.tableCell, styles.col6]}>{item.minimumStock || "0"}</Text>
            </View>
          ))}
        </View>

        <Text style={{ fontSize: 8, marginTop: 5 }}>
          Created by: {createdBy} on {formatDateTime(requisition.createdAt)}
        </Text>

        {/* Footer */}
        {/* `fixed` in the old file, but the old react-pdf printed this in-flow text once, where it falls (the last page);
            this one would repeat it on every page, so it isn't fixed here. */}
        <Text style={styles.footer}>
          This is a system generated document. Signature is not required.
        </Text>

        {/* Page Number */}
        <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  )
}

// The PDF on the page and a download button. Loaded on its own (React.lazy), so the PDF library is only fetched when
// an IR is opened.
export function InternalRequisitionPdf({ requisition }: { requisition: InternalRequisition }) {
  const countryName = useCountryName()(requisition.supplier.country)
  return (
    <div className="space-y-2">
      <PDFDownloadLink
        document={<InternalRequisitionDocument requisition={requisition} countryName={countryName} />}
        fileName={`${requisition.internalRequisitionNumber}.pdf`}
      >
        {({ loading, error }) => (
          <Button type="button" disabled={loading || Boolean(error)}>
            <DownloadIcon />
            {error ? "Could not make the PDF" : loading ? "Preparing PDF…" : "Download internal requisition"}
          </Button>
        )}
      </PDFDownloadLink>
      {/* A4 is 210 × 297 mm; the extra height leaves room for the viewer's margins around the page. */}
      <PDFViewer className="aspect-[210/310] w-full rounded-md border" showToolbar={false}>
        <InternalRequisitionDocument requisition={requisition} countryName={countryName} />
      </PDFViewer>
    </div>
  )
}

// Same names and values as the old irPdfGenerator.js styles, without fontWeight (the old react-pdf ignored it for the
// built-in Helvetica, so the old PDFs have no bold text) and textOverflow (not a style here).
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
    marginVertical: 20,
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
  table: {
    marginTop: 5,
    width: "90%",
  },
  col1: {
    width: "5%",
    textAlign: "center",
  },
  col2: {
    width: "20%",
    textAlign: "center",
  },
  col3: {
    width: "41%",
    textAlign: "center",
  },
  col4: {
    width: "12%",
    textAlign: "center",
  },
  col5: {
    width: "12%",
    textAlign: "center",
  },
  col6: {
    width: "10%",
    textAlign: "center",
  },
  tableHeader: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    backgroundColor: "#f2f2f2",
    justifyContent: "space-between",
    borderRightWidth: 1,
    borderRightColor: "black",
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
  pageNumber: {
    position: "absolute",
    right: 60,
    top: 30,
    fontSize: 9,
    color: "grey",
  },
  footer: {
    textAlign: "center",
    fontSize: 8,
    marginTop: 20,
    width: "90%",
  },
})
