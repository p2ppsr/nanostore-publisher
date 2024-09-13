import { invoice } from '../components/invoice'
import { AuthriteClient } from 'authrite-js'
import { CONFIG } from '../components/defaults'

jest.mock('authrite-js')

describe('invoice function', () => {
  const mockConfig = {
    ...CONFIG,
    nanostoreURL: 'https://test.nanostore.com',
    clientPrivateKey: 'mockPrivateKey'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create an invoice successfully', async () => {
    const mockInvoiceResponse = {
      message: 'Invoice created',
      identityKey: 'mockIdentityKey',
      amount: 1000,
      ORDER_ID: 'mockOrderId',
      publicURL: 'https://test.nanostore.com/file',
      status: 'success'
    }

    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue(mockInvoiceResponse)
    }))

    const result = await invoice({
      config: mockConfig,
      fileSize: 1024,
      retentionPeriod: 60
    })

    expect(AuthriteClient).toHaveBeenCalledWith('https://test.nanostore.com', {
      clientPrivateKey: 'mockPrivateKey'
    })
    expect(result).toEqual(mockInvoiceResponse)
  })

  it('should throw an error if the server returns an error status', async () => {
    const mockErrorResponse = {
      status: 'error',
      description: 'Invalid file size',
      code: 'INVALID_SIZE'
    }

    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue(mockErrorResponse)
    }))

    try {
      await invoice({
        config: mockConfig,
        fileSize: 1024,
        retentionPeriod: 60
      })
      fail('Expected an error to be thrown')
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe('Invalid file size')
        expect((error as any).code).toBe('INVALID_SIZE')
      } else {
        fail('Expected an Error to be thrown')
      }
    }
  })

  it('should use default CONFIG if no config is provided', async () => {
    const mockInvoiceResponse = {
      message: 'Invoice created',
      identityKey: 'mockIdentityKey',
      amount: 1000,
      ORDER_ID: 'mockOrderId',
      publicURL: 'https://default.nanostore.com/file',
      status: 'success'
    }

    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue(mockInvoiceResponse)
    }))

    await invoice({
      fileSize: 1024,
      retentionPeriod: 60
    })

    expect(AuthriteClient).toHaveBeenCalledWith(
      CONFIG.nanostoreURL,
      CONFIG.clientPrivateKey
        ? { clientPrivateKey: CONFIG.clientPrivateKey }
        : undefined
    )
  })
  it('should create an invoice with minimum valid inputs', async () => {
    const mockInvoiceResponse = {
      message: 'Invoice created',
      identityKey: 'mockIdentityKey',
      amount: 1,
      ORDER_ID: 'mockOrderId',
      publicURL: 'https://test.nanostore.com/file',
      status: 'success'
    }
    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue(mockInvoiceResponse)
    }))

    const result = await invoice({ fileSize: 1, retentionPeriod: 1 })
    expect(result).toEqual(mockInvoiceResponse)
  })
  it('should create an invoice with maximum allowed inputs', async () => {
    const mockInvoiceResponse = {
      message: 'Invoice created',
      identityKey: 'mockIdentityKey',
      amount: 1000000,
      ORDER_ID: 'mockOrderId',
      publicURL: 'https://test.nanostore.com/file',
      status: 'success'
    }
    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue(mockInvoiceResponse)
    }))

    const result = await invoice({
      fileSize: 1000000000,
      retentionPeriod: 525600
    }) // 1GB, 1 year
    expect(result).toEqual(mockInvoiceResponse)
  })
  it('should throw an error for invalid inputs', async () => {
    await expect(
      invoice({ fileSize: -1, retentionPeriod: 60 })
    ).rejects.toThrow('Invalid file size')
    await expect(
      invoice({ fileSize: 1024, retentionPeriod: -1 })
    ).rejects.toThrow('Invalid retention period')
    await expect(
      invoice({ fileSize: 'invalid' as any, retentionPeriod: 60 })
    ).rejects.toThrow()
    await expect(
      invoice({ fileSize: 1024, retentionPeriod: 'invalid' as any })
    ).rejects.toThrow()
  })

  it('should throw an error with code if the server returns an error status', async () => {
    const mockErrorResponse = {
      status: 'error',
      description: 'Server error',
      code: 'SERVER_ERROR'
    }

    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue(mockErrorResponse)
    }))

    try {
      await invoice({
        config: mockConfig,
        fileSize: 1024,
        retentionPeriod: 60
      })
      fail('Expected an error to be thrown')
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe('Server error')
        expect((error as any).code).toBe('SERVER_ERROR')
      } else {
        fail('Expected an Error to be thrown')
      }
    }
  })

  it('should use custom config when provided', async () => {
    const customConfig = {
      nanostoreURL: 'https://custom.nanostore.com',
      clientPrivateKey: 'customPrivateKey'
    }
    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue({})
    }))

    await invoice({
      config: customConfig,
      fileSize: 1024,
      retentionPeriod: 60
    })
    expect(AuthriteClient).toHaveBeenCalledWith(
      'https://custom.nanostore.com',
      { clientPrivateKey: 'customPrivateKey' }
    )
  })
  it('should handle different error responses correctly', async () => {
    const errorResponses = [
      {
        status: 'error',
        description: 'Invalid file size',
        code: 'INVALID_SIZE'
      },
      {
        status: 'error',
        description: 'Invalid retention period',
        code: 'INVALID_PERIOD'
      },
      { status: 'error', description: 'Server error', code: 'SERVER_ERROR' }
    ]

    for (const errorResponse of errorResponses) {
      (AuthriteClient as jest.Mock).mockImplementation(() => ({
        createSignedRequest: jest.fn().mockResolvedValue(errorResponse)
      }))

      await expect(
        invoice({ fileSize: 1024, retentionPeriod: 60 })
      ).rejects.toThrow(errorResponse.description)

      const thrownError = await invoice({
        fileSize: 1024,
        retentionPeriod: 60
      }).catch(e => e)
      expect(thrownError.code).toBe(errorResponse.code)
    }
  })
  it('should initialize AuthriteClient without clientPrivateKey when not provided', async () => {
    const configWithoutPrivateKey = { ...CONFIG, clientPrivateKey: undefined }
    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue({})
    }))

    await invoice({
      config: configWithoutPrivateKey,
      fileSize: 1024,
      retentionPeriod: 60
    })
    expect(AuthriteClient).toHaveBeenCalledWith(
      configWithoutPrivateKey.nanostoreURL,
      undefined
    )
  })
})
