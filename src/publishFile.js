const { CONFIG } = require('./defaults')
const invoice = require('./invoice')
const pay = require('./pay')
const upload = require('./upload')

// Example compatible File object for publishing file data from a Buffer
// const fileToUpload = {
//   dataAsBuffer,
//   size: dataAsBuffer.length,
//   type: 'image/png' // use 'mime' if necessary
// }

/**
 * High-level function to automatically pay an invoice, using a Babbage SDK
 * `createAction` call, or a clientPrivateKey when in a server environment.
 *
 * @public
 * @param {Object} obj All parameters are given in an object.
 * @param {Object} obj.config config object, see config section.
 * @param {File | object} obj.file - the File to upload given as File or custom object with the necessary data params (see above spec)
 * @param {number} obj.retentionPeriod - how long the file should be retained
 * @param {function} obj.progressTracker - function to provide updates on upload progress
 *
 * @returns {Promise<Object>} The pay object, contains the `uploadURL` and the `publicURL` and the `status`'.
 */
module.exports = async ({
  config = CONFIG,
  file,
  retentionPeriod,
  progressTracker = () => {}
} = {}) => {
  try {
    // Validate required params
    if (!file) {
      const e = new Error('Choose a file to upload!')
      e.code = 'ERR_UI_FILE_MISSING'
      throw e
    }
    if (!retentionPeriod) {
      const e = new Error('Specify how long to host the file!')
      e.code = 'ERR_UI_HOST_DURATION_MISSING'
      throw e
    }

    // Get a payment invoice for the file to upload
    const invoiceResult = await invoice({
      config,
      fileSize: file.size,
      retentionPeriod
    })

    // Make a payment
    const payResult = await pay({
      config,
      description: 'Upload with NanoStore UI',
      orderID: invoiceResult.ORDER_ID,
      recipientPublicKey: invoiceResult.identityKey,
      amount: invoiceResult.amount
    })

    // Upload the file after payment as completed
    const uploadResult = await upload({
      config: {
        nanostoreURL: config.nanostoreURL
      },
      uploadURL: payResult.uploadURL,
      publicURL: invoiceResult.publicURL,
      file,
      serverURL: config.nanostoreURL,
      onUploadProgress: prog => progressTracker(prog)
    })
    return uploadResult
  } catch (e) {
    console.error(e)
  }
}
