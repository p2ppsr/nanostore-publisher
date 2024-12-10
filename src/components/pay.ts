import { createAction } from '@babbage/sdk-ts'
import { CONFIG } from './defaults'
import { AuthriteClient } from 'authrite-js'
import { Ninja } from 'ninja-base'
import { derivePaymentInfo } from './derivePaymentInfo'
import {
  PayParams,
  PaymentResponse,
  ExtendedCreateActionParams
} from '../types/pay'
import { ErrorWithCode } from '../utils/errors' // Assuming ErrorWithCode is in utils/errors

/**
 * Validates the response status and throws an appropriate error if the status is 'error'.
 *
 * @param response The response object to validate.
 * @param defaultCode The default error code to use if none is provided in the response.
 * @throws {ErrorWithCode} If the response status is 'error'.
 */
function validateResponseStatus(response: any, defaultCode: string): void {
  if (response.status === 'error') {
    throw new ErrorWithCode(
      response.description || 'Unknown error',
      response.code || defaultCode
    )
  }
}

/**
 * High-level function to automatically pay an invoice, using a Babbage SDK
 * `createAction` call.
 *
 * @param obj All parameters are given in an object.
 * @param obj.config config object, see config section.
 * @param obj.description The description to be used for the payment.
 * @param obj.orderID The hosting invoice reference.
 * @param obj.recipientPublicKey Public key of the host receiving the payment.
 * @param obj.amount The number of satoshis being paid.
 *
 * @returns The pay object, contains the `uploadURL` and the `publicURL` and the `status`'.
 */
export async function pay(
  {
    config = CONFIG,
    description,
    orderID,
    recipientPublicKey,
    amount
  }: PayParams = {} as PayParams
): Promise<PaymentResponse> {
  // Input validation
  if (typeof amount !== 'number' || amount <= 0) {
    throw new ErrorWithCode('Invalid amount', 'ERR_INVALID_AMOUNT')
  }
  if (typeof orderID !== 'string' || orderID.trim() === '') {
    throw new ErrorWithCode('Invalid order ID', 'ERR_INVALID_ORDER_ID')
  }
  if (
    typeof recipientPublicKey !== 'string' ||
    recipientPublicKey.trim() === ''
  ) {
    throw new ErrorWithCode(
      'Invalid recipient public key',
      'ERR_INVALID_PUBLIC_KEY'
    )
  }

  let paymentInfo
  try {
    // Derive payment information
    paymentInfo = await derivePaymentInfo({
      config,
      recipientPublicKey,
      amount
    })
  } catch (e) {
    throw new ErrorWithCode(
      `Failed to derive payment info: ${e}`,
      'ERR_DERIVE_PAYMENT_INFO'
    )
  }

  let payment: unknown
  try {
    if (config.clientPrivateKey) {
      // Create a new transaction with Ninja which pays the output
      const ninja = new Ninja({
        privateKey: config.clientPrivateKey,
        config: {
          dojoURL: config.dojoURL ?? 'https://default-dojo-url.com'
        }
      })
      payment = await ninja.getTransactionWithOutputs({
        outputs: [paymentInfo.output],
        note: 'Payment for file hosting'
      })
    } else {
      payment = await createAction({
        outputs: [paymentInfo.output],
        description,
        labels: ['nanostore'],
        topics: ['UHRP']
      } as ExtendedCreateActionParams)

      // Validate the response
      validateResponseStatus(payment, 'ERR_PAYMENT_ACTION')
    }
  } catch (e) {
    throw new ErrorWithCode(
      `Failed to create payment:${e}`,
      'ERR_CREATE_PAYMENT'
    )
  }

  // Initialize a new AuthriteClient with SDK or private key signing strategy depending on the config
  const client = new AuthriteClient(
    config.nanostoreURL,
    config.clientPrivateKey
      ? { clientPrivateKey: config.clientPrivateKey }
      : undefined
  )

  try {
    // Make the pay request
    const pay = await client.createSignedRequest('/pay', {
      derivationPrefix: paymentInfo.derivationPrefix,
      transaction: payment
        ? {
            ...payment,
            outputs: [
              {
                vout: 0,
                satoshis: amount,
                derivationSuffix: paymentInfo.derivationSuffix
              }
            ]
          }
        : undefined,
      orderID
    })

    // Validate the response
    validateResponseStatus(pay, 'ERR_PAY_ERROR')

    return pay as PaymentResponse
  } catch (e) {
    throw new ErrorWithCode(
      `Failed to complete pay request:${e}`,
      'ERR_PAY_REQUEST'
    )
  }
}
