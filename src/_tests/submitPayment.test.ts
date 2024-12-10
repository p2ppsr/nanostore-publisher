import { submitPayment } from '../components/submitPayment'
import { AuthriteClient } from 'authrite-js'
import { CONFIG } from '../components/defaults'
import { NanoStorePublisherError, ErrorWithCode } from '../utils/errors'

jest.mock('authrite-js')

describe('submitPayment function', () => {
  const mockConfig = {
    ...CONFIG,
    nanostoreURL: 'https://test.nanostore.com',
    clientPrivateKey: 'mockPrivateKey'
  }

  const mockPayment = {
    inputs: [
      { txid: 'mockTxid', vout: 0, satoshis: 1000, scriptSig: 'mockScriptSig' }
    ],
    mapiResponses: [
      {
        payload: 'mockPayload',
        signature: 'mockSignature',
        publicKey: 'mockPublicKey'
      }
    ],
    rawTx: 'mockRawTx'
  }

  const mockSubmitPaymentParams = {
    config: mockConfig,
    orderID: 'mockOrderID',
    amount: 1000,
    payment: mockPayment,
    vout: 0,
    derivationPrefix: 'mockPrefix',
    derivationSuffix: 'mockSuffix'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should submit a payment successfully', async () => {
    const mockPaymentResult = {
      uploadURL: 'https://test.upload.com',
      publicURL: 'https://test.public.com',
      status: 'success'
    }

    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue(mockPaymentResult)
    }))

    const result = await submitPayment(mockSubmitPaymentParams)

    expect(AuthriteClient).toHaveBeenCalledWith(mockConfig.nanostoreURL, {
      clientPrivateKey: mockConfig.clientPrivateKey
    })
    expect(result).toEqual(mockPaymentResult)
  })

  it('should throw an error if AuthriteClient returns an error status', async () => {
    const mockErrorResponse = {
      status: 'error',
      description: 'Payment failed',
      code: 'ERR_PAYMENT_FAILED'
    }

    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue(mockErrorResponse)
    }))

    await expect(submitPayment(mockSubmitPaymentParams)).rejects.toMatchObject({
      message: 'Failed to submit payment for order mockOrderID: Payment failed',
      code: 'ERR_SUBMIT_PAYMENT'
    })
  })

  it('should use default CONFIG if no config is provided', async () => {
    const mockPaymentResult = {
      uploadURL: 'https://test.upload.com',
      publicURL: 'https://test.public.com',
      status: 'success'
    }

    const configWithPrivateKey = {
      ...CONFIG,
      clientPrivateKey: 'mockPrivateKey'
    }
    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue(mockPaymentResult)
    }))

    await submitPayment({
      ...mockSubmitPaymentParams,
      config: configWithPrivateKey
    })

    expect(AuthriteClient).toHaveBeenCalledWith(
      configWithPrivateKey.nanostoreURL,
      {
        clientPrivateKey: configWithPrivateKey.clientPrivateKey
      }
    )
  })

  it('should handle various edge cases for numeric inputs', async () => {
    const mockPaymentResult = {
      uploadURL: 'https://test.upload.com',
      publicURL: 'https://test.public.com',
      status: 'success'
    }

    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue(mockPaymentResult)
    }))

    await expect(
      submitPayment({
        ...mockSubmitPaymentParams,
        amount: Number.MAX_SAFE_INTEGER
      })
    ).resolves.not.toThrow()

    await expect(
      submitPayment({
        ...mockSubmitPaymentParams,
        vout: Number.MAX_SAFE_INTEGER
      })
    ).resolves.not.toThrow()
  })
})
