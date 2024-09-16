/* eslint-disable @typescript-eslint/no-explicit-any */
import { pay } from '../components/pay'
import { derivePaymentInfo } from '../components/derivePaymentInfo'
import { createAction } from '@babbage/sdk-ts'
import { AuthriteClient } from 'authrite-js'
import { Ninja } from 'ninja-base'
import { CONFIG } from '../components/defaults'

jest.mock('../components/derivePaymentInfo')
jest.mock('@babbage/sdk-ts')
jest.mock('authrite-js')
jest.mock('ninja-base')

describe('pay function', () => {
  const mockConfig = {
    ...CONFIG,
    nanostoreURL: 'https://test.nanostore.com',
    clientPrivateKey: 'mockPrivateKey',
    dojoURL: 'https://test.dojo.com'
  }

  const mockPayParams = {
    description: 'Test payment',
    orderID: 'testOrderID',
    recipientPublicKey: 'testRecipientPublicKey',
    amount: 1000
  }

  const mockPaymentInfo = {
    output: { script: 'mockScript', satoshis: 1000 },
    derivationPrefix: 'mockPrefix',
    derivationSuffix: 'mockSuffix'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(derivePaymentInfo as jest.Mock).mockResolvedValue(mockPaymentInfo)
  })

  it('should create a payment using Ninja when clientPrivateKey is provided', async () => {
    const mockNinjaTransaction = { txid: 'mockTxid' }
    ;(Ninja as jest.Mock).mockImplementation(() => ({
      getTransactionWithOutputs: jest
        .fn()
        .mockResolvedValue(mockNinjaTransaction)
    }))

    const mockPayResponse = {
      uploadURL: 'https://test.upload.com',
      publicURL: 'https://test.public.com',
      status: 'success'
    }
    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue(mockPayResponse)
    }))

    const result = await pay({ ...mockPayParams, config: mockConfig })

    expect(Ninja).toHaveBeenCalledWith({
      privateKey: mockConfig.clientPrivateKey,
      config: { dojoURL: mockConfig.dojoURL }
    })
    expect(AuthriteClient).toHaveBeenCalledWith(mockConfig.nanostoreURL, {
      clientPrivateKey: mockConfig.clientPrivateKey
    })
    expect(result).toEqual(mockPayResponse)
  })

  it('should create a payment using createAction when clientPrivateKey is not provided', async () => {
    const configWithoutPrivateKey = {
      ...mockConfig,
      clientPrivateKey: undefined
    }
    const mockActionResponse = { txid: 'mockTxid' }
    ;(createAction as jest.Mock).mockResolvedValue(mockActionResponse)

    const mockPayResponse = {
      uploadURL: 'https://test.upload.com',
      publicURL: 'https://test.public.com',
      status: 'success'
    }
    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue(mockPayResponse)
    }))

    const result = await pay({
      ...mockPayParams,
      config: configWithoutPrivateKey
    })

    expect(createAction).toHaveBeenCalledWith(
      expect.objectContaining({
        outputs: [mockPaymentInfo.output],
        description: mockPayParams.description,
        labels: ['nanostore'],
        topics: ['UHRP']
      })
    )
    expect(AuthriteClient).toHaveBeenCalledWith(
      configWithoutPrivateKey.nanostoreURL,
      undefined
    )
    expect(result).toEqual(mockPayResponse)
  })

  it('should throw an error if createAction returns an error status', async () => {
    const configWithoutPrivateKey = {
      ...mockConfig,
      clientPrivateKey: undefined
    }
    const mockErrorResponse = {
      status: 'error',
      description: 'Payment failed',
      code: 'PAYMENT_ERROR'
    }
    ;(createAction as jest.Mock).mockResolvedValue(mockErrorResponse)

    await expect(
      pay({ ...mockPayParams, config: configWithoutPrivateKey })
    ).rejects.toThrow('Failed to create payment') // Updated message

    try {
      await pay({ ...mockPayParams, config: configWithoutPrivateKey })
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        expect((error as Error & { code: string }).code).toBe(
          'ERR_CREATE_PAYMENT'
        )
      } else {
        fail('Expected error with code property')
      }
    }
  })

  it('should throw an error if AuthriteClient returns an error status', async () => {
    const mockErrorResponse = {
      status: 'error',
      description: 'Invalid order ID',
      code: 'INVALID_ORDER'
    }
    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue(mockErrorResponse)
    }))

    await expect(pay({ ...mockPayParams, config: mockConfig })).rejects.toThrow(
      'Failed to complete pay request' // Updated message
    )

    try {
      await pay({ ...mockPayParams, config: mockConfig })
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        expect((error as Error & { code: string }).code).toBe('ERR_PAY_REQUEST')
      } else {
        fail('Expected error with code property')
      }
    }
  })

  it('should use default CONFIG if no config is provided', async () => {
    const mockErrorResponse = {
      status: 'error',
      description: 'Payment failed',
      code: 'ERR_CREATE_PAYMENT'
    }
    ;(createAction as jest.Mock).mockResolvedValue(mockErrorResponse)
    ;(derivePaymentInfo as jest.Mock).mockImplementation(params => {
      expect(params.config).toEqual(CONFIG)
      return Promise.resolve(mockPaymentInfo)
    })

    try {
      await pay(mockPayParams)
      fail('Expected an error to be thrown')
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe('Failed to create payment') // Updated message
        expect((error as any).code).toBe('ERR_CREATE_PAYMENT')
      } else {
        fail('Expected an Error to be thrown')
      }
    }

    expect(derivePaymentInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        config: CONFIG,
        recipientPublicKey: mockPayParams.recipientPublicKey,
        amount: mockPayParams.amount
      })
    )

    // Verify that createAction was called with the expected parameters
    expect(createAction).toHaveBeenCalledWith(
      expect.objectContaining({
        outputs: [mockPaymentInfo.output],
        description: mockPayParams.description,
        labels: ['nanostore'],
        topics: ['UHRP']
      })
    )
  })

  it('should handle input validation', async () => {
    await expect(pay({ ...mockPayParams, amount: -1 })).rejects.toThrow(
      'Invalid amount'
    )
    await expect(pay({ ...mockPayParams, orderID: '' })).rejects.toThrow(
      'Invalid order ID'
    )
    await expect(
      pay({ ...mockPayParams, recipientPublicKey: '' })
    ).rejects.toThrow('Invalid recipient public key')
  })
})
