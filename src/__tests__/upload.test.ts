import { upload } from '../upload';
import axios from 'axios';
import { getURLForFile } from 'uhrp-url';
import { Buffer } from 'buffer';

jest.mock('axios');
jest.mock('uhrp-url');

global.FormData = require('form-data');

describe('upload function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Calls axios.put with the provided fields', async () => {
    const mockFile = new Blob(['test content'], { type: 'text/plain' });
    (axios.put as jest.Mock).mockResolvedValue({});
    (getURLForFile as jest.Mock).mockResolvedValue('mock-hash');
    await upload({
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
  });

  it('Handles local server upload correctly', async () => {
    const mockFile = Buffer.from('test content');
    (axios.post as jest.Mock).mockResolvedValue({ data: 'mock-hash' });
    const result = await upload({
      uploadURL: 'http://localhost:3000/upload',
      publicURL: 'http://localhost:3000/public',
      file: { dataAsBuffer: mockFile, type: 'application/octet-stream' },
      serverURL: 'http://localhost:3000'
    });
    expect(result).toEqual({
      published: true,
      publicURL: 'http://localhost:3000/data/mock-hash',
      hash: 'mock-hash',
      status: 'success'
    });
  });

  it('Calls onUploadProgress during upload', async () => {
    const mockProgressTracker = jest.fn();
    const mockFile = new Blob(['test content'], { type: 'text/plain' });
    (axios.put as jest.Mock).mockResolvedValue({});
    (getURLForFile as jest.Mock).mockResolvedValue('mock-hash');
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

  it('Handles different file types correctly', async () => {
    const textFile = new Blob(['text content'], { type: 'text/plain' });
    const imageFile = new Blob(['image content'], { type: 'image/png' });
    (axios.put as jest.Mock).mockResolvedValue({});
    (getURLForFile as jest.Mock).mockResolvedValue('mock-hash');
    
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