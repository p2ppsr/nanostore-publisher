import { sdk } from '@babbage/sdk-ts'
import { Input } from './submitPayments'

/**
 * Represents an error with an optional error code.
 */
export interface ErrorWithCode extends Error {
  code?: string
}

/**
 * Configuration settings for the application.
 */
export interface Config {
  nanostoreURL: string
  clientPrivateKey?: string // Updated to sdk.HexString if applicable
  dojoURL?: string
}

/**
 * Represents the structure of a MAPI (Merchant API) response.
 */
export interface MapiResponse {
  payload: string
  signature: string
  publicKey: string
}

/**
 * Represents a Bitcoin payment.
 */
export interface Payment {
  inputs: Input[] // Define Input elsewhere in your types or imports
  mapiResponses: MapiResponse[]
  rawTx: string
}

/**
 * Parameters for uploading a file.
 */
export interface UploadParams {
  config?: Config
  uploadURL: string
  publicURL: string
  file: File
  serverURL?: string
  onUploadProgress?: (progressEvent: number) => void
}

/**
 * Payment information including derivation details and output configuration.
 */
export interface PaymentInfo {
  derivationPrefix: string
  derivationSuffix: string
  derivedPublicKey: string // Updated to sdk.HexString if applicable
  output: {
    script: string
    satoshis: number
    basket: string
    description: string
  }
}

/**
 * Represents a file to be uploaded.
 */
export interface File {
  type: string
  dataAsBuffer?: Buffer
  arrayBuffer(): Promise<ArrayBuffer>
}

/**
 * Result of a successful upload.
 */
export interface UploadResult {
  published: boolean
  publicURL: string
  hash: string
  status: string
}
