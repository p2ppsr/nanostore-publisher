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
export async function pay({
  config = CONFIG,
  description,
  orderID,
  recipientPublicKey,
  amount
}: PayParams = {} as PayParams): Promise<PaymentResponse> {
  // Derive payment information
  const paymentInfo = await derivePaymentInfo({
    config,
    recipientPublicKey,
    amount
  })

  let payment: any
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
      // originator?
    } as ExtendedCreateActionParams)

    if (payment.status === 'error') {
      const e: Error & { code?: string } = new Error(payment.description)
      e.code = payment.code
      throw e
    }
  }

  // Initialize a new AuthriteClient with SDK or private key signing strategy depending on the config
  const client = new AuthriteClient(config.nanostoreURL, config.clientPrivateKey ? { clientPrivateKey: config.clientPrivateKey } : undefined)

  // Make the pay request
  const pay = await client.createSignedRequest('/pay', {
    derivationPrefix: paymentInfo.derivationPrefix,
    transaction: {
      ...payment,
      outputs: [{
        vout: 0,
        satoshis: amount,
        derivationSuffix: paymentInfo.derivationSuffix
      }]
    },
    orderID
  })

  if (pay.status === 'error') {
    const e: Error & { code?: string } = new Error(pay.description)
    e.code = pay.code
    throw e
  }
  return pay as PaymentResponse
}
