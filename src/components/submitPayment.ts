import { AuthriteClient } from 'authrite-js'
import { CONFIG } from './defaults'
import { SubmitPaymentParams, PaymentResult } from '../types/submitPayments'
import { ErrorWithCode, NanoStorePublisherError } from '../utils/errors'

/**
 * Submit a manually-created payment for NanoStore hosting. Obtain an output
 * that must be included in the transaction by using `derivePaymentInfo`, and
 * then provide the Everett envelope for the transaction here. Also use the
 * `vout` parameter to specify which output in your transaction has paid the
 * invoice.
 *
 * @param obj All parameters are given in an object.
 * @param obj.config config object, see config section.
 * @param obj.orderID The hosting invoice reference.
 * @param obj.amount The number of satoshis being paid.
 * @param obj.payment The result of calling createAction which incorporates the payment output for the NanoStore hosting. Object that includes `inputs`, `mapiResponses`, `rawTx`.
 * @param obj.vout The output from the Action which corresponds to the payment for NanoStore hosting
 * @param obj.derivationPrefix The value returned from `derivePaymentInfo`
 * @param obj.derivationSuffix The value returned from `derivePaymentInfo`
 *
 * @returns The paymentResult object, contains the `uploadURL` and the `publicURL` and the `status`.
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
  // Input validation
  if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
    throw new NanoStorePublisherError(
      'Invalid amount. Must be a positive integer.',
      'ERR_INVALID_AMOUNT'
    )
  }
  if (typeof orderID !== 'string' || orderID.trim() === '') {
    throw new NanoStorePublisherError(
      'Invalid order ID. Must be a non-empty string.',
      'ERR_INVALID_ORDER_ID'
    )
  }
  if (typeof vout !== 'number' || vout < 0) {
    throw new NanoStorePublisherError(
      'Invalid vout. Must be a non-negative number.',
      'ERR_INVALID_VOUT'
    )
  }
  if (!payment || typeof payment !== 'object') {
    throw new NanoStorePublisherError(
      'Invalid payment object. Must be an object.',
      'ERR_INVALID_PAYMENT'
    )
  }
  if (typeof derivationPrefix !== 'string' || derivationPrefix.trim() === '') {
    throw new NanoStorePublisherError(
      'Invalid derivation prefix. Must be a non-empty string.',
      'ERR_INVALID_DERIVATION_PREFIX'
    )
  }
  if (typeof derivationSuffix !== 'string' || derivationSuffix.trim() === '') {
    throw new NanoStorePublisherError(
      'Invalid derivation suffix. Must be a non-empty string.',
      'ERR_INVALID_DERIVATION_SUFFIX'
    )
  }

  try {
    const client = new AuthriteClient(config.nanostoreURL, {
      clientPrivateKey: config.clientPrivateKey
    })

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

    return paymentResult as PaymentResult
  } catch (e) {
    throw new ErrorWithCode(
      `Failed to submit payment:${e}`,
      'ERR_SUBMIT_PAYMENT'
    )
  }
}
