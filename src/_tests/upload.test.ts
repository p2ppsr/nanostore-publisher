/* eslint-disable @typescript-eslint/no-explicit-any */
import { upload, axios } from '../components/upload'
import { getURLForFile } from 'uhrp-url'
import { ErrorWithCode, NanoStorePublisherError } from '../utils/errors'
// import FormData from 'form-data' // Node.js form-data necessary for testing upload with file

jest.mock('axios')
jest.mock('uhrp-url')

/* See comment below
class MockFile {
  constructor(
    public name: string,
    public size: number,
    public type: string,
    public content: Buffer
  ) {}

  arrayBuffer() {
    return Promise.resolve(this.content)
  }
}
*/

describe('upload function', () => {
  // let spyPost: jest.SpyInstance

  /* See comment below
  const mockFileLocalhost = new MockFile(
    'test.txt',
    12,
    'text/plain',
    Buffer.from('test content')
  )
  */
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

  /* Currently fails due to inability to mock a suitable TS file object for upload function
  it('should handle local uploads to localhost', async () => {
    spyPost = jest.spyOn(axios, 'post').mockResolvedValue({ data: 'mock-hash' })
    const result = await upload({
      uploadURL: 'http://localhost:3000/upload',
      publicURL: 'http://localhost:3000/public',
      file: mockFileLocalhost,
      serverURL: 'http://localhost:3000'
    })

    expect(spyPost).toHaveBeenCalledTimes(1)
    expect(spyPost).toHaveBeenCalledWith(
      'http://localhost:3000/pay',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )

    expect(result).toEqual({
      published: true,
      publicURL: 'http://localhost:3000/public/mock-hash',
      hash: 'mock-hash',
      status: 'success'
    })
    spyPost.mockRestore()
  })
  */

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
    (axios.put as jest.Mock).mockRejectedValue(new Error('Upload failed'))

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
    (axios.put as jest.Mock).mockRejectedValueOnce(
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
})
