const { put, post } = require('axios')
const { getURLForFile } = require('uhrp-url')
const { CONFIG } = require('./defaults')
let FileReader
if (typeof window !== 'undefined' && window.FileReader) {
  FileReader = window.FileReader
} else {
  FileReader = require('filereader')
}

/**
 * Uploads a file to NanoStore and pays an invoice, thereby starting the file hosting contract.
 *
 * @param {Object} [obj] All parameters are given in an object.
 * @param {String} [obj.uploadURL] The external URL where the file is uploaded to host it.
 * @param {String} [obj.publicURL] The public URL where the file can be downloaded from.
 * @param {File} [obj.file] The file to upload. This is usually obtained by querying for your HTML form's file upload `<input />` tag and referencing `tagElement.files[0]`.
 * @param {String} [obj.serverURL=https://nanostore.babbage.systems] The URL of the NanoStore server to contract with. By default, the Babbage NanoStore server is used.
 * @param {Function} [obj.onUploadProgress] A function called with periodic progress updates as the file uploads
 *
 * @returns {Promise<Object>} The publication object. Fields are `published=true`, `hash` (the UHRP URL of the new file), and `publicURL`, the HTTP URL where the file is published.
 */
module.exports = async ({ config = CONFIG, uploadURL, publicURL, file, serverURL = `${config.nanostoreURL}`, onUploadProgress = () => { } } = {}) => {
  // Upload file to either local storage or external storage depending on serverURL
  // Allow uploads with MiniScribe
  if (serverURL.startsWith('http://localhost')) {
    const FormData = require('form-data')
    const formData = new FormData()
    formData.append('file', file)
    const res = await post(`${serverURL}/pay`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    // console.log('res:', res)
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
  // console.log('concurrentResult:', concurrentResult)
  return {
    published: true,
    publicURL,
    hash: concurrentResult[1]
  }
}
