import { Config, Payment } from './types'

export interface SubmitPaymentParams {
  config?: Config
  orderID: string
  amount: number
  payment: Payment
  vout: number
  derivationPrefix: string
  derivationSuffix: string
}

export interface PaymentResult {
  uploadURL: string
  publicURL: string
  status: string
  description?: string
  code?: string
}

export interface Input {
  // Define the structure of an input
  txid: string
  vout: number
  satoshis: number
  scriptSig: string
}
