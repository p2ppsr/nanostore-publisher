// const { CONFIG } = require('./defaults')
const invoice = require('./invoice')
const pay = require('./pay')
const upload = require('./upload')

const fs = require('fs')
const util = require('util')
const path = require('path')
const mime = require('mime')

const imageName = 'record.png'
const currentDirectory = process.cwd()
const imagePath = path.resolve(currentDirectory, imageName)
const readFileAsync = util.promisify(fs.readFile)

const CONFIG = {
  nanostoreURL: 'https://staging-nanostore.babbage.systems',
  clientPrivateKey: '95219e536fc9c3cb54594996d7e3e343bf503598f7bedced738642b73c63f392',
  dojoURL: 'https://staging-dojo.babbage.systems'
}

/**
 * High-level function to automatically pay an invoice, using a Babbage SDK
 * `createAction` call.
 *
 * @param {Object} obj All parameters are given in an object.
 * @param {Object} obj.config config object, see config section.
 * @param {File} obj.file - the File to upload
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

    debugger
    file = await readFileAsync(imagePath)

    // Figure out if this file is a Buffer or a File type
    let fileSize
    if (!file.size) {
      fileSize = file.length
    } else {
      fileSize = file.size
    }

    // Get a payment invoice for the file to upload
    const invoiceResult = await invoice({
      config,
      fileSize,
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
      file: {
        file,
        type: mime.getType(imageName)
      },
      serverURL: config.nanostoreURL,
      onUploadProgress: prog => progressTracker(prog)
    })
    return uploadResult
  } catch (e) {
    console.error(e)
  }
}
