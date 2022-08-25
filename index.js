'use strict'
const { put, post } = require('axios')
const { getURLForFile } = require('uhrp-url')
const invoice = require('./invoice')
const pay = require('./pay')
const { CONFIG } = require('./defaults')

let FileReader
if (typeof window !== 'undefined' && window.FileReader) {
  FileReader = window.FileReader
} else {
  FileReader = require('filereader')
}

/**
 * Creates an invoice for a NanoStore file hosting contract.
 *
 * @param {Object} [obj] All parameters are given in an object.
 * @param {Object} [obj.config] config object, see config section.
 * @param {Number} [obj.fileSize] The size of the file you want to host in bytes.
 * @param {Number} [obj.retentionPeriod] The whole number of minutes you want the file to be hosted for.
 *
 * @returns {Promise<Object>} The invoice object, containing `paymail` address for payment to be sent to, `amount` (satoshis), `ORDER_ID`, for referencing this contract payment and passed to the `upload` function. The object also contains `publicURL`, which is the HTTP URL where the file will become available for the duration of the contract once uploaded.
 */
const config = CONFIG

async e => {
  e.preventDefault()
  try {
    const invoiceResult = await invoice({
      config,
      fileSize,
      retentionPeriod
    })
    console.log('invoiceResult:', invoiceResult)
    return invoiceResult
  } catch (e) {
    if (invoiceResult.status === 'success') {
      if (!invoiceResult.paymail) {
        throw e
      }
      if (!invoiceResult.amount) {
        throw e
      }
      if (!invoiceResult.ORDER_ID) {
        throw e
      }
      if (!invoiceResult.publicURL) {
        throw e
      }
      return invoiceResult
    } else {
      let e = new Error('Invoice creation has failed.')
      e.code = 'ERR_INVOICE_CREATION_FAILED'
      throw e
    }
  }
}

/**
 * Payment for the NanoStore file hosting contract.
 *
 * @param {Object} [obj] All parameters are given in an object.
 * @param {Object} [obj.config] config object, see config section.
 * @param {String} [obj.sender] The sender paymail making the payment.
 * @param {String} [obj.recipient] The recipient paymail receiving the payment.
 * @param {Number} [obj.amount] The number of satoshis being paid.
 * @param {String} [obj.description] The description to be used for the payment.
 * @param {String} [obj.orderID] The reference for the payment.
 *
 * @returns {Promise<Object>} The pay object, containing `txids` array of BSV transaction ids, `note` containing the user's Paymail and thanking them, `reference` to the payment (normally the `ORDER_ID`) and the `status'.
 */

async e => {
  e.preventDefault()
  try {
    const payResult = await pay({
      config,
      sender,
      recipient,
      amount,
      description,
      orderID
    })
    console.log('payResult:', payResult)
    return payResult
  } catch (e) {
    if (payResult.status === 'success') {
      if (!payResult.uploadURL) {
        throw e
      }
      if (!payResult.publicURL) {
        throw e
      }
      return payResult
    } else {
      let e = new Error('Paying invoice has failed.')
      e.code = 'ERR_PAY_INVOICE_FAILED'
      throw e
    }
  }
}

/**
 * Uploads a file to NanoStore and pays an invoice, thereby starting the file hosting contract.
 *
 * @param {Object} [obj] All parameters are given in an object.
 * @param {String} [obj.uploadURL] the external URL where the file is uploaded to
 * @param {File} [obj.file] The file to upload. This is usually obtained by querying for your HTML form's file upload `<input />` tag and referencing `tagElement.files[0]`.
 * @param {String} [obj.serverURL=https://nanostore.babbage.systems] The URL of the NanoStore server to contract with. By default, the Babbage NanoStore server is used.
 * @param {Function} [obj.onUploadProgress] A function called with periodic progress updates as the file uploads
 *
 * @returns {Promise<Object>} The publication object. Fields are `published=true`, `hash` (the UHRP URL of the new file), and `publicURL`, the HTTP URL where the file is published.
 */

const upload = async ({
  uploadURL,
  publicURL,
  file,
  serverURL = `${config.nanostoreURL}`,
  onUploadProgress = () => { }
}) => {
  console.log('serverURL:', serverURL)
  console.log('publicURL:', publicURL)
  console.log('uploadURL:', uploadURL)
  // Allow uploads with MiniScribe
  if (serverURL.startsWith('http://localhost')) {
    const FormData = require('form-data')
    const formData = new FormData()
    formData.append('file', file)
    const res = await post(`${serverURL}/pay`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return {
      published: true,
      publicURL: `${serverURL}/data/${res.data}`,
      hash: res.data
    }
  }

  // This uploads the file and hashes the file at the same time
  const concurrentResult = await Promise.all([
    put(
      uploadURL,
      file,
      { headers: { 'Content-Type': file.type }, onUploadProgress }
    ),
    new Promise((resolve, reject) => {
      try {
        const fr = new FileReader()
        fr.addEventListener('load', () => {
          resolve(getURLForFile(Buffer.from(fr.result)))
        })
        fr.readAsArrayBuffer(file)
      } catch (e) {
        reject(e)
      }
    })
  ])

  return {
    published: true,
    publicURL: publicURL,
    hash: concurrentResult[1]
  }
}

module.exports = { invoice, pay, upload }
