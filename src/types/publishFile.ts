import { Config } from './types'

export interface PublishFileParams {
  config?: Config
  file: File
  retentionPeriod: number
  progressTracker?: (progress: number) => void
}
