/* eslint-disable @typescript-eslint/no-explicit-any */
import { upload, axios } from '../components/upload'
import { getURLForFile } from 'uhrp-url'
import { ErrorWithCode, NanoStorePublisherError } from '../utils/errors'
import { CONFIG } from '../components/defaults'

jest.mock('axios')
jest.mock('uhrp-url')
jest.mock('form-data', () => {
  return jest.fn().mockImplementation(() => {
    return {
      append: jest.fn()
    }
  })
})

describe('upload function', () => {
  const mockFile = new File(['file contents'], 'test.txt', {
    type: 'text/plain'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getURLForFile as jest.Mock).mockResolvedValue('mock-hash')
    ;(axios.put as jest.Mock).mockResolvedValue({})
    ;(axios.post as jest.Mock).mockResolvedValue({ data: 'mock-hash' })
  })

  afterEach(() => {})

  const mockFileData = new Blob(['mock data'], { type: 'text/plain' })
  const mockBuffer = Buffer.from('mock data')
  const mockUploadURL = 'https://example.com/upload'
  const mockPublicURL = 'https://example.com/public'
  const mockServerURL = 'http://localhost'

  it('should throw an error for unsupported file types during hashing', async () => {
    await expect(
      upload({
        config: CONFIG,
        uploadURL: mockUploadURL,
        publicURL: mockPublicURL,
        file: {
          dataAsBuffer: null as unknown as Buffer,
          type: '',
          arrayBuffer: function (): Promise<ArrayBuffer> {
            throw new Error('Function not implemented.')
          }
        }
      })
    ).rejects.toThrow(NanoStorePublisherError)
  })

  it('should throw an error during external upload and hash generation', async () => {
    ;(axios.put as jest.Mock).mockRejectedValue(new Error('Upload failed'))
    await expect(
      upload({
        config: CONFIG,
        uploadURL: mockUploadURL,
        publicURL: mockPublicURL,
        file: mockFileData
      })
    ).rejects.toThrow('File upload failed')
  })

  it('should upload a file to external storage', async () => {
    const result = await upload({
      uploadURL: 'https://example.com/upload',
      publicURL: 'https://example.com/public',
      file: mockFile
    })

    expect(axios.put).toHaveBeenCalledWith(
      'https://example.com/upload',
      expect.any(File),
      expect.objectContaining({
        headers: { 'Content-Type': 'text/plain' }
      })
    )

    expect(result).toEqual({
      published: true,
      publicURL: 'https://example.com/public',
      hash: 'mock-hash',
      status: 'success'
    })
  })

  it('should throw an error for unsupported file types in local uploads', async () => {
    const invalidFile = { dataAsBuffer: 'invalid-type' }

    await expect(
      upload({
        uploadURL: 'http://localhost:3000/upload',
        publicURL: 'http://localhost:3000/public',
        file: invalidFile as any,
        serverURL: 'http://localhost:3000'
      })
    ).rejects.toThrow(NanoStorePublisherError)
  })

  it('should handle concurrent upload and hash generation successfully', async () => {
    const result = await upload({
      uploadURL: 'https://example.com/upload',
      publicURL: 'https://example.com/public',
      file: mockFile
    })

    expect(result).toEqual({
      published: true,
      publicURL: 'https://example.com/public',
      hash: 'mock-hash',
      status: 'success'
    })
  })

  it('should handle failed file uploads', async () => {
    ;(axios.put as jest.Mock).mockRejectedValue(new Error('Upload failed'))

    await expect(
      upload({
        uploadURL: 'https://example.com/upload',
        publicURL: 'https://example.com/public',
        file: mockFile
      })
    ).rejects.toThrow('File upload failed')
  })

  it('should call onUploadProgress during file upload', async () => {
    const mockProgress = jest.fn()

    await upload({
      uploadURL: 'https://example.com/upload',
      publicURL: 'https://example.com/public',
      file: mockFile,
      onUploadProgress: mockProgress
    })

    expect(axios.put).toHaveBeenCalledWith(
      'https://example.com/upload',
      expect.any(File),
      expect.objectContaining({
        onUploadProgress: mockProgress
      })
    )
  })

  it('should handle errors from upload function', async () => {
    ;(axios.put as jest.Mock).mockRejectedValueOnce(
      new ErrorWithCode('Upload error', 'ERR_UPLOAD_FAILED')
    )

    await expect(
      upload({
        uploadURL: 'https://example.com/upload',
        publicURL: 'https://example.com/public',
        file: mockFile
      })
    ).rejects.toThrow('File upload failed')
  })

  it('should handle large file uploads', async () => {
    // Create a large file mock
    const largeFile = new File(
      [new Array(10 * 1024 * 1024).fill('a').join('')], // 10 MB file
      'large-test.txt',
      { type: 'text/plain' }
    )

    // Call the upload function with the large file
    const result = await upload({
      uploadURL: 'https://example.com/upload',
      publicURL: 'https://example.com/public',
      file: largeFile,
      onUploadProgress: jest.fn() // Mock progress handler
    })

    // Verify that the file is uploaded correctly
    expect(axios.put).toHaveBeenCalledWith(
      'https://example.com/upload',
      expect.any(File),
      expect.objectContaining({
        headers: { 'Content-Type': 'text/plain' }
      })
    )

    expect(result).toEqual({
      published: true,
      publicURL: 'https://example.com/public',
      hash: 'mock-hash',
      status: 'success'
    })
  })

  it('should throw an error for unsupported file types during localhost upload', async () => {
    const invalidFile = { dataAsBuffer: 'invalid-data' } // Invalid file type

    await expect(
      upload({
        uploadURL: 'http://localhost:3000/upload',
        publicURL: 'http://localhost:3000/public',
        file: invalidFile as any, // Simulating invalid type
        serverURL: 'http://localhost:3000'
      })
    ).rejects.toThrow(NanoStorePublisherError)

    expect(axios.post).not.toHaveBeenCalled()
  })

  it('should throw an error if required parameters are missing', async () => {
    const file = new File([''], 'placeholder.txt', { type: 'text/plain' }) // Placeholder file
    await expect(
      upload({
        uploadURL: '', // Simulating a missing URL
        publicURL: 'https://example.com/public',
        file
      })
    ).rejects.toThrowError(
      new NanoStorePublisherError(
        'Missing required parameters for upload',
        'ERR_MISSING_PARAMS'
      )
    )
  })

  it('should throw an error for unsupported file types', async () => {
    const invalidFile = null // Simulate an invalid file
    await expect(
      upload({
        uploadURL: 'https://example.com/upload',
        publicURL: 'https://example.com/public',
        file: invalidFile as unknown as File // Force a type mismatch for the test
      })
    ).rejects.toThrowError(
      new NanoStorePublisherError(
        'Unsupported file type for local storage upload',
        'ERR_INVALID_FILE_TYPE'
      )
    )
  })

  // it('should handle FileReader onerror during hashing', async () => {
  //   class MockFileReader {
  //     public onerror:
  //       | ((this: FileReader, ev: ProgressEvent<FileReader>) => any)
  //       | null = null
  //     public readAsArrayBuffer = jest.fn()
  //     public triggerError() {
  //       if (this.onerror) {
  //         const event = new ProgressEvent('error') as ProgressEvent<FileReader>
  //         this.onerror.call(this as unknown as FileReader, event)
  //       }
  //     }
  //   }

  //   const mockFileReader = new MockFileReader()
  //   jest
  //     .spyOn(global as any, 'FileReader')
  //     .mockImplementation(() => mockFileReader)

  //   const promise = upload({
  //     config: CONFIG,
  //     uploadURL: mockUploadURL,
  //     publicURL: mockPublicURL,
  //     file: mockFileData
  //   })

  //   // Simulate the `onerror` event
  //   mockFileReader.triggerError()

  //   await expect(promise).rejects.toThrow('ERR_INVALID_UHRP_URL')
  // })

  // it('should handle local storage upload via localhost', async () => {
  //   const mockFormDataInstance = new (require('form-data'))()

  //   ;(axios.post as jest.Mock).mockResolvedValue({ data: 'mockData' })

  //   const result = await upload({
  //     config: CONFIG,
  //     uploadURL: mockUploadURL,
  //     publicURL: mockPublicURL,
  //     file: mockFileData,
  //     serverURL: mockServerURL
  //   })

  //   expect(mockFormDataInstance.append).toHaveBeenCalledWith(
  //     'file',
  //     mockFileData
  //   )
  //   expect(result).toEqual({
  //     published: true,
  //     publicURL: `${mockServerURL}/data/mockData`,
  //     hash: 'mockData',
  //     status: 'success'
  //   })
  // })

  // //Currently fails due to inability to mock a suitable TS file object for upload function
  // it('should handle local uploads to localhost', async () => {
  //   spyPost = jest.spyOn(axios, 'post').mockResolvedValue({ data: 'mock-hash' })
  //   const result = await upload({
  //     uploadURL: 'http://localhost:3000/upload',
  //     publicURL: 'http://localhost:3000/public',
  //     file: mockFileLocalhost,
  //     serverURL: 'http://localhost:3000'
  //   })

  //   expect(spyPost).toHaveBeenCalledTimes(1)
  //   expect(spyPost).toHaveBeenCalledWith(
  //     'http://localhost:3000/pay',
  //     expect.any(FormData),
  //     { headers: { 'Content-Type': 'multipart/form-data' } }
  //   )

  //   expect(result).toEqual({
  //     published: true,
  //     publicURL: 'http://localhost:3000/public/mock-hash',
  //     hash: 'mock-hash',
  //     status: 'success'
  //   })
  //   spyPost.mockRestore()
  // })

  // it('should call onUploadProgress during the upload process', async () => {
  //   const file = new File(['content'], 'test.txt', { type: 'text/plain' })
  //   const mockProgressCallback = jest.fn()

  //   // Mock axios to simulate a successful upload and trigger onUploadProgress
  //   ;(axios.post as jest.Mock).mockImplementationOnce(
  //     (url, formData, config) => {
  //       // Simulate progress event
  //       config.onUploadProgress({ loaded: 50, total: 100 })
  //       return Promise.resolve({
  //         data: { status: 'success', publicURL: 'https://example.com/public' }
  //       })
  //     }
  //   )

  //   await upload({
  //     uploadURL: 'https://example.com/upload',
  //     publicURL: 'https://example.com/public',
  //     file,
  //     onUploadProgress: mockProgressCallback
  //   })

  //   // Verify the progress callback was called with the correct data
  //   expect(mockProgressCallback).toHaveBeenCalledTimes(1)
  //   expect(mockProgressCallback).toHaveBeenCalledWith({
  //     loaded: 50,
  //     total: 100
  //   })
  // })

  // it('should handle network errors during upload', async () => {
  //   const file = new File(['content'], 'test.txt', { type: 'text/plain' })

  //   // Mock axios to throw a network error
  //   ;(axios.post as jest.Mock).mockRejectedValueOnce(new Error('Network Error'))

  //   await expect(
  //     upload({
  //       uploadURL: 'https://example.com/upload',
  //       publicURL: 'https://example.com/public',
  //       file
  //     })
  //   ).rejects.toThrow('Network Error')

  //   // Ensure axios was called with correct parameters
  //   expect(axios.post).toHaveBeenCalledWith(
  //     'https://example.com/upload',
  //     expect.any(FormData),
  //     expect.objectContaining({
  //       onUploadProgress: expect.any(Function)
  //     })
  //   )
  // })

  // it('should handle errors from the hash generation function', async () => {
  //   // Mock the hash function to throw an error immediately
  //   ;(getURLForFile as jest.Mock).mockImplementation(() => {
  //     throw new ErrorWithCode('Hashing error', 'ERR_HASHING_FAILED')
  //   })

  //   // Call the upload function and verify it throws the expected error
  //   await expect(
  //     upload({
  //       uploadURL: 'https://example.com/upload',
  //       publicURL: 'https://example.com/public',
  //       file: mockFile
  //     })
  //   ).rejects.toThrow('Hashing error')

  //   // Verify the mock function was called
  //   expect(getURLForFile).toHaveBeenCalledTimes(1)
  // }, 5000) // Optional: Increase timeout if needed
})
