import { createAction, CreateActionParams } from '@babbage/sdk-ts'
import { CONFIG } from './defaults'
import { AuthriteClient } from 'authrite-js'
import { Ninja } from 'ninja-base'
import { derivePaymentInfo } from './derivePaymentInfo'
import { Config } from './types/types'

// Extend the CreateActionParams type
interface ExtendedCreateActionParams extends CreateActionParams {
  topics?: string[];
}

interface PayParams {
  config?: Config;
  description: string;
  orderID: string;
  recipientPublicKey: string;
  amount: number;
}

interface PaymentResponse {
  uploadURL: string;
  publicURL: string;
  status: string;
  description?: string;
  code?: string;
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
    throw new Error('Invalid amount')
  }
  if (typeof orderID !== 'string' || orderID.trim() === '') {
    throw new Error('Invalid order ID')
  }
  if (
    typeof recipientPublicKey !== 'string' ||
    recipientPublicKey.trim() === ''
  ) {
    throw new Error('Invalid recipient public key')
  }

  // Derive payment information
  const paymentInfo = await derivePaymentInfo({
    config,
    recipientPublicKey,
    amount
  })
  let payment: unknown
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
    if (
      typeof payment === 'object' &&
      payment !== null &&
      'status' in payment
    ) {
      if (payment.status === 'error') {
        const errorPayment = payment as {
          status: string;
          description?: string;
          code?: string;
        }
        const e: Error & { code?: string } = new Error(
          errorPayment.description || 'Unknown error'
        )
        if (errorPayment.code) {
          e.code = errorPayment.code
        }
        throw e
      }
    }
  }

  // Initialize a new AuthriteClient with SDK or private key signing strategy depending on the config
  const client = new AuthriteClient(
    config.nanostoreURL,
    config.clientPrivateKey
      ? { clientPrivateKey: config.clientPrivateKey }
      : undefined
  )

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

  if (pay.status === 'error') {
    const e: Error & { code?: string } = new Error(pay.description)
    e.code = pay.code
    throw e
  }
  return pay as PaymentResponse
}
