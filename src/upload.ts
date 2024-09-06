import axios from 'axios'
import { getURLForFile } from 'uhrp-url'
import { CONFIG } from './defaults'
import FormData from 'form-data'
import { Config, UploadResult, File as CustomFile } from './types/types'
import { Buffer } from 'buffer'
import fs from 'fs'

// Add this line:
type File = CustomFile | globalThis.File;

export interface UploadParams {
  config?: Config;
  uploadURL: string;
  publicURL: string;
  file: File;
  serverURL?: string;
  onUploadProgress?: (progressEvent: any) => void;
}

let FileReader: typeof globalThis.FileReader
if (typeof window !== 'undefined' && window.FileReader) {
  FileReader = window.FileReader
} else {
  // Custom FileReader-like implementation for Node.js
  FileReader = class {
    static readAsArrayBuffer(file: Buffer): Promise<ArrayBuffer> {
      return Promise.resolve(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength))
    }
  } as any
}

/**
 * Uploads a file to NanoStore and pays an invoice, thereby starting the file hosting contract.
 *
 * @param obj All parameters are given in an object.
 * @param obj.uploadURL The external URL where the file is uploaded to host it.
 * @param obj.publicURL The public URL where the file can be downloaded from.
 * @param obj.file The file to upload. This is usually obtained by querying for your HTML form's file upload `<input />` tag and referencing `tagElement.files[0]`. Or using custom object as defined in publishFile.js
 * @param obj.serverURL The URL of the NanoStore server to contract with. By default, the Babbage NanoStore server is used.
 * @param obj.onUploadProgress A function called with periodic progress updates as the file uploads
 *
 * @returns The publication object. Fields are `published=true`, `hash` (the UHRP URL of the new file), and `publicURL`, the HTTP URL where the file is published.
 */
export async function upload({
  config = CONFIG,
  uploadURL,
  publicURL,
  file,
  serverURL = `${config.nanostoreURL}`,
  onUploadProgress = () => { }
}: UploadParams): Promise<UploadResult> {
  // Upload file to either local storage or external storage depending on serverURL
  // Allow uploads with MiniScribe
  if (serverURL.startsWith('http://localhost')) {
    const formData = new FormData()
    formData.append('file', file as any)
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

  // This uploads the file and hashes the file at the same time
  const concurrentResult = await Promise.all([
    axios.put(
      uploadURL,
      'dataAsBuffer' in file ? file.dataAsBuffer : file,
      { headers: { 'Content-Type': 'type' in file ? file.type : 'application/octet-stream' }, onUploadProgress }
    ),
    new Promise<string>((resolve, reject) => {
      try {
        // Support both Browser and Node env
        if ('dataAsBuffer' in file && file.dataAsBuffer) {
          resolve(getURLForFile(file.dataAsBuffer))
        } else if (file instanceof Blob) {
          const fr = new FileReader()
          fr.addEventListener('load', () => {
            resolve(getURLForFile(Buffer.from(fr.result as ArrayBuffer)))
          })
          fr.readAsArrayBuffer(file as Blob)
        }
      } catch (e) {
        reject(e)
      }
    })
  ])
  return {
    published: true,
    publicURL,
    hash: concurrentResult[1],
    status: 'success' // Add this line
  }
}

function readFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target && event.target.result) {
        resolve(event.target.result as ArrayBuffer)
      } else {
        reject(new Error('Failed to read file'))
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file as Blob)
  })
}

async function uploadFile(file: File) {
  try {
    const content = await readFile(file)
    // Process the file content...
  } catch (error) {
    console.error('Error reading file:', error)
  }
}
