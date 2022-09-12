const bsv = require('babbage-bsv')
const { createAction, getPublicKey } = require('@babbage/sdk')
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
 * @returns {Promise<Object>} The paymentResult object, contains the `uploadURL` and the `publicURL` and the `status`'.
 */
module.exports = async ({
  config = CONFIG,
  orderID,
  amount,
  payment,
  derivationPrefix,
  derivationSuffix
} = {}) => {
  const paymentResult = await createSignedRequest({
    config,
    path: '/pay',
    body: {
      derivationPrefix,
      transaction: {
        ...payment,
        outputs: [{
          vout: 0,
          satoshis: amount,
          derivationSuffix
        }]
      },
      orderID
    }
  })
  if (paymentResult.status === 'error') {
    const e = new Error(paymentResult.description)
    e.code = paymentResult.code
    throw e
  }
  return paymentResult
}
