import { Config } from './types'
import { CreateActionParams } from '@babbage/sdk-ts'

export interface PayParams {
  config?: Config
  description: string
  orderID: string
  recipientPublicKey: string
  amount: number
}

export interface PaymentResponse {
  uploadURL: string
  publicURL: string
  status: string
  description?: string
  code?: string
}

// Extend the CreateActionParams type
export interface ExtendedCreateActionParams extends CreateActionParams {
  topics?: string[]
}
