import { upload } from '../upload';
import axios from 'axios';
import { getURLForFile } from 'uhrp-url';
import { Buffer } from 'buffer';

jest.mock('axios');
jest.mock('uhrp-url');

describe('upload function', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    (getURLForFile as jest.Mock).mockResolvedValue('mock-hash');
    (axios.put as jest.Mock).mockResolvedValue({});
    (axios.post as jest.Mock).mockResolvedValue({ data: 'mock-hash' });
    console.log("[TEST] Setting up mocks...");
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should upload file to external storage', async () => {
    const mockFile = new Blob(['test content'], { type: 'text/plain' });
    const result = await upload({
      uploadURL: 'https://example.com/upload',
      publicURL: 'https://example.com/public',
      file: mockFile
    });

    expect(axios.put).toHaveBeenCalledWith(
      'https://example.com/upload',
      expect.any(Blob),
      expect.objectContaining({
        headers: { 'Content-Type': 'text/plain' }
      })
    );
    expect(result).toEqual({
      published: true,
      publicURL: 'https://example.com/public',
      hash: 'mock-hash',
      status: 'success'
    });
  });

  it('should upload file to local storage', async () => {
    const mockFileContent = Buffer.from('test content');
    const mockFile = new Blob([mockFileContent], { type: 'application/octet-stream' });
    Object.defineProperty(mockFile, 'name', { value: 'test.bin' });

    const result = await upload({
      uploadURL: 'http://localhost:3000/upload',
      publicURL: 'http://localhost:3000/public',
      file: mockFile,
      serverURL: 'http://localhost:3000'
    });

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:3000/pay',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    );
    expect(result).toEqual({
      published: true,
      publicURL: 'http://localhost:3000/data/mock-hash',
      hash: 'mock-hash',
      status: 'success'
    });
  });

  it('should call onUploadProgress during upload', async () => {
    const mockProgressTracker = jest.fn();
    const mockFile = new Blob(['test content'], { type: 'text/plain' });
    await upload({
      uploadURL: 'https://example.com/upload',
      publicURL: 'https://example.com/public',
      file: mockFile,
      onUploadProgress: mockProgressTracker
    });

    expect(axios.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Blob),
      expect.objectContaining({
        onUploadProgress: mockProgressTracker
      })
    );
  });

  it('should handle different file types correctly', async () => {
    const textFile = new Blob(['text content'], { type: 'text/plain' });
    const imageFile = new Blob(['image content'], { type: 'image/png' });

    await upload({ file: textFile, uploadURL: 'https://example.com/upload', publicURL: 'https://example.com/public' });
    expect(axios.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Blob),
      expect.objectContaining({ headers: { 'Content-Type': 'text/plain' } })
    );

    await upload({ file: imageFile, uploadURL: 'https://example.com/upload', publicURL: 'https://example.com/public' });
    expect(axios.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Blob),
      expect.objectContaining({ headers: { 'Content-Type': 'image/png' } })
    );
  });
});
