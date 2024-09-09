import { upload, UploadParams } from '../upload'
import axios from 'axios'
import { getURLForFile } from 'uhrp-url'
import { Buffer } from 'buffer'

jest.mock('axios')
jest.mock('uhrp-url')

describe('upload function', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    jest.clearAllMocks();
    (getURLForFile as jest.Mock).mockResolvedValue('mock-hash');
    (axios.put as jest.Mock).mockResolvedValue({});
    (axios.post as jest.Mock).mockResolvedValue({ data: 'mock-hash' })
    process.env.NODE_ENV = 'production'
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  it('should upload file to external storage', async () => {
    const mockFile = new Blob(['test content'], { type: 'text/plain' })
    const result = await upload({
      uploadURL: 'https://example.com/upload',
      publicURL: 'https://example.com/public',
      file: mockFile as any
    })

    expect(axios.put).toHaveBeenCalledWith(
      'https://example.com/upload',
      expect.any(Blob),
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

  it('should upload file to local storage', async () => {
    const mockFile = new File([Buffer.from('test content')], 'test.txt', {
      type: 'text/plain'
    })
    const result = await upload({
      uploadURL: 'http://localhost:3000/upload',
      publicURL: 'http://localhost:3000/public',
      file: mockFile,
      serverURL: 'http://localhost:3000'
    })

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:3000/pay',
      expect.objectContaining({ data: expect.any(Object) }),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    )
    expect(result).toEqual({
      published: true,
      publicURL: 'http://localhost:3000/data/mock-hash',
      hash: 'mock-hash',
      status: 'success'
    })
  })

  it('should call onUploadProgress during upload', async () => {
    const mockProgressTracker = jest.fn()
    const mockFile = new Blob(['test content'], { type: 'text/plain' })
    await upload({
      uploadURL: 'https://example.com/upload',
      publicURL: 'https://example.com/public',
      file: mockFile as any,
      onUploadProgress: mockProgressTracker
    })

    expect(axios.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Blob),
      expect.objectContaining({
        onUploadProgress: mockProgressTracker
      })
    )
  })

  it('should handle different file types correctly', async () => {
    const textFile = new Blob(['text content'], { type: 'text/plain' })
    const imageFile = new Blob(['image content'], { type: 'image/png' })

    await upload({
      file: textFile as any,
      uploadURL: 'https://example.com/upload',
      publicURL: 'https://example.com/public'
    })
    expect(axios.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Blob),
      expect.objectContaining({ headers: { 'Content-Type': 'text/plain' } })
    )

    await upload({
      file: imageFile as any,
      uploadURL: 'https://example.com/upload',
      publicURL: 'https://example.com/public'
    })
    expect(axios.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Blob),
      expect.objectContaining({ headers: { 'Content-Type': 'image/png' } })
    )
  })

  it('should handle CustomFile with dataAsBuffer for local upload', async () => {
    const mockAxios = jest
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: 'hash' })
    const buffer = Buffer.from('test data')
    const customFile = new Blob([buffer]) as Blob & { dataAsBuffer?: Buffer }
    customFile.dataAsBuffer = buffer

    await upload({
      uploadURL: 'http://localhost:3000/upload',
      publicURL: 'http://localhost:3000/public',
      file: customFile as any,
      serverURL: 'http://localhost:3000'
    })

    expect(mockAxios).toHaveBeenCalled()
    mockAxios.mockRestore()
  })

  it('should handle errors when server did not publish the file', async () => {
    (axios.put as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    await expect(
      upload({
        uploadURL: 'https://example.com/upload',
        publicURL: 'https://example.com/public',
        file: new Blob(['test content'], { type: 'text/plain' }) as any
      })
    ).rejects.toThrow('Network error')

    const axiosError = {
      response: { data: { description: 'File size must match invoice!' } }
    };
    (axios.put as jest.Mock).mockRejectedValueOnce(axiosError)

    await expect(
      upload({
        uploadURL: 'https://example.com/upload',
        publicURL: 'https://example.com/public',
        file: new Blob(['test content'], { type: 'text/plain' }) as any
      })
    ).rejects.toEqual(axiosError)
  })

  it('should handle errors for local server uploads', async () => {
    (axios.post as jest.Mock).mockRejectedValueOnce(
      new Error('Local server error')
    )

    await expect(
      upload({
        uploadURL: 'http://localhost:3000/upload',
        publicURL: 'http://localhost:3000/public',
        file: new Blob(['test content'], { type: 'text/plain' }) as any,
        serverURL: 'http://localhost:3000'
      })
    ).rejects.toThrow('Local server error')
  })

  it('should throw an error for unsupported file types in local uploads', async () => {
    await expect(
      upload({
        uploadURL: 'http://localhost:3000/upload',
        publicURL: 'http://localhost:3000/public',
        file: {} as any, // Unsupported file type
        serverURL: 'http://localhost:3000'
      })
    ).rejects.toThrow('Unsupported file type for local storage upload')
  })

  it('should handle different file types for local upload', async () => {
    const mockAxios = jest
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: 'hash' })

    // Test Blob
    const blob = new Blob(['test data'], { type: 'application/octet-stream' })
    await upload({
      uploadURL: 'http://localhost:3000/upload',
      publicURL: 'http://localhost:3000/public',
      file: blob,
      serverURL: 'http://localhost:3000'
    })

    // Test Buffer
    const buffer = Buffer.from('test data')
    await upload({
      uploadURL: 'http://localhost:3000/upload',
      publicURL: 'http://localhost:3000/public',
      file: buffer as any,
      serverURL: 'http://localhost:3000'
    })

    // Test File
    const file = new File(['test data'], 'test.txt', { type: 'text/plain' })
    await upload({
      uploadURL: 'http://localhost:3000/upload',
      publicURL: 'http://localhost:3000/public',
      file,
      serverURL: 'http://localhost:3000'
    })

    // Test CustomFile with dataAsBuffer
    await upload({
      uploadURL: 'http://localhost:3000/upload',
      publicURL: 'http://localhost:3000/public',
      file: { dataAsBuffer: buffer } as any,
      serverURL: 'http://localhost:3000'
    })

    expect(mockAxios).toHaveBeenCalledTimes(4)
    mockAxios.mockRestore()
  })

  it('should handle successful concurrent upload', async () => {
    (axios.put as jest.Mock).mockResolvedValue({});
    (getURLForFile as jest.Mock).mockResolvedValue('mock-hash')

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
