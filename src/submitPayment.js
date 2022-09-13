const createSignedRequest = require('./utils/createSignedRequest')
const { CONFIG } = require('./defaults')

/**
 * Submit a manually-created payment for NanoStore hosting
 *
 * @param {Object} obj All parameters are given in an object.
 * @param {Object} obj.config config object, see config section.
 * @param {String} obj.orderID The hosting invoice reference.
 * @param {Number} obj.amount The number of satoshis being paid.
 * @param {Object} obj.payment The result of calling createAction which incorporates the payment output for the NanoStore hosting. Object that includes `inputs`, `mapiResponses`, `rawTx`.
 * @param {Number} obj.vout The output from the Action which corresponds to the payment for NanoStore hosting
 * @param {String} obj.derivationPrefix The value returned from `derivePaymentInfo`
 * @param {String} obj.derivationSuffix The value returned from `derivePaymentInfo`
 *
 * @returns {Promise<Object>} The paymentResult object, contains the `uploadURL` and the `publicURL` and the `status`'.
 */
module.exports = async ({
  config = CONFIG,
  orderID,
  amount,
  payment,
  vout,
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
          vout,
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
