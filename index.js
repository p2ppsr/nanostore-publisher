const { post } = require('axios')

// browsers use window.FormData, node uses the form-data package
let FormData
if (typeof window === 'object' && window.FormData) {
  FormData = window.FormData
} else {
  FormData = require('form-data')
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
  serverURL = 'https://nanostore.babbage.systems'
}) => {
  const data = new FormData()
  data.append('file', file)
  data.append('referenceNumber', referenceNumber)
  data.append('transactionHex', transactionHex)
  if (inputs) {
    data.append('inputs', JSON.stringify(inputs))
  }
  if (mapiResponses) {
    data.append('mapiResponses', JSON.stringify(mapiResponses))
  }
  if (proof) {
    data.append('proof', JSON.stringify(proof))
  }

  const { data: response } = await post(
    `${serverURL}/upload`,
    data,
    {
      headers: {
        'content-type': 'multipart/form-data'
      }
    }
  )

  if (response.published !== true) {
    throw new Error(response.description || 'The file failed to upload!')
  }

  return response
}

module.exports = { invoice, upload }
