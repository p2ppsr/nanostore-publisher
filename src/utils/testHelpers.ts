import PacketPay from '@packetpay/js'
import * as pushdrop from 'pushdrop'
import { isValidURL, getHashFromURL, getURLForHash } from 'uhrp-url'
import crypto from 'crypto'

jest.mock('crypto')

export const mockHash = Buffer.from(
  '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81',
  'hex'
)

export const mockOutputScript =
  '4104ca0a8ce950bf2bc85115bd68818455ae2f187efc96c7527dfad98b69531ae65d13cff3e6f07263dcc64c8ccfd03884983a896b0c5887f2ec5bfd7ad739b76119ac'

export const mockUHRPUrl = 'uhrp://example.com/path'

export const mockResolvedUrl =
  'https://staging-nanostore.babbage.systems/cdn/MGYzaYCwSUKvYpBDXuTgLM'

export function setupMocks() {
  jest.clearAllMocks()
  ;(isValidURL as jest.Mock).mockReturnValue(true)
  ;(getHashFromURL as jest.Mock).mockReturnValue(mockHash)
  ;(getURLForHash as jest.Mock).mockReturnValue(mockUHRPUrl)
  ;(PacketPay as jest.Mock).mockResolvedValue({
    body: Buffer.from(JSON.stringify([{ outputScript: mockOutputScript }]))
  })
  ;(pushdrop.decode as jest.Mock).mockReturnValue({
    fields: [
      Buffer.from('field1'),
      Buffer.from('field2'),
      Buffer.from('field3'),
      Buffer.from('field4'),
      Buffer.from(mockResolvedUrl)
    ]
  })

  const mockCreateHash = jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue(mockHash.toString('hex'))
  })
  ;(crypto.createHash as jest.Mock) = mockCreateHash
}

export function mockFetch(status = 200, contentType = 'application/json') {
  return jest.fn().mockResolvedValue({
    status,
    arrayBuffer: () => new ArrayBuffer(3),
    headers: {
      get: () => contentType
    }
  })
}
