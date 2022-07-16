const { put, post } = require('axios')
const { getURLForFile } = require('uhrp-url')

let FileReader
if (typeof window !== 'undefined' && window.FileReader) {
  FileReader = window.FileReader
} else {
  FileReader = require('filereader')
}

/**
 * Creates an invoice for a NanoStore file hosting contract.
 *
 * @param {Object} obj All parameters are given in an object.
 * @param {Number} obj.fileSize The size of the file you want to host in bytes.
 * @param {Number} obj.retentionPeriod The whole number of minutes you want the file to be hosted.
 * @param {String} [obj.serverURL=https://nanostore.babbage.systems] The URL of the NanoStore server to contract with. By default, the Babbage NanoStore server is used.
 *
 * @returns {Promise<Object>} The invoice object, containing `referenceNumber` and `outputs`, which is an array of BSV transaction output scripts to use when creating the transaction that you will provide to the `upload` function. Each element in the outputs array contains `outputScript` and `amount` (satoshis). The object also contains `publicURL`, which is the HTTP URL where the file will become available for the duration of the contract once uploaded.
 */
const invoice = async ({
  fileSize,
  retentionPeriod,
  serverURL = 'https://nanostore.babbage.systems'
}) => {
  const { data: invoice } = await post(`${serverURL}/invoice`, {
    fileSize,
    retentionPeriod
  })
  if (
    !invoice ||
    !invoice.referenceNumber ||
    !invoice.publicURL ||
    !Array.isArray(invoice.outputs)
  ) {
    throw new Error(invoice.description || 'Error creating invoice!')
  }
  return invoice
}

/**
 * Uploads a file to NanoStore and pays an invoice, thereby starting the file hosting contract.
 *
 * @param {Object} obj All parameters are given in an object.
 * @param {String} obj.referenceNumber The reference number that was given to you when you called the `invoice` function.
 * @param {String} obj.transactionHex A Bitcoin SV transaction, in hex string format, which includes the outputs specified by the `invoice` function. It must be signed, and if not already broadcasted, it will be sent to miners by the NanoStore server.
 * @param {File} obj.file The file to upload. This is usually obtained by querying for your HTML form's file upload `<input />` tag and referencing `tagElement.files[0]`.
 * @param {String} [obj.serverURL=https://nanostore.babbage.systems] The URL of the NanoStore server to contract with. By default, the Babbage NanoStore server is used.
 * @param {Function} [obj.onUploadProgress] A function called with periodic progress updates as the file uploads
 *
 * @returns {Promise<Object>} The publication object. Fields are `published=true`, `hash` (the UHRP URL of the new file), and `publicURL`, the HTTP URL where the file is published.
 */
const upload = async ({
  referenceNumber,
  transactionHex,
  file,
  inputs,
  mapiResponses,
  proof,
  serverURL = 'https://nanostore.babbage.systems',
  onUploadProgress = () => { }
}) => {
  const data = {
    referenceNumber,
    rawTx: transactionHex
  }
  if (inputs) {
    data.inputs = JSON.stringify(inputs)
  }
  if (mapiResponses) {
    data.mapiResponses = JSON.stringify(mapiResponses)
  }
  if (proof) {
    data.proof = JSON.stringify(proof)
  }

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

  const { data: payResult } = await post(
    `${serverURL}/pay`,
    data
  )

  // This uploads the file and hashes the file at the same time
  const concurrentResult = await Promise.all([
    put(
      payResult.uploadURL,
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
    publicURL: payResult.publicURL,
    hash: concurrentResult[1]
  }
}

module.exports = { invoice, upload }
