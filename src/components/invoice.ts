import { AuthriteClient } from 'authrite-js'
import { CONFIG } from './defaults'
import { InvoiceParams, InvoiceResponse } from '../types/invoice'
import { ErrorWithCode } from '../utils/errors'

/**
 * Validates the configuration object.
 *
 * @param config The configuration object to validate.
 * @throws {ErrorWithCode} If the configuration is invalid.
 */
const validateConfig = (config: typeof CONFIG): void => {
  if (!config.nanostoreURL || typeof config.nanostoreURL !== 'string') {
    throw new ErrorWithCode('Invalid NanoStore URL', 'ERR_INVALID_CONFIG')
  }
}

/**
 * Initializes an Authrite client for NanoStore.
 *
 * @param config The configuration object.
 * @returns {AuthriteClient} The initialized Authrite client.
 * @throws {ErrorWithCode} If client initialization fails.
 */
const initializeAuthriteClient = (
  config: typeof CONFIG
): typeof AuthriteClient => {
  try {
    return new AuthriteClient(
      config.nanostoreURL,
      config.clientPrivateKey
        ? { clientPrivateKey: config.clientPrivateKey }
        : undefined
    )
  } catch (e) {
    throw new ErrorWithCode(
      `Failed to initialize Authrite client: ${e instanceof Error ? e.message : e}`,
      'ERR_CLIENT_INITIALIZATION'
    )
  }
}

/**
 * Creates an invoice for a NanoStore file hosting contract.
 *
 * @param obj All parameters are given in an object.
 * @param obj.config config object, see config section.
 * @param obj.fileSize The size of the file you want to host in bytes.
 * @param obj.retentionPeriod The whole number of minutes you want the file to be hosted for.
 * @returns {InvoiceResponse} The invoice object with details for payment and hosting.
 */
export async function invoice(
  {
    config = CONFIG,
    fileSize,
    retentionPeriod
  }: InvoiceParams = {} as InvoiceParams
): Promise<InvoiceResponse> {
  // Input validation
  if (typeof fileSize !== 'number' || fileSize <= 0 || isNaN(fileSize)) {
    throw new ErrorWithCode('Invalid file size', 'ERR_INVALID_FILE_SIZE')
  }
  if (
    typeof retentionPeriod !== 'number' ||
    retentionPeriod <= 0 ||
    isNaN(retentionPeriod)
  ) {
    throw new ErrorWithCode(
      'Invalid retention period',
      'ERR_INVALID_RETENTION_PERIOD'
    )
  }

  // Validate config
  validateConfig(config)

  // Initialize Authrite client
  const client = initializeAuthriteClient(config)

  let invoice: InvoiceResponse
  try {
    // Send a request to get the invoice
    invoice = await client.createSignedRequest('/invoice', {
      fileSize,
      retentionPeriod
    })
  } catch (e) {
    throw new ErrorWithCode(
      `Failed to retrieve invoice: ${e instanceof Error ? e.message : e}`,
      'ERR_INVOICE_REQUEST'
    )
  }

  // Validate invoice response
  if (!invoice || typeof invoice !== 'object') {
    throw new ErrorWithCode(
      'Invalid invoice response format',
      'ERR_INVOICE_RESPONSE_FORMAT'
    )
  }
  if (invoice.status === 'error') {
    throw new ErrorWithCode(
      invoice.description || 'Unknown error in invoice response',
      invoice.code || 'ERR_INVOICE_ERROR'
    )
  }

  return invoice
}
