import { AuthriteClient } from 'authrite-js'
import { CONFIG } from './defaults'
import { InvoiceParams, InvoiceResponse } from '../types/invoice'
import { ErrorWithCode } from '../utils/errors' // Assuming ErrorWithCode is in utils/errors

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
export async function invoice(
  {
    config = CONFIG,
    fileSize,
    retentionPeriod
  }: InvoiceParams = {} as InvoiceParams
): Promise<InvoiceResponse> {
  // Input validation
  if (typeof fileSize !== 'number' || fileSize <= 0) {
    throw new ErrorWithCode('Invalid file size', 'ERR_INVALID_FILE_SIZE')
  }
  if (typeof retentionPeriod !== 'number' || retentionPeriod <= 0) {
    throw new ErrorWithCode(
      'Invalid retention period',
      'ERR_INVALID_RETENTION_PERIOD'
    )
  }

  let client: typeof AuthriteClient
  try {
    // Initialize a new Authrite client depending on the config
    client = new AuthriteClient(
      config.nanostoreURL,
      config.clientPrivateKey
        ? { clientPrivateKey: config.clientPrivateKey }
        : undefined
    )
  } catch (e) {
    throw new ErrorWithCode(
      `Failed to initialize Authrite client:${e}`,
      'ERR_CLIENT_INITIALIZATION'
    )
  }

  let invoice
  try {
    // Send a request to get the invoice
    invoice = await client.createSignedRequest('/invoice', {
      fileSize,
      retentionPeriod
    })
  } catch (e) {
    throw new ErrorWithCode(
      `Failed to retrieve invoice:${e}`,
      'ERR_INVOICE_REQUEST'
    )
  }

  // Throw an error if an HTTP error is returned
  if (invoice.status === 'error') {
    throw new ErrorWithCode(
      invoice.description || 'Unknown error',
      invoice.code || 'ERR_INVOICE_ERROR'
    )
  }

  return invoice as InvoiceResponse
}
