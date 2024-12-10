import { AuthriteClient } from 'authrite-js'
import { CONFIG } from './defaults'
import { SubmitPaymentParams, PaymentResult } from '../types/submitPayments'
import { ErrorWithCode, NanoStorePublisherError } from '../utils/errors'

/**
 * Validates that a value is a non-empty string.
 *
 * @param {string} value - The value to validate.
 * @param {string} name - The name of the parameter being validated (for error messages).
 * @throws {NanoStorePublisherError} If the value is not a non-empty string.
 */
const validateNonEmptyString = (value: string, name: string): void => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new NanoStorePublisherError(
      `Invalid ${name}. Must be a non-empty string.`,
      `ERR_INVALID_${name.toUpperCase()}`
    )
  }
}

/**
 * Validates the configuration object.
 *
 * @param {object} config - The configuration object to validate.
 * @throws {NanoStorePublisherError} If the configuration is invalid.
 */
const validateConfig = (config: typeof CONFIG): void => {
  validateNonEmptyString(config.nanostoreURL, 'NanoStore URL')
  if (!config.clientPrivateKey || typeof config.clientPrivateKey !== 'string') {
    throw new NanoStorePublisherError(
      'Invalid client private key in config.',
      'ERR_INVALID_CLIENT_PRIVATE_KEY'
    )
  }
}

/**
 * Submit a manually-created payment for NanoStore hosting. Obtain an output
 * that must be included in the transaction by using `derivePaymentInfo`, and
 * then provide the Everett envelope for the transaction here. Also use the
 * `vout` parameter to specify which output in your transaction has paid the
 * invoice.
 *
 * @param {object} obj - All parameters are given in an object.
 * @param {object} obj.config - Config object, see config section.
 * @param {string} obj.orderID - The hosting invoice reference.
 * @param {number} obj.amount - The number of satoshis being paid.
 * @param {object} obj.payment - The result of calling `createAction` which incorporates the payment output for the NanoStore hosting. Object that includes `inputs`, `mapiResponses`, `rawTx`.
 * @param {number} obj.vout - The output from the action which corresponds to the payment for NanoStore hosting.
 * @param {string} obj.derivationPrefix - The value returned from `derivePaymentInfo`.
 * @param {string} obj.derivationSuffix - The value returned from `derivePaymentInfo`.
 * @returns {Promise<PaymentResult>} The `PaymentResult` object, containing the `uploadURL`, `publicURL`, and `status`.
 * @throws {NanoStorePublisherError|ErrorWithCode} If validation or payment submission fails.
 */
export async function submitPayment(
  {
    config = CONFIG,
    orderID,
    amount,
    payment,
    vout,
    derivationPrefix,
    derivationSuffix
  }: SubmitPaymentParams = {} as SubmitPaymentParams
): Promise<PaymentResult> {
  try {
    // Validate inputs
    validateConfig(config)
    if (
      typeof amount !== 'number' ||
      amount <= 0 ||
      !Number.isInteger(amount)
    ) {
      throw new NanoStorePublisherError(
        'Invalid amount. Must be a positive integer.',
        'ERR_INVALID_AMOUNT'
      )
    }
    validateNonEmptyString(orderID, 'order ID')
    if (typeof vout !== 'number' || vout < 0) {
      throw new NanoStorePublisherError(
        'Invalid vout. Must be a non-negative number.',
        'ERR_INVALID_VOUT'
      )
    }
    if (!payment || typeof payment !== 'object' || !payment.rawTx) {
      throw new NanoStorePublisherError(
        'Invalid payment object. Must include rawTx field.',
        'ERR_INVALID_PAYMENT'
      )
    }
    validateNonEmptyString(derivationPrefix, 'derivation prefix')
    validateNonEmptyString(derivationSuffix, 'derivation suffix')

    // Initialize Authrite client
    const client = new AuthriteClient(config.nanostoreURL, {
      clientPrivateKey: config.clientPrivateKey
    })

    // Make the payment request
    const paymentResult = await client.createSignedRequest('/pay', {
      derivationPrefix,
      transaction: {
        ...payment,
        outputs: [
          {
            vout,
            satoshis: amount,
            derivationSuffix
          }
        ]
      },
      orderID
    })

    if (paymentResult.status === 'error') {
      throw new NanoStorePublisherError(
        paymentResult.description || 'Payment failed due to an unknown error.',
        paymentResult.code || 'ERR_PAYMENT_FAILED'
      )
    }

    // Validate response
    if (!paymentResult.uploadURL || !paymentResult.publicURL) {
      throw new NanoStorePublisherError(
        'Payment result is missing required fields.',
        'ERR_INVALID_PAYMENT_RESULT'
      )
    }

    return paymentResult as PaymentResult
  } catch (e) {
    throw new ErrorWithCode(
      `Failed to submit payment for order ${orderID}: ${e instanceof Error ? e.message : e}`,
      'ERR_SUBMIT_PAYMENT'
    )
  }
}
