import { AuthriteClient } from 'authrite-js'
import { CONFIG } from './defaults'
import { Config } from './types/types'

interface InvoiceParams {
  config?: Config
  fileSize: number
  retentionPeriod: number
}

interface InvoiceResponse {
  message: string
  identityKey: string
  amount: number
  ORDER_ID: string
  publicURL: string
  status: string
  description?: string
  code?: string
}

/**
 * Creates an invoice for a NanoStore file hosting contract.
 *
 * @param obj All parameters are given in an object.
 * @param obj.config config object, see config section.
 * @param obj.fileSize The size of the file you want to host in bytes.
 * @param obj.retentionPeriod The whole number of minutes you want the file to be hosted for.
 *
 * @returns The invoice object, containing `message` giving details, `identityKey` recipient's private key, `amount` (satoshis), `ORDER_ID`, for referencing this contract payment and passed to the `upload` function. The object also contains `publicURL`, which is the HTTP URL where the file will become available for the duration of the contract once uploaded and the `status`.
 */
export async function invoice({ config = CONFIG, fileSize, retentionPeriod }: InvoiceParams = {} as InvoiceParams): Promise<InvoiceResponse> {
  // Input validation
  if (typeof fileSize !== 'number' || fileSize <= 0) {
    throw new Error('Invalid file size');
  }
  if (typeof retentionPeriod !== 'number' || retentionPeriod <= 0) {
    throw new Error('Invalid retention period');
  }

  // Initialize a new Authrite client depending on the config
  const client = new AuthriteClient(config.nanostoreURL, config.clientPrivateKey ? { clientPrivateKey: config.clientPrivateKey } : undefined)

  // Send a request to get the invoice
  const invoice = await client.createSignedRequest('/invoice', {
    fileSize,
    retentionPeriod
  })

  // Throw an error if an HTTP error is returned
  if (invoice.status === 'error') {
    const e: Error & { code?: string } = new Error(invoice.description)
    e.code = invoice.code
    throw e
  }
  return invoice as InvoiceResponse
}
