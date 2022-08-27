/* eslint-env jest */
const { invoice, upload } = require('./index')
const { post } = require('axios')
const Window = require('window')
const wind = new Window()

jest.mock('axios')

describe('nanostore-publisher', () => {
  beforeEach(() => {
    post.mockImplementation(url => {
      if (url.endsWith('/invoice')) {
        return {
          data: {
            referenceNumber: 'MOCK_REF',
            publicURL: 'MOCK_PUB_URL',
            outputs: [{
              outputScript: 'MOCK_OUT_SCRIPT',
              amount: 3301
            }]
          }
        }
      } else if (url.endsWith('/upload')) {
        return {
          data: {
            publicURL: 'MOCK_PUB_URL',
            hash: 'MOCK_HASH',
            published: true
          }
        }
      }
    })
  })
  afterEach(() => {
    jest.clearAllMocks()
  })
  describe('invoice', () => {
    it('Calls axios.post with the provided fields', async () => {
      await invoice({
        fileSize: 10000,
        retentionPeriod: 2000
      })
      expect(post).toHaveBeenLastCalledWith(
        'https://nanostore.babbage.systems/invoice',
        { retentionPeriod: 2000, fileSize: 10000 }
      )
    })
    it('Calls axios.post with a custom URL', async () => {
      await invoice({
        fileSize: 10000,
        retentionPeriod: 2000,
        serverURL: 'https://foobar.com'
      })
      expect(post).toHaveBeenLastCalledWith(
        'https://foobar.com/invoice',
        expect.anything()
      )
    })
    it('Throws Error if server did not provide required fields', async () => {
      post.mockReturnValueOnce({ data: {} })
      await expect(() => invoice({
        fileSize: 10000,
        retentionPeriod: 2000
      })).rejects.toThrow(new Error('Error creating invoice!'))
      post.mockReturnValueOnce({
        data: { description: 'File size must be an integer!' }
      })
      await expect(() => invoice({
        fileSize: 10000,
        retentionPeriod: 2000
      })).rejects.toThrow(new Error('File size must be an integer!'))
    })
    it('Returns the correct fields from the server', async () => {
      const returnValue = await invoice({
        fileSize: 10000,
        retentionPeriod: 2000
      })
      expect(returnValue).toEqual({
        referenceNumber: 'MOCK_REF',
        publicURL: 'MOCK_PUB_URL',
        outputs: [{
          outputScript: 'MOCK_OUT_SCRIPT',
          amount: 3301
        }]
      })
    })
  })
  describe('upload', () => {
    it('Calls axios.post with the provided fields', async () => {
      await upload({
        referenceNumber: 'MOCK_REF',
        transactionHex: 'MOCK_TX_HEX',
        file: new wind.File(Buffer.from('hello'), 'foo.png')
      })
      // We are trusting the FormData to be correct instead of testing.
      // In te future, we should test this instead of trusting it.
      expect(post).toHaveBeenLastCalledWith(
        'https://nanostore.babbage.systems/upload',
        expect.anything(),
        { headers: { 'content-type': 'multipart/form-data' } }
      )
    })
    it('Calls axios.post with a custom URL', async () => {
      await upload({
        referenceNumber: 'MOCK_REF',
        transactionHex: 'MOCK_TX_HEX',
        file: new wind.File(Buffer.from('hello'), 'foo.png'),
        serverURL: 'https://custom.url'
      })
      expect(post).toHaveBeenLastCalledWith(
        'https://custom.url/upload',
        expect.anything(),
        expect.anything()
      )
    })
    it('Throws Error if server did not publish the file', async () => {
      post.mockReturnValueOnce({ data: {} })
      await expect(() => upload({
        referenceNumber: 'MOCK_REF',
        transactionHex: 'MOCK_TX_HEX',
        file: new wind.File(Buffer.from('hello'), 'foo.png'),
        serverURL: 'https://custom.url'
      })).rejects.toThrow(new Error('The file failed to upload!'))
      post.mockReturnValueOnce({
        data: { description: 'File size must match invoice!' }
      })
      await expect(() => upload({
        referenceNumber: 'MOCK_REF',
        transactionHex: 'MOCK_TX_HEX',
        file: new wind.File(Buffer.from('hello'), 'foo.png'),
        serverURL: 'https://custom.url'
      })).rejects.toThrow(new Error('File size must match invoice!'))
    })
    it('Returns the correct fields from the server', async () => {
      const returnValue = await upload({
        referenceNumber: 'MOCK_REF',
        transactionHex: 'MOCK_TX_HEX',
        file: new wind.File(Buffer.from('hello'), 'foo.png'),
        serverURL: 'https://custom.url'
      })
      expect(returnValue).toEqual({
        publicURL: 'MOCK_PUB_URL',
        hash: 'MOCK_HASH',
        published: true
      })
    })
  })
})
