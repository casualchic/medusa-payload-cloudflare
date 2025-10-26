/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing the module
vi.mock('@lib/config', () => ({
  sdk: {
    store: {
      customer: {
        retrieve: vi.fn(),
        update: vi.fn(),
        createAddress: vi.fn(),
        deleteAddress: vi.fn(),
        updateAddress: vi.fn(),
      },
    },
  },
}))

vi.mock('@lib/data/cookies', () => ({
  getAuthHeaders: vi.fn(),
  getCacheTag: vi.fn(),
  getCacheOptions: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}))

vi.mock('@lib/util/medusa-error', () => ({
  default: vi.fn((error) => {
    throw error
  }),
}))

// Import after mocks are set up
import { sdk } from '@lib/config'
import { getAuthHeaders, getCacheTag, getCacheOptions } from '@lib/data/cookies'
import { revalidateTag } from 'next/cache'
import { retrieveCustomer, updateCustomer, addCustomerAddress, deleteCustomerAddress, updateCustomerAddress } from '@lib/data/customer'

describe('Customer Data Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCacheOptions).mockResolvedValue({ tags: [] })
  })

  describe('retrieveCustomer', () => {
    it('should retrieve customer successfully', async () => {
      const mockCustomer = {
        id: 'cust_123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
      }

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ customer: mockCustomer }),
      } as Response)
      global.fetch = fetchMock

      const result = await retrieveCustomer()

      expect(result).toEqual(mockCustomer)
      expect(getAuthHeaders).toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalled()
    })

    it('should return null when auth headers are missing', async () => {
      vi.mocked(getAuthHeaders).mockResolvedValue(null as any)

      const result = await retrieveCustomer()

      expect(result).toBeNull()
    })

    it('should return null when auth headers are empty', async () => {
      vi.mocked(getAuthHeaders).mockResolvedValue({})

      const result = await retrieveCustomer()

      expect(result).toBeNull()
    })

    it('should handle errors gracefully and return null', async () => {
      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await retrieveCustomer()

      expect(result).toBeNull()
    })

    it('should log errors to console when fetch fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })

      global.fetch = vi.fn().mockRejectedValue(new Error('API Error'))

      const result = await retrieveCustomer()

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in retrieveCustomer:', expect.any(Error))

      consoleErrorSpy.mockRestore()
    })
  })

  describe('updateCustomer', () => {
    it('should update customer successfully', async () => {
      const updateData = {
        first_name: 'Jane',
        last_name: 'Smith',
      }
      const mockUpdatedCustomer = {
        id: 'cust_123',
        ...updateData,
      }

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(getCacheTag).mockResolvedValue('customers-tag')
      vi.mocked(sdk.store.customer.update).mockResolvedValue({ customer: mockUpdatedCustomer } as any)
      vi.mocked(revalidateTag).mockResolvedValue(undefined)

      const result = await updateCustomer(updateData)

      expect(result).toEqual(mockUpdatedCustomer)
      expect(sdk.store.customer.update).toHaveBeenCalledWith(updateData, {}, { authorization: 'Bearer token' })
      expect(revalidateTag).toHaveBeenCalledWith('customers-tag', 'max')
    })

    it('should throw error when update fails', async () => {
      const updateData = { first_name: 'Jane' }
      const error = new Error('Update failed')

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(sdk.store.customer.update).mockRejectedValue(error)

      await expect(updateCustomer(updateData)).rejects.toThrow('Update failed')
    })

    it('should handle empty update object', async () => {
      const updateData = {}

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(getCacheTag).mockResolvedValue('customers-tag')
      vi.mocked(sdk.store.customer.update).mockResolvedValue({ customer: { id: 'cust_123' } } as any)
      vi.mocked(revalidateTag).mockResolvedValue(undefined)

      const result = await updateCustomer(updateData)

      expect(result).toEqual({ id: 'cust_123' })
      expect(sdk.store.customer.update).toHaveBeenCalledWith({}, {}, { authorization: 'Bearer token' })
    })

    it('should handle special characters in name fields', async () => {
      const updateData = {
        first_name: "O'Brien",
        last_name: 'Müller-Schmidt',
      }

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(getCacheTag).mockResolvedValue('customers-tag')
      vi.mocked(sdk.store.customer.update).mockResolvedValue({ customer: { id: 'cust_123', ...updateData } } as any)
      vi.mocked(revalidateTag).mockResolvedValue(undefined)

      const result = await updateCustomer(updateData)

      expect(result).toEqual({ id: 'cust_123', ...updateData })
    })

    it('should handle phone number update', async () => {
      const updateData = {
        phone: '+1-555-123-4567',
      }

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(getCacheTag).mockResolvedValue('customers-tag')
      vi.mocked(sdk.store.customer.update).mockResolvedValue({ customer: { id: 'cust_123', ...updateData } } as any)
      vi.mocked(revalidateTag).mockResolvedValue(undefined)

      const result = await updateCustomer(updateData)

      expect(result.phone).toBe('+1-555-123-4567')
    })

    it('should handle email update', async () => {
      const updateData = {
        email: 'newemail@example.com',
      }

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(getCacheTag).mockResolvedValue('customers-tag')
      vi.mocked(sdk.store.customer.update).mockResolvedValue({ customer: { id: 'cust_123', ...updateData } } as any)
      vi.mocked(revalidateTag).mockResolvedValue(undefined)

      const result = await updateCustomer(updateData)

      expect(result.email).toBe('newemail@example.com')
    })

    it('should handle multiple fields update', async () => {
      const updateData = {
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '+1-555-999-0000',
        email: 'jane.smith@example.com',
      }

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(getCacheTag).mockResolvedValue('customers-tag')
      vi.mocked(sdk.store.customer.update).mockResolvedValue({ customer: { id: 'cust_123', ...updateData } } as any)
      vi.mocked(revalidateTag).mockResolvedValue(undefined)

      const result = await updateCustomer(updateData)

      expect(result).toEqual({ id: 'cust_123', ...updateData })
    })

    it('should handle SDK error responses gracefully', async () => {
      const updateData = { first_name: 'Jane' }
      const sdkError = {
        code: 'invalid_data',
        message: 'Invalid customer data',
        type: 'invalid_request_error',
      }

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(sdk.store.customer.update).mockRejectedValue(sdkError)

      await expect(updateCustomer(updateData)).rejects.toEqual(sdkError)
    })
  })

  describe('addCustomerAddress', () => {
    it('should add customer address successfully', async () => {
      const formData = new FormData()
      formData.append('first_name', 'John')
      formData.append('last_name', 'Doe')
      formData.append('address_1', '123 Main St')
      formData.append('city', 'New York')
      formData.append('province', 'NY')
      formData.append('postal_code', '10001')
      formData.append('country_code', 'us')

      const currentState = { isDefaultBilling: false, isDefaultShipping: false }

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(getCacheTag).mockResolvedValue('customers-tag')
      vi.mocked(sdk.store.customer.createAddress).mockResolvedValue({} as any)
      vi.mocked(revalidateTag).mockResolvedValue(undefined)

      const result = await addCustomerAddress(currentState, formData)

      expect(result).toEqual({ success: true, error: null, isDefaultBilling: false, isDefaultShipping: false })
      expect(sdk.store.customer.createAddress).toHaveBeenCalled()
      expect(revalidateTag).toHaveBeenCalledWith('customers-tag', 'max')
    })

    it('should handle address creation errors', async () => {
      const formData = new FormData()
      formData.append('first_name', 'John')
      formData.append('last_name', 'Doe')
      formData.append('address_1', '123 Main St')

      const currentState = { isDefaultBilling: false, isDefaultShipping: false }

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(sdk.store.customer.createAddress).mockRejectedValue(new Error('Invalid address'))

      const result = await addCustomerAddress(currentState, formData)

      expect(result).toEqual({ success: false, error: 'Invalid address', isDefaultBilling: false, isDefaultShipping: false })
    })

    it('should handle missing required fields', async () => {
      const formData = new FormData()
      // Only add first_name, missing other required fields
      formData.append('first_name', 'John')

      const currentState = { isDefaultBilling: false, isDefaultShipping: false }

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(sdk.store.customer.createAddress).mockRejectedValue(new Error('Missing required fields'))

      const result = await addCustomerAddress(currentState, formData)

      expect(result).toEqual({ success: false, error: 'Missing required fields', isDefaultBilling: false, isDefaultShipping: false })
    })

    it('should handle empty FormData', async () => {
      const formData = new FormData()
      const currentState = { isDefaultBilling: false, isDefaultShipping: false }

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(sdk.store.customer.createAddress).mockRejectedValue(new Error('Missing required fields'))

      const result = await addCustomerAddress(currentState, formData)

      expect(result).toEqual({ success: false, error: 'Missing required fields', isDefaultBilling: false, isDefaultShipping: false })
    })

    it('should handle invalid country code in address', async () => {
      const formData = new FormData()
      formData.append('first_name', 'John')
      formData.append('last_name', 'Doe')
      formData.append('address_1', '123 Main St')
      formData.append('city', 'New York')
      formData.append('postal_code', '10001')
      formData.append('country_code', 'INVALID')

      const currentState = { isDefaultBilling: false, isDefaultShipping: false }

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(sdk.store.customer.createAddress).mockRejectedValue(new Error('Invalid country code'))

      const result = await addCustomerAddress(currentState, formData)

      expect(result).toEqual({ success: false, error: 'Invalid country code', isDefaultBilling: false, isDefaultShipping: false })
    })

    it('should preserve isDefaultBilling and isDefaultShipping flags', async () => {
      const formData = new FormData()
      formData.append('first_name', 'John')
      formData.append('last_name', 'Doe')
      formData.append('address_1', '123 Main St')
      formData.append('city', 'New York')
      formData.append('postal_code', '10001')
      formData.append('country_code', 'us')

      const currentState = { isDefaultBilling: true, isDefaultShipping: true }

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(getCacheTag).mockResolvedValue('customers-tag')
      vi.mocked(sdk.store.customer.createAddress).mockResolvedValue({} as any)
      vi.mocked(revalidateTag).mockResolvedValue(undefined)

      const result = await addCustomerAddress(currentState, formData)

      expect(result).toEqual({ success: true, error: null, isDefaultBilling: true, isDefaultShipping: true })

      // Verify the address was created with the correct flags
      const createAddressCall = vi.mocked(sdk.store.customer.createAddress).mock.calls[0][0]
      expect(createAddressCall).toMatchObject({
        is_default_billing: true,
        is_default_shipping: true,
      })
    })
  })

  describe('deleteCustomerAddress', () => {
    it('should delete customer address successfully', async () => {
      const addressId = 'addr_123'

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(getCacheTag).mockResolvedValue('customers-tag')
      vi.mocked(sdk.store.customer.deleteAddress).mockResolvedValue({} as any)
      vi.mocked(revalidateTag).mockResolvedValue(undefined)

      const result = await deleteCustomerAddress(addressId)

      expect(result).toEqual({ success: true, error: null })
      expect(sdk.store.customer.deleteAddress).toHaveBeenCalledWith(addressId, { authorization: 'Bearer token' })
      expect(revalidateTag).toHaveBeenCalledWith('customers-tag', 'max')
    })

    it('should handle deletion errors gracefully', async () => {
      const addressId = 'addr_123'
      const error = new Error('Address not found')

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(sdk.store.customer.deleteAddress).mockRejectedValue(error)

      const result = await deleteCustomerAddress(addressId)

      expect(result).toEqual({ success: false, error: 'Address not found' })
    })

    it('should handle non-Error exceptions', async () => {
      const addressId = 'addr_123'

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(sdk.store.customer.deleteAddress).mockRejectedValue('Unknown error')

      const result = await deleteCustomerAddress(addressId)

      expect(result).toEqual({ success: false, error: 'Unknown error' })
    })
  })

  describe('updateCustomerAddress', () => {
    it('should update customer address successfully', async () => {
      const addressId = 'addr_123'
      const formData = new FormData()
      formData.append('first_name', 'Jane')
      formData.append('last_name', 'Doe')
      formData.append('address_1', '456 Oak Ave')
      formData.append('city', 'New York')
      formData.append('postal_code', '10001')

      const currentState = { addressId }

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(getCacheTag).mockResolvedValue('customers-tag')
      vi.mocked(sdk.store.customer.updateAddress).mockResolvedValue({} as any)
      vi.mocked(revalidateTag).mockResolvedValue(undefined)

      const result = await updateCustomerAddress(currentState, formData)

      expect(result).toEqual({ success: true, error: null, addressId })
      expect(sdk.store.customer.updateAddress).toHaveBeenCalled()
      expect(revalidateTag).toHaveBeenCalledWith('customers-tag', 'max')
    })

    it('should handle address update errors', async () => {
      const addressId = 'addr_123'
      const formData = new FormData()
      formData.append('first_name', 'Jane')

      const currentState = { addressId }

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(sdk.store.customer.updateAddress).mockRejectedValue(new Error('Update failed'))

      const result = await updateCustomerAddress(currentState, formData)

      expect(result).toEqual({ success: false, error: 'Update failed', addressId })
    })

    it('should return error when addressId is missing', async () => {
      const formData = new FormData()
      formData.append('first_name', 'Jane')

      const currentState = {} // No addressId

      const result = await updateCustomerAddress(currentState, formData)

      expect(result).toEqual({ success: false, error: 'Address ID is required', addressId: undefined })
      expect(sdk.store.customer.updateAddress).not.toHaveBeenCalled()
    })

    it('should accept addressId from FormData as fallback', async () => {
      const addressId = 'addr_456'
      const formData = new FormData()
      formData.append('addressId', addressId)
      formData.append('first_name', 'Jane')
      formData.append('last_name', 'Smith')
      formData.append('address_1', '789 Elm St')

      const currentState = {} // No addressId in state

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(getCacheTag).mockResolvedValue('customers-tag')
      vi.mocked(sdk.store.customer.updateAddress).mockResolvedValue({} as any)
      vi.mocked(revalidateTag).mockResolvedValue(undefined)

      const result = await updateCustomerAddress(currentState, formData)

      expect(result).toEqual({ success: true, error: null, addressId })
      expect(sdk.store.customer.updateAddress).toHaveBeenCalled()
    })

    it('should prefer addressId from currentState over FormData', async () => {
      const stateAddressId = 'addr_state'
      const formAddressId = 'addr_form'
      const formData = new FormData()
      formData.append('addressId', formAddressId)
      formData.append('first_name', 'Jane')

      const currentState = { addressId: stateAddressId }

      vi.mocked(getAuthHeaders).mockResolvedValue({ authorization: 'Bearer token' })
      vi.mocked(getCacheTag).mockResolvedValue('customers-tag')
      vi.mocked(sdk.store.customer.updateAddress).mockResolvedValue({} as any)
      vi.mocked(revalidateTag).mockResolvedValue(undefined)

      const result = await updateCustomerAddress(currentState, formData)

      // Should use stateAddressId, not formAddressId
      expect(result).toEqual({ success: true, error: null, addressId: stateAddressId })
    })
  })
})
