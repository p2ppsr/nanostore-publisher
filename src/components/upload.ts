import axios from 'axios'
import { getURLForFile } from 'uhrp-url'
import { CONFIG } from './defaults'
import { UploadParams, UploadResult } from '../types/types'
import { Buffer } from 'buffer'
import { NanoStorePublisherError, ErrorWithCode } from '../utils/errors'

// Export axios so it can be mocked in tests
export { axios }

// Use FileReader either from the browser or require filereader for Node.js
let FileReader: typeof globalThis.FileReader
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
 * @param {File | object} [obj.file] The file to upload.
 * @param {String} [obj.serverURL=https://nanostore.babbage.systems] The URL of the NanoStore server to contract with. By default, the Babbage NanoStore server is used.
 * @param {Function} [obj.onUploadProgress] A function called with periodic progress updates as the file uploads.
 *
 * @returns {Promise<Object>} The publication object. Fields are `published=true`, `hash` (the UHRP URL of the new file), and `publicURL`, the HTTP URL where the file is published.
 */
export async function upload({
  config = CONFIG,
  uploadURL,
  publicURL,
  file,
  serverURL = `${config.nanostoreURL}`,
  onUploadProgress = () => {}
}: UploadParams): Promise<UploadResult> {
  try {
    // Handle local storage upload via localhost with multipart/form-data
    if (serverURL.startsWith('http://localhost')) {
      const FormData = require('form-data')
      const formData = new FormData()

      if (!(file instanceof Blob)) {
        throw new NanoStorePublisherError(
          'Unsupported file type for local storage upload',
          'ERR_INVALID_FILE_TYPE'
        )
      }

      formData.append('file', file)

      const res = await axios.post(`${serverURL}/pay`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      return {
        published: true,
        publicURL: `${serverURL}/data/${res.data}`,
        hash: res.data,
        status: 'success'
      }
    }

    // Handle external upload and concurrent hash generation
    const concurrentResult = await Promise.all([
      // Upload file using PUT
      axios.put(
        uploadURL,
        'dataAsBuffer' in file ? file.dataAsBuffer : file, // Supports Buffer and file uploading
        {
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          onUploadProgress
        }
      ),
      new Promise<string>((resolve, reject) => {
        try {
          // Hash file based on environment
          if ('dataAsBuffer' in file && file.dataAsBuffer) {
            resolve(getURLForFile(file.dataAsBuffer))
          } else if (file instanceof Blob) {
            const fr = new FileReader()
            fr.onload = () => {
              resolve(getURLForFile(Buffer.from(fr.result as ArrayBuffer)))
            }
            fr.onerror = () =>
              reject(
                new ErrorWithCode(
                  'Failed to read file for hashing',
                  'ERR_INVALID_UHRP_URL'
                )
              )
            fr.readAsArrayBuffer(file)
          } else {
            reject(
              new ErrorWithCode(
                'Unsupported file type for hashing',
                'ERR_UNSUPPORTED_HASHING_FILETYPE'
              )
            )
          }
        } catch (err) {
          reject(err)
        }
      })
    ])

    return {
      published: true,
      publicURL,
      hash: concurrentResult[1],
      status: 'success'
    }
  } catch (error) {
    // Log and throw custom error
    console.error('Upload failed:', error)
    throw new NanoStorePublisherError('File upload failed', 'ERR_UPLOAD_FAILED')
  }
}
