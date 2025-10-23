import { isEqual, pick } from "lodash"
import { HttpTypes } from "@medusajs/types"

export default function compareAddresses(
  address1: HttpTypes.StoreCartAddress | HttpTypes.StoreCustomerAddress,
  address2: HttpTypes.StoreCartAddress | HttpTypes.StoreCustomerAddress
) {
  return isEqual(
    pick(address1, [
      "first_name",
      "last_name",
      "address_1",
      "company",
      "postal_code",
      "city",
      "country_code",
      "province",
      "phone",
    ]),
    pick(address2, [
      "first_name",
      "last_name",
      "address_1",
      "company",
      "postal_code",
      "city",
      "country_code",
      "province",
      "phone",
    ])
  )
}
