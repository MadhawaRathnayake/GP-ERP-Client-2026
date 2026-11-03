export interface Supplier {
  // "SUP00001"
  id: string
  code: string
  name: string
  // e.g. ["+94112345678"]
  phones: string[]
  email: string | null
  houseNumber: string | null
  street: string | null
  city: string | null
  district: string | null
  province: string | null
  country: string
  // e.g. "109860522-7000", "109860522", "PV-00300617"
  vatNumber: string | null
  tinNumber: string | null
  pvNumber: string | null
  createdBy: string | null
  createdAt: string
  modifiedBy: string | null
  modifiedAt: string | null
  // true = deleted; it can be restored.
  isDeleted: boolean
}

// On create, phones defaults to [] and the other optional fields to null.
export type NewSupplier = Pick<Supplier, "code" | "name" | "country"> &
  Partial<
    Pick<
      Supplier,
      "phones" | "email" | "houseNumber" | "street" | "city" | "district" | "province" | "vatNumber" | "tinNumber" | "pvNumber"
    >
  >

export type SupplierUpdate = Partial<NewSupplier & { isDeleted: boolean }> & { id: string }