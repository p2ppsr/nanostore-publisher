import * as bsv from 'babbage-bsv'
import { getPublicKey, sdk } from '@babbage/sdk-ts'
import { CONFIG } from './defaults'
import { getPaymentAddress } from 'sendover'
import { invoice3241645161d8 } from 'ninja-base'
import crypto from 'crypto'
import { PaymentInfo } from '../types/types'
import { DerivePaymentInfoParams } from '../types/derivePaymentInfo'
import { ErrorWithCode } from '../utils/errors'

/**
 * Generates prefixes and suffixes for payment key derivation.
 *
 * @returns {{ prefix: sdk.Base64String, suffix: sdk.Base64String }} An object containing:
 * - `prefix` - A randomly generated prefix in base64 format.
 * - `suffix` - A randomly generated suffix in base64 format.
 * @throws {ErrorWithCode} If random bytes generation fails.
 */
const generateDerivationPrefixSuffix = (): {
  prefix: sdk.Base64String
  suffix: sdk.Base64String
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
 * @param {sdk.PubKeyHex} recipientPublicKey - The recipient's public key.
 * @param {sdk.Base64String} derivationPrefix - The derivation prefix.
 * @param {sdk.Base64String} derivationSuffix - The derivation suffix.
 * @param {typeof CONFIG} config - The configuration object containing:
 * - `nanostoreURL` - URL of the NanoStore service.
 * - `clientPrivateKey` - The client's private key in hexadecimal format (optional).
 * - `dojoURL` - URL for the Dojo server (optional).
 * @returns {Promise<sdk.PubKeyHex>} The derived public key.
 * @throws {ErrorWithCode} If public key derivation fails.
 */
const derivePublicKey = async (
  recipientPublicKey: sdk.PubKeyHex,
  derivationPrefix: sdk.Base64String,
  derivationSuffix: sdk.Base64String,
  config: typeof CONFIG
): Promise<sdk.PubKeyHex> => {
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
 * @param {sdk.PubKeyHex} derivedPublicKey - The derived public key.
 * @returns {string} The locking script in hexadecimal format.
 * @throws {ErrorWithCode} If the script creation fails.
 */
const createOutputScript = (derivedPublicKey: sdk.PubKeyHex): string => {
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
 * Derives an output to pay for the NanoStore file hosting contract. After
 * payment, use `submitPayment` to complete the payment process and get an
 * upload URL.
 *
 * @param {DerivePaymentInfoParams} obj - Parameters for payment info derivation:
 * - `config` - Configuration object (optional).
 * - `recipientPublicKey` - Public key of the host receiving the payment.
 * - `amount` - The number of satoshis being paid.
 * @returns {Promise<PaymentInfo>} The output object containing:
 * - `derivationPrefix` - Prefix used for key derivation.
 * - `derivationSuffix` - Suffix used for key derivation.
 * - `derivedPublicKey` - The derived public key.
 * - `output` - The output details:
 *   - `script` - The locking script in hexadecimal format.
 *   - `satoshis` - The number of satoshis being sent.
 *   - `basket` - The name of the basket ('nanostore').
 *   - `description` - A description of the payment.
 * @throws {ErrorWithCode} If validation or derivation fails.
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
