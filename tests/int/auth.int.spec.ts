/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signup, login, signout } from '@lib/data/customer'

// Mock dependencies
vi.mock('@lib/config', () => ({
  sdk: {
    auth: {
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    },
    store: {
      customer: {
        create: vi.fn(),
      },
      cart: {
        transferCart: vi.fn(),
      },
    },
  },
}))

vi.mock('@lib/data/cookies', () => ({
  setAuthToken: vi.fn(),
  removeAuthToken: vi.fn(),
  getAuthHeaders: vi.fn(() => ({ headers: {} })),
  getCacheTag: vi.fn(() => 'customers'),
  getCacheOptions: vi.fn(() => ({ cache: 'no-store' })),
  getCartId: vi.fn(() => 'cart_123'),
  setCartId: vi.fn(),
  removeCartId: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}))

// Mock Next.js redirect with a special error that mimics Next.js behavior
// Next.js redirect throws a special error that should bubble up and not be caught
class RedirectError extends Error {
  constructor(url: string) {
    super(`REDIRECT:${url}`)
    this.name = 'NEXT_REDIRECT'
    this.digest = `NEXT_REDIRECT;${url}` // Next.js uses digest for redirect info
  }
  digest: string
}

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url)
  }),
}))

import { sdk } from '@lib/config'
import { setAuthToken, removeAuthToken } from '@lib/data/cookies'
import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('signup', () => {
    const createFormData = (data: Record<string, string>) => {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value)
      })
      return formData
    }

    const validSignupData = {
      email: 'test@example.com',
      password: 'SecurePass123',
      first_name: 'John',
      last_name: 'Doe',
      countryCode: 'us',
    }

    it('should successfully register a new user and redirect to account page', async () => {
      const formData = createFormData(validSignupData)

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      vi.mocked(sdk.store.customer.create).mockResolvedValue({ customer: { id: 'cust_123' } } as any)
      vi.mocked(sdk.store.cart.transferCart).mockResolvedValue(undefined)

      await expect(signup(null, formData)).rejects.toThrow('REDIRECT:/us/account')

      // Verify auth registration was called
      expect(sdk.auth.register).toHaveBeenCalledWith('customer', 'emailpass', {
        email: 'test@example.com',
        password: 'SecurePass123',
      })

      // Verify auth token was set
      expect(setAuthToken).toHaveBeenCalledWith('auth_token_123')

      // Verify customer was created
      expect(sdk.store.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        }),
        expect.any(Object),
        expect.any(Object)
      )

      // Verify cache was revalidated
      expect(revalidateTag).toHaveBeenCalledWith('customers', 'max')

      // Verify cart transfer was attempted
      expect(sdk.store.cart.transferCart).toHaveBeenCalled()

      // Verify redirect to country-specific account page
      expect(redirect).toHaveBeenCalledWith('/us/account')
    })

    it('should handle duplicate email gracefully', async () => {
      const formData = createFormData(validSignupData)

      const duplicateError = new Error('Email already exists')
      vi.mocked(sdk.auth.register).mockRejectedValue(duplicateError)

      const result = await signup(null, formData)

      expect(result).toBe('An account with this email already exists. Please sign in instead.')
      expect(removeAuthToken).toHaveBeenCalled()
    })

    it('should not set auth token on customer creation failure', async () => {
      const formData = createFormData(validSignupData)

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      const customerError = new Error('Customer creation failed')
      vi.mocked(sdk.store.customer.create).mockRejectedValue(customerError)

      const result = await signup(null, formData)

      // Verify auth token was NOT set (race condition fix)
      // Token is only set AFTER successful customer profile creation
      expect(setAuthToken).not.toHaveBeenCalled()

      // Verify cleanup was called in outer catch (safe to call even if token wasn't set)
      expect(removeAuthToken).toHaveBeenCalled()

      // Verify error message is returned
      expect(result).toContain('Registration failed')
    })

    it('should continue signup even if cart transfer fails', async () => {
      const formData = createFormData(validSignupData)

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      vi.mocked(sdk.store.customer.create).mockResolvedValue({ customer: { id: 'cust_123' } } as any)
      vi.mocked(sdk.store.cart.transferCart).mockRejectedValue(new Error('Cart transfer failed'))

      // Should still redirect successfully despite cart transfer failure
      await expect(signup(null, formData)).rejects.toThrow('REDIRECT:/us/account')

      // Verify cart transfer was attempted
      expect(sdk.store.cart.transferCart).toHaveBeenCalled()

      // Verify customer creation succeeded
      expect(sdk.store.customer.create).toHaveBeenCalled()

      // Verify redirect happened anyway
      expect(redirect).toHaveBeenCalledWith('/us/account')
    })

    it('should log hashed userId when cart transfer fails and LOG_SECRET is set', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const originalLogSecret = process.env.LOG_SECRET
      process.env.LOG_SECRET = 'test-secret-key-for-hashing'

      const formData = createFormData(validSignupData)

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      vi.mocked(sdk.store.customer.create).mockResolvedValue({ customer: { id: 'cust_123' } } as any)
      vi.mocked(sdk.store.cart.transferCart).mockRejectedValue(new Error('Cart transfer failed'))

      await expect(signup(null, formData)).rejects.toThrow('REDIRECT:/us/account')

      // Verify error was logged with userId field (hashed email)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Cart transfer failed after signup:',
        expect.objectContaining({
          error: expect.any(Error),
          userId: expect.any(String), // Should contain HMAC-SHA256 hash
          timestamp: expect.any(String),
        })
      )

      // Verify userId is a valid hex string (HMAC-SHA256 produces 64 hex chars)
      const loggedData = consoleErrorSpy.mock.calls[0][1] as any
      expect(loggedData.userId).toMatch(/^[a-f0-9]{64}$/)

      // Verify the email itself is NOT in the logs
      const loggedString = JSON.stringify(consoleErrorSpy.mock.calls)
      expect(loggedString).not.toContain('test@example.com')

      consoleErrorSpy.mockRestore()
      process.env.LOG_SECRET = originalLogSecret
    })

    it('should omit userId from logs when cart transfer fails and LOG_SECRET is not set', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const originalLogSecret = process.env.LOG_SECRET
      delete process.env.LOG_SECRET

      const formData = createFormData(validSignupData)

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      vi.mocked(sdk.store.customer.create).mockResolvedValue({ customer: { id: 'cust_123' } } as any)
      vi.mocked(sdk.store.cart.transferCart).mockRejectedValue(new Error('Cart transfer failed'))

      await expect(signup(null, formData)).rejects.toThrow('REDIRECT:/us/account')

      // Verify error was logged without userId field
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Cart transfer failed after signup:',
        expect.objectContaining({
          error: expect.any(Error),
          timestamp: expect.any(String),
        })
      )

      // Verify userId is NOT present when LOG_SECRET is not set
      const loggedData = consoleErrorSpy.mock.calls[0][1] as any
      expect(loggedData.userId).toBeUndefined()

      // Verify the email itself is NOT in the logs
      const loggedString = JSON.stringify(consoleErrorSpy.mock.calls)
      expect(loggedString).not.toContain('test@example.com')

      consoleErrorSpy.mockRestore()
      process.env.LOG_SECRET = originalLogSecret
    })

    it('should produce consistent hash for same email', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const originalLogSecret = process.env.LOG_SECRET
      process.env.LOG_SECRET = 'test-secret-key-for-hashing'

      const formData1 = createFormData(validSignupData)
      const formData2 = createFormData(validSignupData)

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      vi.mocked(sdk.store.customer.create).mockResolvedValue({ customer: { id: 'cust_123' } } as any)
      vi.mocked(sdk.store.cart.transferCart).mockRejectedValue(new Error('Cart transfer failed'))

      // First signup attempt
      await expect(signup(null, formData1)).rejects.toThrow('REDIRECT:/us/account')
      const firstUserId = (consoleErrorSpy.mock.calls[0][1] as any).userId

      // Second signup attempt with same email
      consoleErrorSpy.mockClear()
      await expect(signup(null, formData2)).rejects.toThrow('REDIRECT:/us/account')
      const secondUserId = (consoleErrorSpy.mock.calls[0][1] as any).userId

      // Verify same email produces same hash (consistency)
      expect(firstUserId).toBe(secondUserId)
      expect(firstUserId).toMatch(/^[a-f0-9]{64}$/) // Valid SHA-256 hash

      consoleErrorSpy.mockRestore()
      process.env.LOG_SECRET = originalLogSecret
    })

    it('should produce different hash for different emails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const originalLogSecret = process.env.LOG_SECRET
      process.env.LOG_SECRET = 'test-secret-key-for-hashing'

      const formData1 = createFormData({ ...validSignupData, email: 'user1@example.com' })
      const formData2 = createFormData({ ...validSignupData, email: 'user2@example.com' })

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      vi.mocked(sdk.store.customer.create).mockResolvedValue({ customer: { id: 'cust_123' } } as any)
      vi.mocked(sdk.store.cart.transferCart).mockRejectedValue(new Error('Cart transfer failed'))

      // First signup with user1@example.com
      await expect(signup(null, formData1)).rejects.toThrow('REDIRECT:/us/account')
      const firstUserId = (consoleErrorSpy.mock.calls[0][1] as any).userId

      // Second signup with user2@example.com
      consoleErrorSpy.mockClear()
      await expect(signup(null, formData2)).rejects.toThrow('REDIRECT:/us/account')
      const secondUserId = (consoleErrorSpy.mock.calls[0][1] as any).userId

      // Verify different emails produce different hashes
      expect(firstUserId).not.toBe(secondUserId)
      expect(firstUserId).toMatch(/^[a-f0-9]{64}$/)
      expect(secondUserId).toMatch(/^[a-f0-9]{64}$/)

      consoleErrorSpy.mockRestore()
      process.env.LOG_SECRET = originalLogSecret
    })

    // SKIP: Cannot reliably mock Node.js crypto module in ESM environment
    // The hashUserId function uses nodeCrypto.createHmac which cannot be spied on
    // in Vitest ESM mode due to module namespace being non-configurable
    it.skip('should handle HMAC generation failure gracefully when cart transfer fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const originalLogSecret = process.env.LOG_SECRET

      // Attempted approach: mock crypto.subtle (doesn't work - wrong API)
      process.env.LOG_SECRET = 'test-secret-key'
      const importKeySpy = vi.spyOn(crypto.subtle, 'importKey').mockRejectedValue(new Error('Crypto error'))

      const formData = createFormData(validSignupData)

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      vi.mocked(sdk.store.customer.create).mockResolvedValue({ customer: { id: 'cust_123' } } as any)
      vi.mocked(sdk.store.cart.transferCart).mockRejectedValue(new Error('Cart transfer failed'))

      await expect(signup(null, formData)).rejects.toThrow('REDIRECT:/us/account')

      // Verify HMAC failure was logged with structured error context
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to generate anonymous user ID:',
        expect.objectContaining({
          error: expect.any(Error),
          webCryptoAvailable: expect.any(Boolean),
          environment: expect.any(String),
          timestamp: expect.any(String),
        })
      )

      // Verify cart transfer error was still logged (without userId due to HMAC failure)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Cart transfer failed after signup:',
        expect.objectContaining({
          error: expect.any(Error),
          timestamp: expect.any(String),
        })
      )

      // Verify userId is NOT present when HMAC generation fails
      const cartErrorLog = consoleErrorSpy.mock.calls.find(
        (call) => call[0] === 'Cart transfer failed after signup:'
      )
      expect(cartErrorLog?.[1]).not.toHaveProperty('userId')

      consoleErrorSpy.mockRestore()
      importKeySpy.mockRestore()
      process.env.LOG_SECRET = originalLogSecret
    })

    it('should redirect to country-specific account page', async () => {
      const formData = createFormData({
        ...validSignupData,
        countryCode: 'ca',
      })

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      vi.mocked(sdk.store.customer.create).mockResolvedValue({ customer: { id: 'cust_123' } } as any)

      await expect(signup(null, formData)).rejects.toThrow('REDIRECT:/ca/account')
      expect(redirect).toHaveBeenCalledWith('/ca/account')
    })

    it('should accept whitespace-only password (8+ chars)', async () => {
      const formData = createFormData({
        ...validSignupData,
        password: '        ', // 8 spaces - valid password
      })

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      vi.mocked(sdk.store.customer.create).mockResolvedValue({ customer: { id: 'cust_123' } } as any)

      await expect(signup(null, formData)).rejects.toThrow('REDIRECT:/us/account')

      // Verify whitespace password is accepted
      expect(sdk.auth.register).toHaveBeenCalledWith('customer', 'emailpass', {
        email: 'test@example.com',
        password: '        ', // Preserved as-is
      })
    })

    it('should preserve leading and trailing whitespace from password', async () => {
      const formData = createFormData({
        ...validSignupData,
        password: '  SecurePass123  ', // Valid password with leading/trailing spaces
      })

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      vi.mocked(sdk.store.customer.create).mockResolvedValue({ customer: { id: 'cust_123' } } as any)
      vi.mocked(sdk.store.cart.transferCart).mockResolvedValue(undefined)

      await expect(signup(null, formData)).rejects.toThrow('REDIRECT:/us/account')

      // Verify that password is preserved with leading/trailing spaces
      expect(sdk.auth.register).toHaveBeenCalledWith('customer', 'emailpass', {
        email: 'test@example.com',
        password: '  SecurePass123  ', // Preserved as-is
      })
    })

    it('should accept password with internal whitespace', async () => {
      const formData = createFormData({
        ...validSignupData,
        password: 'my pass word', // Valid password with internal spaces (not leading/trailing)
      })

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      vi.mocked(sdk.store.customer.create).mockResolvedValue({ customer: { id: 'cust_123' } } as any)

      await expect(signup(null, formData)).rejects.toThrow('REDIRECT:/us/account')

      expect(sdk.auth.register).toHaveBeenCalledWith('customer', 'emailpass', {
        email: 'test@example.com',
        password: 'my pass word', // Whitespace preserved
      })
    })

    it('should validate email format', async () => {
      const formData = createFormData({
        ...validSignupData,
        email: 'invalid-email',
      })

      const result = await signup(null, formData)

      expect(result).toBe('Please provide a valid email address')
      expect(sdk.auth.register).not.toHaveBeenCalled()
    })

    it('should preserve email case (no lowercasing)', async () => {
      const formData = createFormData({
        ...validSignupData,
        email: 'Test@Example.COM',
      })

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      vi.mocked(sdk.store.customer.create).mockResolvedValue({ customer: { id: 'cust_123' } } as any)

      await expect(signup(null, formData)).rejects.toThrow('REDIRECT:/us/account')

      expect(sdk.auth.register).toHaveBeenCalledWith('customer', 'emailpass', {
        email: 'Test@Example.COM', // Preserved as-is
        password: 'SecurePass123',
      })
    })

    it('should trim whitespace but preserve email case in signup', async () => {
      const formData = createFormData({
        ...validSignupData,
        email: '  User@EXAMPLE.com  ', // Mixed case with whitespace
      })

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      vi.mocked(sdk.store.customer.create).mockResolvedValue({ customer: { id: 'cust_123' } } as any)

      await expect(signup(null, formData)).rejects.toThrow('REDIRECT:/us/account')

      // Verify SDK was called with trimmed but case-preserved email
      expect(sdk.auth.register).toHaveBeenCalledWith('customer', 'emailpass', {
        email: 'User@EXAMPLE.com', // Case preserved, whitespace trimmed
        password: 'SecurePass123',
      })

      // Verify customer was created with case-preserved email
      expect(sdk.store.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'User@EXAMPLE.com',
        }),
        expect.any(Object),
        expect.any(Object)
      )
    })

    it('should handle plus-addressing in email', async () => {
      const formData = createFormData({
        ...validSignupData,
        email: 'user+newsletter@example.com',
      })

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      vi.mocked(sdk.store.customer.create).mockResolvedValue({ customer: { id: 'cust_123' } } as any)

      await expect(signup(null, formData)).rejects.toThrow('REDIRECT:/us/account')

      // Verify plus-addressing is preserved (common Gmail feature)
      expect(sdk.auth.register).toHaveBeenCalledWith('customer', 'emailpass', {
        email: 'user+newsletter@example.com',
        password: 'SecurePass123',
      })
    })

    it('should validate password minimum length', async () => {
      const formData = createFormData({
        ...validSignupData,
        password: 'Short1',
      })

      const result = await signup(null, formData)

      expect(result).toBe('Please use a password of at least 8 characters')
      expect(sdk.auth.register).not.toHaveBeenCalled()
    })

    it('should validate password maximum length', async () => {
      const formData = createFormData({
        ...validSignupData,
        password: 'a'.repeat(129), // 129 characters
      })

      const result = await signup(null, formData)

      expect(result).toBe('Please use a password of no more than 128 characters')
      expect(sdk.auth.register).not.toHaveBeenCalled()
    })

    it('should validate required name fields', async () => {
      const formData = createFormData({
        ...validSignupData,
        first_name: '',
      })

      const result = await signup(null, formData)

      expect(result).toBe('Please provide your first name')
      expect(sdk.auth.register).not.toHaveBeenCalled()
    })

    it('should validate phone number with minimum digits', async () => {
      const formData = createFormData({
        ...validSignupData,
        phone: '12', // Only 2 characters (length check fails first)
      })

      const result = await signup(null, formData)

      expect(result).toBe('Please provide a valid phone number')
      expect(sdk.auth.register).not.toHaveBeenCalled()
    })

    it('should accept valid phone with extensions', async () => {
      const formData = createFormData({
        ...validSignupData,
        phone: '555-1234 ext. 123',
      })

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      vi.mocked(sdk.store.customer.create).mockResolvedValue({ customer: { id: 'cust_123' } } as any)

      await expect(signup(null, formData)).rejects.toThrow('REDIRECT:/us/account')

      expect(sdk.store.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '555-1234 ext. 123',
        }),
        expect.any(Object),
        expect.any(Object)
      )
    })

    it('should default to "us" for invalid country code', async () => {
      const formData = createFormData({
        ...validSignupData,
        countryCode: 'invalid',
      })

      vi.mocked(sdk.auth.register).mockResolvedValue('auth_token_123')
      vi.mocked(sdk.store.customer.create).mockResolvedValue({ customer: { id: 'cust_123' } } as any)

      await expect(signup(null, formData)).rejects.toThrow('REDIRECT:/us/account')
      expect(redirect).toHaveBeenCalledWith('/us/account')
    })
  })

  describe('login', () => {
    const createFormData = (data: Record<string, string>) => {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value)
      })
      return formData
    }

    const validLoginData = {
      email: 'test@example.com',
      password: 'SecurePass123',
      countryCode: 'us',
    }

    it('should successfully log in and redirect to account page', async () => {
      const formData = createFormData(validLoginData)

      vi.mocked(sdk.auth.login).mockResolvedValue('auth_token_456')
      vi.mocked(sdk.store.cart.transferCart).mockResolvedValue(undefined)

      await expect(login(null, formData)).rejects.toThrow('REDIRECT:/us/account')

      expect(sdk.auth.login).toHaveBeenCalledWith('customer', 'emailpass', {
        email: 'test@example.com',
        password: 'SecurePass123',
      })

      expect(setAuthToken).toHaveBeenCalledWith('auth_token_456')
      expect(revalidateTag).toHaveBeenCalledWith('customers', 'max')
      expect(sdk.store.cart.transferCart).toHaveBeenCalled()
      expect(redirect).toHaveBeenCalledWith('/us/account')
    })

    it('should handle invalid credentials gracefully', async () => {
      const formData = createFormData(validLoginData)

      vi.mocked(sdk.auth.login).mockRejectedValue(new Error('Invalid credentials'))

      const result = await login(null, formData)

      expect(result).toBe('Invalid email or password. Please try again.')
      expect(setAuthToken).not.toHaveBeenCalled()
    })

    it('should continue login even if cart transfer fails', async () => {
      const formData = createFormData(validLoginData)

      vi.mocked(sdk.auth.login).mockResolvedValue('auth_token_456')
      vi.mocked(sdk.store.cart.transferCart).mockRejectedValue(new Error('Cart transfer failed'))

      await expect(login(null, formData)).rejects.toThrow('REDIRECT:/us/account')

      expect(sdk.store.cart.transferCart).toHaveBeenCalled()
      expect(redirect).toHaveBeenCalledWith('/us/account')
    })

    it('should preserve email case (no lowercasing)', async () => {
      const formData = createFormData({
        ...validLoginData,
        email: 'Test@Example.COM',
      })

      vi.mocked(sdk.auth.login).mockResolvedValue('auth_token_456')

      await expect(login(null, formData)).rejects.toThrow('REDIRECT:/us/account')

      expect(sdk.auth.login).toHaveBeenCalledWith('customer', 'emailpass', {
        email: 'Test@Example.COM', // Preserved as-is
        password: 'SecurePass123',
      })
    })

    it('should work with different email case (Medusa handles case-insensitivity)', async () => {
      // This test verifies that Medusa SDK handles case-insensitive email lookups
      // User can login with any case variation of their registered email
      const formData = createFormData({
        ...validLoginData,
        email: 'TEST@EXAMPLE.COM', // Different case than usual validLoginData
      })

      vi.mocked(sdk.auth.login).mockResolvedValue('auth_token_456')

      await expect(login(null, formData)).rejects.toThrow('REDIRECT:/us/account')

      // Verify SDK receives the email as-is (Medusa performs case-insensitive lookup)
      expect(sdk.auth.login).toHaveBeenCalledWith('customer', 'emailpass', {
        email: 'TEST@EXAMPLE.COM', // Passed through without modification
        password: 'SecurePass123',
      })
      expect(redirect).toHaveBeenCalledWith('/us/account')
    })

    it('should redirect to country-specific account page', async () => {
      const formData = createFormData({
        ...validLoginData,
        countryCode: 'gb',
      })

      vi.mocked(sdk.auth.login).mockResolvedValue('auth_token_456')

      await expect(login(null, formData)).rejects.toThrow('REDIRECT:/gb/account')
      expect(redirect).toHaveBeenCalledWith('/gb/account')
    })

    it('should validate email format', async () => {
      const formData = createFormData({
        ...validLoginData,
        email: 'invalid',
      })

      const result = await login(null, formData)

      expect(result).toBe('Please provide a valid email address')
      expect(sdk.auth.login).not.toHaveBeenCalled()
    })

    it('should validate password is provided', async () => {
      const formData = createFormData({
        ...validLoginData,
        password: '',
      })

      const result = await login(null, formData)

      expect(result).toBe('Please provide your password')
      expect(sdk.auth.login).not.toHaveBeenCalled()
    })
  })

  describe('signout', () => {
    it('should successfully sign out and redirect to account page', async () => {
      vi.mocked(sdk.auth.logout).mockResolvedValue(undefined)

      await expect(signout('us')).rejects.toThrow('REDIRECT:/us/account')

      expect(sdk.auth.logout).toHaveBeenCalled()
      expect(removeAuthToken).toHaveBeenCalled()
      expect(redirect).toHaveBeenCalledWith('/us/account')
    })

    it('should redirect to country-specific account page', async () => {
      vi.mocked(sdk.auth.logout).mockResolvedValue(undefined)

      await expect(signout('ca')).rejects.toThrow('REDIRECT:/ca/account')
      expect(redirect).toHaveBeenCalledWith('/ca/account')
    })

    it('should validate and sanitize invalid country code', async () => {
      vi.mocked(sdk.auth.logout).mockResolvedValue(undefined)

      // Invalid country code should default to 'us'
      await expect(signout('invalid')).rejects.toThrow('REDIRECT:/us/account')
      expect(redirect).toHaveBeenCalledWith('/us/account')
    })

    it('should handle logout errors gracefully', async () => {
      vi.mocked(sdk.auth.logout).mockRejectedValue(new Error('Logout failed'))

      // Should still attempt to clean up local state
      await expect(signout('us')).rejects.toThrow()

      expect(sdk.auth.logout).toHaveBeenCalled()
    })
  })
})
