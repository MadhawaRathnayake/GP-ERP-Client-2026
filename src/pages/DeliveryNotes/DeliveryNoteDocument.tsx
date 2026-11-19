import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

import { HOME_COUNTRY } from "@/pages/Countries/api"

import type { DeliveryNote } from "./types"

// The printed delivery note, ported point for point from the old system's PDF (GP-System-Client/src/components/
// deliveryNotes/deliverNotePdf.js), so it matches the old PDFs to the millimetre. One layout, printed twice: the
// customer copy and the warehouse copy differ only in the title. Keep the layout, styles and wording as they are there.
// Differences, because the data differs: the old `border: true` is a 1pt black border and its `fontWeight` is left out
// (the old react-pdf ignored both for the built-in Helvetica, so the old PDFs have neither); "Order Date" is the
// invoice's date; Dispatch Date and Delivery Method aren't built yet, so they print empty; a unit's accessories print as
// "(<accessory> Serial: <serial>)", which is the old "(WiFi Stick Serial: …)" for an inverter's WiFi stick.

// Company details, as hard-coded in the old system.
const sender = {
  address: "184, Buthgamuwa Road",
  city: "Rajagiriya, Sri Lanka",
  tel: "0112 805 005 / 0761 399 060 / 0761 399 063",
}

export type Copy = "Customer" | "Warehouse"

// The old address was one line, with the country's name added unless it's Sri Lanka.
function documentAddress(customer: DeliveryNote["invoice"]["customer"], countryName: string) {
  const address = [customer.houseNumber, customer.street, customer.city, customer.district].filter(Boolean).join(", ")
  return customer.country === HOME_COUNTRY ? address : [address, countryName].filter(Boolean).join(", ")
}

interface DeliveryNoteDocumentProps {
  note: DeliveryNote
  copy: Copy
  // "16-11-2026": the invoice's date, in the company's timezone.
  orderDate: string
  // The customer's country, by name (the PDF renders outside the app's data hooks).
  countryName: string
}

export function DeliveryNoteDocument({ note, copy, orderDate, countryName }: DeliveryNoteDocumentProps) {
  const { invoice } = note
  const { customer } = invoice
  const verifier = note.itemVerifier?.name ?? note.oldItemVerifierName ?? ""
  const issuer = note.itemIssuer?.name ?? note.oldItemIssuerName ?? ""
  const serialsOf = (productId: string) => invoice.serialPicks.filter((pick) => pick.productId === productId)
  const hasSerials = invoice.items.some((item) => serialsOf(item.productId).length > 0)

  // What a line shows about its product: the line's name, the product's title when it differs, and the SKU.
  const productLines = (item: DeliveryNote["invoice"]["items"][number]) => [
    item.description,
    ...(item.product.title !== item.description ? [item.product.title] : []),
    item.product.sku,
  ]

  return (
    <Document title={`${note.deliveryNoteNumber} ${customer.name} (${copy} Copy)`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <View style={styles.logo}>
              {/* The old letterhead logo, from public/. */}
              <Image src="/document-logo.png" />
            </View>

            <View style={styles.sender}>
              <Text>{sender.address}</Text>
              <Text>{sender.city}</Text>
              <Text>{sender.tel}</Text>
              <Text>info@gundapower.com / www.gundapower.com</Text>
            </View>
          </View>

          <View style={{ marginLeft: "auto", minWidth: 225 }}>
            <Text style={{ marginBottom: 5, fontSize: 13 }}>Delivery Note - {copy} Copy</Text>
            <View style={styles.row}>
              <Text style={styles.cell1}>Order Date</Text>
              <Text style={styles.cell2}>{orderDate}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell1}>Invoice No.</Text>
              <Text style={styles.cell2}>{invoice.invoiceNumber ?? ""}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell1}>Delivery Note No.</Text>
              <Text style={styles.cell2}>{note.deliveryNoteNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell1}>Customer Code</Text>
              <Text style={styles.cell2}>{customer.code}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell1}>Dispatch Date</Text>
              <Text style={styles.cell2}></Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell1}>Delivery Method</Text>
              <Text style={styles.cell2}></Text>
            </View>
          </View>
        </View>

        <View style={styles.fixedHeader} fixed></View>

        <View style={styles.billingAndDelivery}>
          <View>
            <Text style={{ fontSize: 9, marginTop: -15, marginBottom: 5 }}>Bill To: </Text>
            <View style={styles.customerInfo}>
              <Text>{customer.name}</Text>
              <Text>{documentAddress(customer, countryName)}</Text>
              <Text>{customer.phones.join(" / ")}</Text>
              <Text>{customer.email ?? ""}</Text>
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 9, marginTop: -15, marginBottom: 5 }}>Deliver To: </Text>
            <View style={styles.customerInfo}>
              <Text style={{ fontSize: 8, marginBottom: 2 }}>[Name]</Text>
              <Text style={{ fontSize: 8, marginBottom: 2 }}>[Company Name]</Text>
              <Text style={{ fontSize: 8 }}>[Street Address]</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <Text
            style={{
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: "black",
              marginLeft: "auto",
              width: "50%",
              textAlign: "center",
              padding: 2,
            }}
          >
            Customer to Complete
          </Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.col1]}>#</Text>
            <Text style={[styles.headerCell, styles.col2]}>Item Description</Text>
            <Text style={[styles.headerCell, styles.col3]}>Ordered</Text>
            <Text style={[styles.headerCell, styles.col4]}>Received</Text>
            <Text style={[styles.headerCell, styles.col5, { borderRightWidth: 0 }]}>Remarks</Text>
          </View>

          {invoice.items.map((item, index) => (
            <View style={styles.tableRow} wrap={false} key={item.lineNo}>
              <Text style={[styles.tableCell, styles.col1]}>{index + 1}</Text>
              <View style={[styles.tableCell, styles.col2]}>
                {productLines(item).map((line, lineIndex) => (
                  <Text key={lineIndex}>{line}</Text>
                ))}
              </View>
              <Text style={[styles.tableCell, styles.col3]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.col4]}></Text>
              <Text style={[styles.tableCell, styles.col5]}></Text>
            </View>
          ))}
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureTableLeft}>
            <View style={styles.signatureGridRow}>
              <Text style={[styles.signatureGridCell, styles.signatureGridColLabel]}>#</Text>
              <Text style={[styles.signatureGridCell, styles.signatureGridColSign]}>Verifier</Text>
              <Text style={[styles.signatureGridCell, styles.signatureGridColSignLast]}>Issuer</Text>
            </View>
            <View style={styles.signatureGridRow}>
              <Text style={[styles.signatureGridCell, styles.signatureGridColLabel]}>Name</Text>
              <Text style={[styles.signatureGridCell, styles.signatureGridColSign]}>{verifier}</Text>
              <Text style={[styles.signatureGridCell, styles.signatureGridColSignLast]}>{issuer}</Text>
            </View>
            <View style={styles.signatureGridRow}>
              <Text style={[styles.signatureGridCell, styles.signatureGridColLabel]}>Date</Text>
              <Text style={[styles.signatureGridCell, styles.signatureGridColSign]}> </Text>
              <Text style={[styles.signatureGridCell, styles.signatureGridColSignLast]}> </Text>
            </View>
            <View style={[styles.signatureGridRow, styles.signatureGridRowLast]}>
              <Text style={[styles.signatureGridCell, styles.signatureGridColLabel]}>Signature</Text>
              <Text style={[styles.signatureGridCell, styles.signatureGridColSign]}> </Text>
              <Text style={[styles.signatureGridCell, styles.signatureGridColSignLast]}> </Text>
            </View>
          </View>

          <View style={styles.signatureTableRight}>
            <View style={styles.signatureReceiverRow}>
              <Text style={styles.signatureReceiverLabel}>Receiver&apos;s Name</Text>
              <Text style={styles.signatureReceiverValue}> </Text>
            </View>
            <View style={styles.signatureReceiverRow}>
              <Text style={styles.signatureReceiverLabel}>NIC No.</Text>
              <Text style={styles.signatureReceiverValue}> </Text>
            </View>
            <View style={styles.signatureReceiverRow}>
              <Text style={styles.signatureReceiverLabel}>Date</Text>
              <Text style={styles.signatureReceiverValue}> </Text>
            </View>
            <View style={[styles.signatureReceiverRow, styles.signatureReceiverRowLast]}>
              <Text style={styles.signatureReceiverLabel}>Signature</Text>
              <Text style={styles.signatureReceiverValue}> </Text>
            </View>
          </View>
        </View>

        <View style={styles.terms}>
          <Text style={{ textAlign: "center", fontSize: 10, marginBottom: 2 }}>Terms &amp; Conditions</Text>
          <Text style={{ fontSize: 9 }}>
            Upon receiving the goods, any product damages or shortages should be reported immediately to Gunda Power (Pvt) Ltd.
          </Text>
        </View>

        {hasSerials && (
          <>
            <Text style={styles.serialTitle}>Serial Numbers ({note.deliveryNoteNumber})</Text>
            <View style={styles.serialTable}>
              <View style={styles.serialRow}>
                <Text style={styles.serialCell1}>Item</Text>
                <Text style={styles.serialCell2}>Serial Numbers</Text>
              </View>
              {invoice.items.map((item) => {
                const picks = serialsOf(item.productId)
                if (picks.length === 0) return null
                const [name, ...rest] = productLines(item)
                const sku = rest.pop()
                return (
                  <View key={item.lineNo} style={styles.serialRow}>
                    <View style={styles.serialCell1}>
                      <Text>{name}</Text>
                      {rest.map((line, lineIndex) => (
                        <Text key={lineIndex} style={{ fontSize: 9 }}>
                          {line}
                        </Text>
                      ))}
                      {sku && <Text>{sku}</Text>}
                    </View>
                    <View style={[styles.serialCell2, styles.serialList]}>
                      {picks.map(({ serialItem }) => (
                        <Text key={serialItem.id} style={{ backgroundColor: "#eee", marginRight: 7, marginBottom: 3, fontSize: 10 }}>
                          {serialItem.serialNumber}{" "}
                          {serialItem.accessories
                            .map((accessory) => `(${accessory.accessory.name} Serial: ${accessory.serialNumber})`)
                            .join(" | ")}
                        </Text>
                      ))}
                    </View>
                  </View>
                )
              })}
            </View>
          </>
        )}

        <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  )
}

// Same names and values as the old deliverNotePdf.js styles.
const styles = StyleSheet.create({
  page: {
    backgroundColor: "white",
    paddingHorizontal: 30,
    fontSize: 12,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    marginTop: 30,
  },
  fixedHeader: {
    marginTop: 40,
  },
  logo: {
    width: "50%",
    marginBottom: 30,
  },
  sender: {
    fontSize: 10,
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
    paddingLeft: 65,
    marginLeft: "auto",
  },
  billingAndDelivery: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  customerInfo: {
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 3,
    padding: 15,
    width: 225,
    fontSize: 10,
  },
  table: {
    marginTop: 25,
    width: "100%",
  },
  col1: {
    width: "5%",
  },
  col2: {
    width: "35%",
  },
  col3: {
    width: "10%",
  },
  col4: {
    width: "15%",
  },
  col5: {
    width: "35%",
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "black",
    backgroundColor: "#f2f2f2",
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
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: "black",
    marginTop: -1,
    borderRightWidth: 1,
    borderRightColor: "black",
  },
  tableCell: {
    borderLeftWidth: 1,
    borderColor: "black",
    padding: 6,
    fontSize: 10,
  },
  signatureSection: {
    flexDirection: "row",
    width: "100%",
    marginTop: 30,
    justifyContent: "space-between",
  },
  signatureTableLeft: {
    width: "55%",
    borderWidth: 1,
    borderColor: "black",
  },
  signatureTableRight: {
    width: "40%",
    borderWidth: 1,
    borderColor: "black",
  },
  signatureGridRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "black",
    minHeight: 15,
  },
  signatureGridRowLast: {
    borderBottomWidth: 0,
  },
  signatureGridCell: {
    padding: 2,
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: "black",
  },
  signatureGridColLabel: {
    width: "22%",
  },
  signatureGridColSign: {
    width: "39%",
  },
  signatureGridColSignLast: {
    width: "39%",
    borderRightWidth: 0,
  },
  signatureReceiverRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "black",
    minHeight: 15,
  },
  signatureReceiverRowLast: {
    borderBottomWidth: 0,
  },
  signatureReceiverLabel: {
    width: "36%",
    padding: 2,
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: "black",
  },
  signatureReceiverValue: {
    flexGrow: 1,
    padding: 2,
    fontSize: 8,
  },
  terms: {
    padding: 3,
    borderWidth: 1,
    borderColor: "black",
    marginTop: 20,
  },
  pageNumber: {
    position: "absolute",
    right: 30,
    top: 20,
    fontSize: 9,
    color: "grey",
  },
  serialTitle: {
    fontSize: 16,
    marginTop: 15,
    marginBottom: 5,
  },
  serialTable: {
    width: "100%",
  },
  serialRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "black",
    padding: 5,
  },
  // The old react-pdf made these 30% and 70% of the row's inner width (525.28pt: A4 less the page and row padding) and
  // let the pair overflow the row by the margin; the current one shrinks overflowing cells instead, which moves the
  // serials left. So the first cell is its old width in points and the second takes the rest of the row. The old one
  // also stretched a wrapped line to the cell's height, which centres the serials beside the item (alignContent).
  serialCell1: {
    width: 157.58,
    marginRight: 10,
  },
  serialCell2: {
    width: 357.7,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    alignContent: "stretch",
  },
  // An item's serials: the old one centred them 1.5pt higher (it left out their 3pt bottom margin).
  serialList: {
    paddingBottom: 3,
  },
})
