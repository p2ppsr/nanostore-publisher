import { submitPayment } from '../components/submitPayment'
import { AuthriteClient } from 'authrite-js'
import { CONFIG } from '../components/defaults'

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
      code: 'PAYMENT_ERROR'
    }

    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue(mockErrorResponse)
    }))

    await expect(submitPayment(mockSubmitPaymentParams)).rejects.toThrow(
      'Payment failed'
    )

    try {
      await submitPayment(mockSubmitPaymentParams)
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        expect((error as Error & { code: string }).code).toBe('PAYMENT_ERROR')
      } else {
        fail('Expected error with code property')
      }
    }
  })

  it('should use default CONFIG if no config is provided', async () => {
    const mockPaymentResult = {
      uploadURL: 'https://test.upload.com',
      publicURL: 'https://test.public.com',
      status: 'success'
    }

    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue(mockPaymentResult)
    }))

    await submitPayment({
      ...mockSubmitPaymentParams,
      config: undefined
    })

    expect(AuthriteClient).toHaveBeenCalledWith(CONFIG.nanostoreURL, {
      clientPrivateKey: CONFIG.clientPrivateKey
    })
  })

  it('should handle input validation', async () => {
    await expect(
      submitPayment({ ...mockSubmitPaymentParams, amount: -1 })
    ).rejects.toThrow('Invalid amount')
    await expect(
      submitPayment({ ...mockSubmitPaymentParams, orderID: '' })
    ).rejects.toThrow('Invalid order ID')
    await expect(
      submitPayment({ ...mockSubmitPaymentParams, vout: -1 })
    ).rejects.toThrow('Invalid vout')
  })

  it('should submit a payment with minimum valid inputs', async () => {
    const minimalParams = {
      orderID: 'minOrder',
      amount: 1,
      payment: { inputs: [], mapiResponses: [], rawTx: 'minRawTx' },
      vout: 0,
      derivationPrefix: 'minPrefix',
      derivationSuffix: 'minSuffix'
    }

    await expect(submitPayment(minimalParams)).resolves.not.toThrow()
  })

  it('should handle edge cases for numeric inputs', async () => {
    await expect(
      submitPayment({ ...mockSubmitPaymentParams, amount: 0.1 })
    ).rejects.toThrow('Invalid amount')
    await expect(
      submitPayment({ ...mockSubmitPaymentParams, amount: 0 })
    ).rejects.toThrow('Invalid amount')
    await expect(
      submitPayment({ ...mockSubmitPaymentParams, amount: -1 })
    ).rejects.toThrow('Invalid amount')
    await expect(
      submitPayment({
        ...mockSubmitPaymentParams,
        amount: Number.MAX_SAFE_INTEGER
      })
    ).resolves.not.toThrow()
    await expect(
      submitPayment({ ...mockSubmitPaymentParams, vout: 0 })
    ).resolves.not.toThrow()
    await expect(
      submitPayment({
        ...mockSubmitPaymentParams,
        vout: Number.MAX_SAFE_INTEGER
      })
    ).resolves.not.toThrow()
  })

  it('should send the correct request structure to AuthriteClient', async () => {
    const mockCreateSignedRequest = jest.fn().mockResolvedValue({
      uploadURL: 'https://test.upload.com',
      publicURL: 'https://test.public.com',
      status: 'success'
    })

    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: mockCreateSignedRequest
    }))

    await submitPayment(mockSubmitPaymentParams)

    expect(mockCreateSignedRequest).toHaveBeenCalledWith('/pay', {
      derivationPrefix: mockSubmitPaymentParams.derivationPrefix,
      transaction: {
        ...mockSubmitPaymentParams.payment,
        outputs: [
          {
            vout: mockSubmitPaymentParams.vout,
            satoshis: mockSubmitPaymentParams.amount,
            derivationSuffix: mockSubmitPaymentParams.derivationSuffix
          }
        ]
      },
      orderID: mockSubmitPaymentParams.orderID
    })
  })

  it('should handle different payment object structures', async () => {
    const customPayment = {
      inputs: [
        {
          txid: 'customTxid',
          vout: 1,
          satoshis: 2000,
          scriptSig: 'customScriptSig'
        }
      ],
      mapiResponses: [
        {
          payload: 'customPayload',
          signature: 'customSignature',
          publicKey: 'customPublicKey'
        }
      ],
      rawTx: 'customRawTx',
      extraField: 'shouldBeIgnored'
    }

    await expect(
      submitPayment({ ...mockSubmitPaymentParams, payment: customPayment })
    ).resolves.not.toThrow()
  })

  it('should handle network failures', async () => {
    (AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest
        .fn()
        .mockRejectedValue(new Error('Network error'))
    }))

    await expect(submitPayment(mockSubmitPaymentParams)).rejects.toThrow(
      'Network error'
    )
  })
})
