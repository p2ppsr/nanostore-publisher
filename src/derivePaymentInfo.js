const bsv = require('babbage-bsv')
const { getPublicKey } = require('@babbage/sdk')
/**
 * Derives an output to pay for the NanoStore file hosting contract.
 *
 * @param {Object} obj All parameters are given in an object.
 * @param {String} obj.recipientPublicKey Public key of the host receiving the payment.
 * @param {Number} obj.amount The number of satoshis being paid.
 *
 * @returns {Promise<Object>} The output object, contains the `script` and the amount of `satoshis`'.
 */
module.exports = async ({
  recipientPublicKey,
  amount
} = {}) => {
  // Create a derivation prefix and suffix to derive the public key
  const derivationPrefix = require('crypto')
    .randomBytes(10)
    .toString('base64')
  const derivationSuffix = require('crypto')
    .randomBytes(10)
    .toString('base64')

  // Derive the public key used for creating the output script
  const derivedPublicKey = await getPublicKey({
    protocolID: [2, '3241645161d8'],
    keyID: `${derivationPrefix} ${derivationSuffix}`,
    counterparty: recipientPublicKey
  })

  // Create an output script that can only be unlocked with the corresponding derived private key
  const script = new bsv.Script(
    bsv.Script.fromAddress(bsv.Address.fromPublicKey(
      bsv.PublicKey.fromString(derivedPublicKey)
    ))
  ).toHex()
  // Return the new output
  const paymentInfo = {
    derivationPrefix,
    derivationSuffix,
    derivedPublicKey,
    output: {
        script,
        satoshis: amount
    }
  }
  return paymentInfo
}
