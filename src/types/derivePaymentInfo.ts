import { Config } from './types'

export interface DerivePaymentInfoParams {
  config?: Config
  recipientPublicKey: string
  amount: number
}
