const { createAction } = require('@babbage/sdk')
const { CONFIG } = require('./defaults')
const { AuthriteClient } = require('authrite-js')
const { Ninja } = require('ninja-base')
const derivePaymentInfo = require('./derivePaymentInfo')

/**
 * High-level function to automatically pay an invoice, using a Babbage SDK
 * `createAction` call.
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
  // Derive payment information
  const paymentInfo = await derivePaymentInfo({
    config,
    recipientPublicKey,
    amount
  })

  let payment
  if (config.clientPrivateKey) {
    // Create a new transaction with Ninja which pays the output
    const ninja = new Ninja({
      privateKey: config.clientPrivateKey,
      config: {
        dojoURL: config.dojoURL
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
    })
    if (payment.status === 'error') {
      const e = new Error(payment.description)
      e.code = payment.code
      throw e
    }
  }

  // Initialize a new AuthriteClient with SDK or private key signing strategy depending on the config
  const client = new AuthriteClient(config.nanostoreURL, (config && config.clientPrivateKey) ? { clientPrivateKey: config.clientPrivateKey } : undefined)

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
    const e = new Error(pay.description)
    e.code = pay.code
    throw e
  }
  return pay
}
