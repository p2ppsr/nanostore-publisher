import { AuthriteClient } from 'authrite-js'
import { CONFIG } from './defaults'
import { Config } from './types/types'

interface Input {
  // Define the structure of an input
  txid: string
  vout: number
  satoshis: number
  scriptSig: string
}

interface MapiResponse {
  // Define the structure of a mapi response
  payload: string
  signature: string
  publicKey: string
}

interface Payment {
  inputs: Input[]
  mapiResponses: MapiResponse[]
  rawTx: string
}

interface SubmitPaymentParams {
  config?: Config
  orderID: string
  amount: number
  payment: Payment
  vout: number
  derivationPrefix: string
  derivationSuffix: string
}

interface PaymentResult {
  uploadURL: string
  publicURL: string
  status: string
  description?: string
  code?: string
}

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
 * @returns The paymentResult object, contains the `uploadURL` and the `publicURL` and the `status`'.
 */
export async function submitPayment({
  config = CONFIG,
  orderID,
  amount,
  payment,
  vout,
  derivationPrefix,
  derivationSuffix
}: SubmitPaymentParams = {} as SubmitPaymentParams): Promise<PaymentResult> {
  const client = new AuthriteClient(config.nanostoreURL, { clientPrivateKey: config.clientPrivateKey })
  const paymentResult = await client.createSignedRequest('/pay', {
    derivationPrefix,
    transaction: {
      ...payment,
      outputs: [{
        vout,
        satoshis: amount,
        derivationSuffix
      }]
    },
    orderID
  })
  if (paymentResult.status === 'error') {
    const e: Error & { code?: string } = new Error(paymentResult.description)
    e.code = paymentResult.code
    throw e
  }
  return paymentResult as PaymentResult
}
