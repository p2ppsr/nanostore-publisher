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

    await expect(
      invoice({
        config: mockConfig,
        fileSize: 1024,
        retentionPeriod: 60
      })
    ).rejects.toMatchObject({
      message: 'Invalid file size',
      code: 'INVALID_SIZE'
    })
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

  it('should create an invoice with valid inputs', async () => {
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

  it('should throw an error for invalid inputs', async () => {
    await expect(
      invoice({ fileSize: -1, retentionPeriod: 60 })
    ).rejects.toThrow('Invalid file size')
    await expect(
      invoice({ fileSize: 1024, retentionPeriod: -1 })
    ).rejects.toThrow('Invalid retention period')
  })

  it('should throw an error with server error response', async () => {
    const mockErrorResponse = {
      status: 'error',
      description: 'Server error',
      code: 'SERVER_ERROR'
    }

    ;(AuthriteClient as jest.Mock).mockImplementation(() => ({
      createSignedRequest: jest.fn().mockResolvedValue(mockErrorResponse)
    }))

    await expect(
      invoice({
        config: mockConfig,
        fileSize: 1024,
        retentionPeriod: 60
      })
    ).rejects.toMatchObject({
      message: 'Server error',
      code: 'SERVER_ERROR'
    })
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
