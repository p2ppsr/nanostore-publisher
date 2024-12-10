import * as bsv from 'babbage-bsv'
import { getPublicKey } from '@babbage/sdk-ts'
import { CONFIG } from './defaults'
import { getPaymentAddress } from 'sendover'
import { invoice3241645161d8 } from 'ninja-base'
import crypto from 'crypto'
import { PaymentInfo } from '../types/types'
import { DerivePaymentInfoParams } from '../types/derivePaymentInfo'
import { ErrorWithCode } from '../utils/errors'

/**
 * Derives prefixes and suffixes for payment key derivation.
 *
 * @returns {Object} An object containing the derivation prefix and suffix.
 * @throws {ErrorWithCode} If random bytes generation fails.
 */
const generateDerivationPrefixSuffix = (): {
  prefix: string
  suffix: string
} => {
  try {
    return {
      prefix: crypto.randomBytes(10).toString('base64'),
      suffix: crypto.randomBytes(10).toString('base64')
    }
  } catch (error) {
    throw new ErrorWithCode(
      `Failed to generate random bytes: ${error}`,
      'ERR_CRYPTO_FAILURE'
    )
  }
}

/**
 * Derives the public key used for payment.
 *
 * @param recipientPublicKey The recipient's public key.
 * @param derivationPrefix The derivation prefix.
 * @param derivationSuffix The derivation suffix.
 * @param config The configuration object.
 * @returns {string} The derived public key.
 * @throws {ErrorWithCode} If public key derivation fails.
 */
const derivePublicKey = async (
  recipientPublicKey: string,
  derivationPrefix: string,
  derivationSuffix: string,
  config: typeof CONFIG
): Promise<string> => {
  try {
    if (config.clientPrivateKey) {
      return getPaymentAddress({
        senderPrivateKey: config.clientPrivateKey,
        recipientPublicKey,
        invoiceNumber: invoice3241645161d8(derivationPrefix, derivationSuffix),
        returnType: 'publicKey'
      })
    } else {
      return await getPublicKey({
        protocolID: [2, '3241645161d8'],
        keyID: `${derivationPrefix} ${derivationSuffix}`,
        counterparty: recipientPublicKey
      })
    }
  } catch (error) {
    throw new ErrorWithCode(
      `Failed to derive public key: ${error}`,
      'ERR_DERIVE_PUBLIC_KEY'
    )
  }
}

/**
 * Creates a locking script for the derived public key.
 *
 * @param derivedPublicKey The derived public key.
 * @returns {string} The locking script in hexadecimal format.
 * @throws {ErrorWithCode} If the script creation fails.
 */
const createOutputScript = (derivedPublicKey: string): string => {
  try {
    return new bsv.Script(
      bsv.Script.fromAddress(
        bsv.Address.fromPublicKey(bsv.PublicKey.fromString(derivedPublicKey))
      )
    ).toHex()
  } catch (error) {
    throw new ErrorWithCode(
      `Failed to create output script: ${error}`,
      'ERR_CREATE_SCRIPT'
    )
  }
}

/**
 * Derives an output to pay for the NanoStore file hosting contract.
 *
 * @param obj All parameters are given in an object.
 * @param obj.recipientPublicKey Public key of the host receiving the payment.
 * @param obj.amount The number of satoshis being paid.
 * @returns {PaymentInfo} The output object with the derived script and metadata.
 */
export async function derivePaymentInfo(
  {
    config = CONFIG,
    recipientPublicKey,
    amount
  }: DerivePaymentInfoParams = {} as DerivePaymentInfoParams
): Promise<PaymentInfo> {
  if (!recipientPublicKey || typeof recipientPublicKey !== 'string') {
    throw new ErrorWithCode(
      'Invalid recipient public key',
      'ERR_INVALID_PUBLIC_KEY'
    )
  }
  if (typeof amount !== 'number' || amount <= 0) {
    throw new ErrorWithCode('Invalid amount', 'ERR_INVALID_AMOUNT')
  }

  const { prefix: derivationPrefix, suffix: derivationSuffix } =
    generateDerivationPrefixSuffix()
  const derivedPublicKey = await derivePublicKey(
    recipientPublicKey,
    derivationPrefix,
    derivationSuffix,
    config
  )
  const script = createOutputScript(derivedPublicKey)

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
  }
}
