import { upload } from '../components/upload'
import { NanoStorePublisherError } from '../utils/errors'
import axios from 'axios'
import { getURLForFile } from 'uhrp-url'
import FileReader from 'filereader' // Use filereader package for Node.js mocking

jest.mock('axios')
jest.mock('uhrp-url')

// Mock FileReader for Node.js environment
global.FileReader = FileReader

describe('upload function', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getURLForFile as jest.Mock).mockResolvedValue('mock-hash')
    ;(axios.put as jest.Mock).mockResolvedValue({})
    ;(axios.post as jest.Mock).mockResolvedValue({ data: 'mock-hash' })
    process.env.NODE_ENV = 'production'
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  it('should upload a file to external storage', async () => {
    const mockFile = new Blob(['test content'], { type: 'text/plain' })

    // Ensure axios.put is mocked to handle the Blob correctly
    ;(axios.put as jest.Mock).mockResolvedValue({})

    const result = await upload({
      uploadURL: 'https://example.com/upload',
      publicURL: 'https://example.com/public',
      file: mockFile
    })

    expect(axios.put).toHaveBeenCalledWith(
      'https://example.com/upload',
      expect.any(Blob), // Ensure Blob is passed
      expect.objectContaining({
        headers: { 'Content-Type': 'text/plain' } // Ensure Content-Type matches the file type
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
    await expect(
      upload({
        uploadURL: 'http://localhost:3000/upload',
        publicURL: 'http://localhost:3000/public',
        file: {} as any, // Unsupported file type
        serverURL: 'http://localhost:3000'
      })
    ).rejects.toThrow(
      new NanoStorePublisherError(
        'Unsupported file type for local storage upload',
        'ERR_INVALID_FILE_TYPE'
      )
    )
  })

  it('should handle successful concurrent upload', async () => {
    (axios.put as jest.Mock).mockResolvedValue({})
    ;(getURLForFile as jest.Mock).mockResolvedValue('mock-hash')

    const file = new Blob(['test data'], { type: 'text/plain' })

    const result = await upload({
      uploadURL: 'https://example.com/upload',
      publicURL: 'https://example.com/public',
      file
    })

    expect(result).toEqual({
      published: true,
      publicURL: 'https://example.com/public',
      hash: 'mock-hash',
      status: 'success'
    })
  })
})
