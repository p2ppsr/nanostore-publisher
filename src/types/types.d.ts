declare module 'authrite-js'
declare module 'babbage-bsv'

export interface ErrorWithCode extends Error {
  code?: string
}

interface Config {
  nanostoreURL: string
  clientPrivateKey?: string
  dojoURL?: string
}

export interface UploadParams {
  config?: Config
  uploadURL: string
  publicURL: string
  file: File
  serverURL?: string
  onUploadProgress?: (progressEvent: number) => void
}

interface PaymentInfo {
  derivationPrefix: string
  derivationSuffix: string
  derivedPublicKey: string
  output: {
    script: string
    satoshis: number
    basket: string
    description: string
  }
}

export interface File {
  type: string
  dataAsBuffer?: Buffer
  arrayBuffer(): Promise<ArrayBuffer>
}

export interface UploadResult {
  published: boolean
  publicURL: string
  hash: string
  status: string
}
