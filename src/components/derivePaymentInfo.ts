import * as bsv from 'babbage-bsv'
import { getPublicKey } from '@babbage/sdk-ts'
import { CONFIG } from './defaults'
import { getPaymentAddress } from 'sendover'
import { invoice3241645161d8 } from 'ninja-base'
import crypto from 'crypto'
import { PaymentInfo } from '../types/types'
import { DerivePaymentInfoParams } from '../types/derivePaymentInfo'
import { ErrorWithCode } from '../utils/errors' // Assuming ErrorWithCode is in errors.ts

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
  try {
    // Input validation
    if (!recipientPublicKey || typeof recipientPublicKey !== 'string') {
      throw new ErrorWithCode(
        'Invalid recipient public key',
        'ERR_INVALID_PUBLIC_KEY'
      )
    }
    if (typeof amount !== 'number' || amount <= 0) {
      throw new ErrorWithCode('Invalid amount', 'ERR_INVALID_AMOUNT')
    }

    // Create a derivation prefix and suffix to derive the public key
    let derivationPrefix: string
    let derivationSuffix: string
    try {
      derivationPrefix = crypto.randomBytes(10).toString('base64')
      derivationSuffix = crypto.randomBytes(10).toString('base64')
    } catch (cryptoError) {
      throw new ErrorWithCode(
        `Failed to generate random bytes for derivation:${cryptoError}`,
        'ERR_CRYPTO_FAILURE'
      )
    }

    // Derive the public key used for creating the output script
    let derivedPublicKey: string
    try {
      if (config.clientPrivateKey) {
        derivedPublicKey = getPaymentAddress({
          senderPrivateKey: config.clientPrivateKey,
          recipientPublicKey,
          invoiceNumber: invoice3241645161d8(
            derivationPrefix,
            derivationSuffix
          ),
          returnType: 'publicKey'
        })
      } else {
        derivedPublicKey = await getPublicKey({
          protocolID: [2, '3241645161d8'],
          keyID: `${derivationPrefix} ${derivationSuffix}`,
          counterparty: recipientPublicKey
        })
      }
    } catch (deriveError) {
      throw new ErrorWithCode(
        `Failed to derive public key:${deriveError}`,
        'ERR_DERIVE_PUBLIC_KEY'
      )
    }

    // Create an output script that can only be unlocked with the corresponding derived private key
    let script: string
    try {
      script = new bsv.Script(
        bsv.Script.fromAddress(
          bsv.Address.fromPublicKey(bsv.PublicKey.fromString(derivedPublicKey))
        )
      ).toHex()
    } catch (scriptError) {
      throw new ErrorWithCode(
        `Failed to create output script:${scriptError}`,
        'ERR_CREATE_SCRIPT'
      )
    }

    // Return the new output
    return {
      derivationPrefix,
      derivationSuffix,
      derivedPublicKey,
      output: {
        script,
        satoshis: amount,
        basket: 'nanostore',
        description: 'Payment for file hosting'
      }
    } as PaymentInfo
  } catch (e: unknown) {
    // Re-throw caught errors to be handled by the calling function
    if (e instanceof ErrorWithCode) {
      throw e
    } else if (e instanceof Error) {
      // Wrap any other errors in a generic error
      throw new ErrorWithCode(
        e.message || 'Unknown error in derivePaymentInfo',
        'ERR_UNKNOWN'
      )
    } else {
      // Handle cases where `e` is not an instance of `Error`
      throw new ErrorWithCode(
        'An unknown non-error value was thrown in derivePaymentInfo',
        'ERR_UNKNOWN'
      )
    }
  }
}
