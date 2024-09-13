import axios from 'axios'
import { getURLForFile } from 'uhrp-url'
import { CONFIG } from './defaults'
import { UploadParams, UploadResult } from '../types/types'
import { NanoStorePublisherError } from '../utils/errors'

let FileReader: typeof globalThis.FileReader | undefined

if (typeof window !== 'undefined' && window.FileReader) {
  FileReader = window.FileReader
}

/**
 * Uploads a file to NanoStore and pays an invoice, thereby starting the file hosting contract.
 *
 * @param {Object} [obj] All parameters are given in an object.
 * @param {String} [obj.uploadURL] The external URL where the file is uploaded to host it.
 * @param {String} [obj.publicURL] The public URL where the file can be downloaded from.
 * @param {File | object} [obj.file] The file to upload. This is usually obtained by querying for your HTML form's file upload `<input />` tag and referencing `tagElement.files[0]`. Or using custom object as defined in publishFile.js.
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
    // Determine content type based on file type or fallback to 'application/octet-stream'
    const contentType =
      file instanceof Blob
        ? file.type || 'application/octet-stream'
        : 'application/octet-stream'

    // Upload logic for the server (NanoStore)
    if (serverURL.startsWith('http://localhost')) {
      const formData = new FormData()

      // Check if it's a File (which has the 'name' property) or a Blob
      if (file instanceof File) {
        formData.append('file', file, file.name) // Use file.name here
      } else if (file instanceof Blob) {
        formData.append('file', file, 'file') // Default name for Blob since Blob doesn't have 'name'
      } else {
        throw new NanoStorePublisherError(
          'Unsupported file type for local storage upload',
          'ERR_INVALID_FILE_TYPE'
        )
      }

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

    // Concurrently upload the file and generate its URL
    const concurrentResult = await Promise.all([
      axios.put(uploadURL, file, {
        headers: {
          'Content-Type': contentType // Dynamically set the Content-Type based on file type
        },
        onUploadProgress
      }),
      new Promise<string>((resolve, reject) => {
        if (!FileReader) {
          return reject(
            new Error('FileReader is not available in this environment.')
          )
        }

        const fr = new FileReader()
        fr.addEventListener('load', () => {
          resolve(getURLForFile(Buffer.from(fr.result as ArrayBuffer)))
        })
        fr.addEventListener('error', err => reject(err))
        fr.readAsArrayBuffer(file as Blob) // Safe cast to Blob
      })
    ])

    return {
      published: true,
      publicURL,
      hash: concurrentResult[1],
      status: 'success'
    }
  } catch (error) {
    console.error('Upload failed:', error)

    // Rethrow specific or generic NanoStorePublisherError
    if (error instanceof NanoStorePublisherError) {
      throw error
    }

    throw new NanoStorePublisherError('File upload failed', 'ERR_UPLOAD_FAILED')
  }
}
