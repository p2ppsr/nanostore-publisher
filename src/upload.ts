import axios from 'axios'
import { getURLForFile } from 'uhrp-url'
import { CONFIG } from './defaults'
import { Config, UploadResult, File as CustomFile } from './types/types'
import { Buffer } from 'buffer'

type File = CustomFile | globalThis.File;

export interface UploadParams {
  config?: Config;
  uploadURL: string;
  publicURL: string;
  file: File;
  serverURL?: string;
  onUploadProgress?: (progressEvent: number) => void;
}

let FileReader: typeof globalThis.FileReader
if (typeof window !== 'undefined' && window.FileReader) {
  FileReader = window.FileReader
} else {
  // Custom FileReader-like implementation for Node.js
  FileReader = class {
    static readAsArrayBuffer(file: Buffer): Promise<ArrayBuffer> {
      return Promise.resolve(
        file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
      )
    }
  } as unknown as typeof globalThis.FileReader
}

// Simple FormData-like class
class SimpleFormData {
  private data: Record<string, any> = {}

  append(key: string, value: any, options?: any) {
    this.data[key] = value
  }

  get(key: string) {
    return this.data[key]
  }
}

export async function upload({
  config = CONFIG,
  uploadURL,
  publicURL,
  file,
  serverURL = `${config.nanostoreURL}`,
  onUploadProgress = () => {}
}: UploadParams): Promise<UploadResult> {
  if (serverURL.startsWith('http://localhost')) {
    const formData = new SimpleFormData()
    if (file instanceof Blob) {
      formData.append('file', file)
    } else if (file instanceof Buffer) {
      formData.append('file', file, { filename: 'file' })
    } else if ('dataAsBuffer' in file) {
      formData.append('file', file.dataAsBuffer, { filename: 'file' })
    } else if (file instanceof File) {
      const buffer = Buffer.from(await file.arrayBuffer())
      formData.append('file', buffer, { filename: file.name })
    } else {
      throw new Error('Unsupported file type for local storage upload')
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

  // This uploads the file and hashes the file at the same time
  const concurrentResult = await Promise.all([
    axios.put(uploadURL, 'dataAsBuffer' in file ? file.dataAsBuffer : file, {
      headers: {
        'Content-Type': 'type' in file ? file.type : 'application/octet-stream'
      },
      onUploadProgress
    }),
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
    status: 'success'
  }
}
