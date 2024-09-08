import { upload } from '../upload';
import axios from 'axios';
import { getURLForFile } from 'uhrp-url';

jest.mock('axios');
jest.mock('uhrp-url');

describe('upload function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Calls axios.put with the provided fields', async () => {
    const mockFile = new Blob(['test content'], { type: 'text/plain' });
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

  // Add more test cases here
});
