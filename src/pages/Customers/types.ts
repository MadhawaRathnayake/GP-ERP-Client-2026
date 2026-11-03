// B2B = a business, B2C = a person.
export type CustomerType = "B2B" | "B2C"

export interface Customer {
  // "CUST000001"
  id: string
  code: string
  type: CustomerType
  // e.g. "Mr", "Dr"
  title: string | null
  name: string
  email: string | null
  // e.g. ["+94771234567"]
  phones: string[]
  houseNumber: string | null
  street: string | null
  city: string | null
  district: string | null
  province: string | null
  country: string
  contactPerson: string | null
  contactPhones: string[]
  // e.g. "109860522-7000", "109860522", "PV-00300617"
  vatNumber: string | null
  tinNumber: string | null
  pvNumber: string | null
  isCommissioned: boolean
  // Set by the system from invoices; never sent by the frontend.
  // isActive: last invoice less than 6 months ago. isDormant: last invoice over 18 months ago.
  isActive: boolean
  isDormant: boolean
  lastInvoiceDate: string | null
  totalInvoices: number
  notes: string | null
  createdBy: string | null
  createdAt: string
  modifiedBy: string | null
  modifiedAt: string | null
  // true = deleted; it can be restored.
  isDeleted: boolean
}

// On create, phones and contactPhones default to [], isCommissioned to false, and the other optional fields to null.
export type NewCustomer = Pick<Customer, "code" | "type" | "name" | "country"> &
  Partial<
    Pick<
      Customer,
      | "title"
      | "email"
      | "phones"
      | "houseNumber"
      | "street"
      | "city"
      | "district"
      | "province"
      | "contactPerson"
      | "contactPhones"
      | "vatNumber"
      | "tinNumber"
      | "pvNumber"
      | "notes"
      | "isCommissioned"
    >
  >

export type CustomerUpdate = Partial<NewCustomer & { isDeleted: boolean }> & { id: string }
