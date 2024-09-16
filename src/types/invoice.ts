import { Config } from './types'

export interface InvoiceParams {
  config?: Config
  fileSize: number
  retentionPeriod: number
}

export interface InvoiceResponse {
  message: string
  identityKey: string
  amount: number
  ORDER_ID: string
  publicURL: string
  status: string
  description?: string
  code?: string
}
