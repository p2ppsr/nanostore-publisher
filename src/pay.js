const bsv = require('bsv')
const Babbage = require('@babbage/sdk')
const { createAction } = require('@babbage/sdk')
const createSignedRequest = require('./utils/createSignedRequest')
const { CONFIG } = require('./defaults')

/**
 * Payment for the NanoStore file hosting contract.
 *
 * @param {Object} obj All parameters are given in an object.
 * @param {Object} obj.config config object, see config section.
 * @param {String} obj.description The description to be used for the payment.
 * @param {String} obj.orderID The hosting invoice reference.
 * @param {String} obj.recipientPublicKey Public key of the host receiving the payment.
 * @param {Number} obj.amount The number of satoshis being paid.
 *
 * @returns {Promise<Object>} The pay object, contains the `uploadURL` and the `publicURL` and the `status`'.
 */
module.exports = async ({
  config = CONFIG,
  description,
  orderID,
  recipientPublicKey,
  amount
} = {}) => {
  // Pay the host for storing the file, this return the txid.
  const derivationPrefix = require('crypto')
    .randomBytes(10)
    .toString('base64')
  const derivationSuffix = require('crypto')
    .randomBytes(10)
    .toString('base64')

  // Derive the public key used for creating the output script
  const derivedPublicKey = await Babbage.getPublicKey({
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
  const payment = await createAction({
    description,
    outputs: [{
      script,
      satoshis: amount
    }]
  })
  if (payment.status === 'error') {
    const e = new Error(payment.description)
    e.code = payment.code
    throw e
  }
  // console.log('payment:', payment)
  const pay = await createSignedRequest({
    config,
    path: '/pay',
    body: {
      orderID,
      transaction: {
        ...payment,
        outputs: [{
          vout: 0,
          satoshis: amount,
          derivationPrefix,
          derivationSuffix
        }]
      },
      description
    }
  })
  // console.log('pay:', pay)
  if (pay.status === 'error') {
    const e = new Error(pay.description)
    e.code = pay.code
    throw e
  }
  return pay
}
