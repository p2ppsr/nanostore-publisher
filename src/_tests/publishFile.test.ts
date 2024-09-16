/* eslint-disable @typescript-eslint/no-explicit-any */
import { publishFile } from '../components/publishFile'
import { invoice } from '../components/invoice'
import { pay } from '../components/pay'
import { upload } from '../components/upload'
import { CONFIG } from '../components/defaults'

const originalConsoleError = console.error

beforeEach(() => {
  console.error = jest.fn()
})

afterEach(() => {
  console.error = originalConsoleError
})

jest.mock('../components/invoice')
jest.mock('../components/pay')
jest.mock('../components/upload')

describe('publishFile function', () => {
  // Mock the file using the File constructor
  const mockFile = new File([new ArrayBuffer(8)], 'test.txt', {
    type: 'text/plain',
    lastModified: Date.now()
  })

  const mockConfig = {
    ...CONFIG,
    nanostoreURL: 'https://test.nanostore.com'
  }

  const mockInvoiceResult = {
    ORDER_ID: 'mockOrderId',
    identityKey: 'mockIdentityKey',
    amount: 1000,
    publicURL: 'https://test.public.com'
  }

  const mockPayResult = {
    uploadURL: 'https://test.upload.com',
    publicURL: 'https://test.public.com',
    status: 'success'
  }

  const mockUploadResult = {
    hash: 'mockHash',
    publicURL: 'https://test.public.com'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(invoice as jest.Mock).mockResolvedValue(mockInvoiceResult)
    ;(pay as jest.Mock).mockResolvedValue(mockPayResult)
    ;(upload as jest.Mock).mockResolvedValue(mockUploadResult)
  })

  it('should publish a file successfully', async () => {
    const result = await publishFile({
      config: mockConfig,
      file: mockFile,
      retentionPeriod: 60
    })

    expect(result).toEqual({ ...mockUploadResult, status: 'success' })
    expect(invoice).toHaveBeenCalledWith({
      config: mockConfig,
      fileSize: mockFile.size,
      retentionPeriod: 60
    })
    expect(pay).toHaveBeenCalledWith({
      config: mockConfig,
      description: 'Upload with NanoStore UI',
      orderID: mockInvoiceResult.ORDER_ID,
      recipientPublicKey: mockInvoiceResult.identityKey,
      amount: mockInvoiceResult.amount
    })
    expect(upload).toHaveBeenCalledWith({
      config: { nanostoreURL: mockConfig.nanostoreURL },
      uploadURL: mockPayResult.uploadURL,
      publicURL: mockInvoiceResult.publicURL,
      file: mockFile,
      serverURL: mockConfig.nanostoreURL,
      onUploadProgress: expect.any(Function)
    })
  })

  it('should throw an error if file is missing', async () => {
    await expect(
      publishFile({ config: mockConfig, retentionPeriod: 60 } as any)
    ).rejects.toThrow('File is required for upload.')
  })

  it('should throw an error if retentionPeriod is missing', async () => {
    await expect(
      publishFile({ config: mockConfig, file: mockFile } as any)
    ).rejects.toThrow('Retention period must be specified.')
  })

  it('should use default CONFIG if no config is provided', async () => {
    await publishFile({ file: mockFile, retentionPeriod: 60 })
    expect(invoice).toHaveBeenCalledWith(
      expect.objectContaining({ config: CONFIG })
    )
  })

  it('should call progressTracker if provided', async () => {
    const mockProgressTracker = jest.fn()
    await publishFile({
      config: mockConfig,
      file: mockFile,
      retentionPeriod: 60,
      progressTracker: mockProgressTracker
    })

    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        onUploadProgress: mockProgressTracker
      })
    )
  })

  it('should handle errors from the invoice function', async () => {
    (invoice as jest.Mock).mockRejectedValue(new Error('Invoice error'))

    await expect(
      publishFile({
        config: mockConfig,
        file: mockFile,
        retentionPeriod: 60
      })
    ).rejects.toThrow('Failed to publish file: Invoice error')
  })

  it('should handle errors from the pay function', async () => {
    (pay as jest.Mock).mockRejectedValue(new Error('Payment error'))

    await expect(
      publishFile({
        config: mockConfig,
        file: mockFile,
        retentionPeriod: 60
      })
    ).rejects.toThrow('Failed to publish file: Payment error')
  })

  it('should handle errors from the upload function', async () => {
    (upload as jest.Mock).mockRejectedValue(new Error('Upload error'))

    await expect(
      publishFile({
        config: mockConfig,
        file: mockFile,
        retentionPeriod: 60
      })
    ).rejects.toThrow('Failed to publish file: Upload error')
  })
})
