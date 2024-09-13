import * as bsv from 'babbage-bsv'
import { getPublicKey } from '@babbage/sdk-ts'
import { CONFIG } from './defaults'
import { getPaymentAddress } from 'sendover'
import { invoice3241645161d8 } from 'ninja-base'
import crypto from 'crypto'
import { Config, PaymentInfo } from './types/types'

interface DerivePaymentInfoParams {
  config?: Config
  recipientPublicKey: string
  amount: number
}

/**
 * Derives an output to pay for the NanoStore file hosting contract. After
 * payment, use `submitPayment` to complete the payment process and get an
 * upload URL.
 *
 * @param obj All parameters are given in an object.
 * @param obj.recipientPublicKey Public key of the host receiving the payment.
 * @param obj.amount The number of satoshis being paid.
 *
 * @returns The output object, contains the `script` and the amount of `satoshis`'.
 */
export async function derivePaymentInfo(
  {
    config = CONFIG,
    recipientPublicKey,
    amount
  }: DerivePaymentInfoParams = {} as DerivePaymentInfoParams
): Promise<PaymentInfo> {
  if (!recipientPublicKey || typeof recipientPublicKey !== 'string') {
    throw new Error('Invalid recipient public key')
  }
  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error('Invalid amount')
  }

  // Create a derivation prefix and suffix to derive the public key
  const derivationPrefix = crypto.randomBytes(10).toString('base64')
  const derivationSuffix = crypto.randomBytes(10).toString('base64')

  // Derive the public key used for creating the output script using a privateKey or the SDK
  let derivedPublicKey: string
  if (config.clientPrivateKey) {
    derivedPublicKey = getPaymentAddress({
      senderPrivateKey: config.clientPrivateKey,
      recipientPublicKey,
      invoiceNumber: invoice3241645161d8(derivationPrefix, derivationSuffix),
      returnType: 'publicKey'
    })
  } else {
    derivedPublicKey = await getPublicKey({
      protocolID: [2, '3241645161d8'],
      keyID: `${derivationPrefix} ${derivationSuffix}`,
      counterparty: recipientPublicKey
    })
  }

  // Create an output script that can only be unlocked with the corresponding derived private key
  const script = new bsv.Script(
    bsv.Script.fromAddress(
      bsv.Address.fromPublicKey(bsv.PublicKey.fromString(derivedPublicKey))
    )
  ).toHex()

  // Return the new output
  const paymentInfo: PaymentInfo = {
    derivationPrefix,
    derivationSuffix,
    derivedPublicKey,
    output: {
      script,
      satoshis: amount,
      basket: 'nanostore',
      description: 'Payment for file hosting'
    }
  }
  return paymentInfo
}
