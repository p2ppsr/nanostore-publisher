import { CONFIG } from './defaults'
import { invoice } from './invoice'
import { pay } from './pay'
import { upload } from './upload'
import { Config } from './types/types'

interface File {
  size: number
  type: string
  arrayBuffer(): Promise<ArrayBuffer>
}

interface PublishFileParams {
  config?: Config
  file: File
  retentionPeriod: number
  progressTracker?: (progress: number) => void
}

interface UploadResult {
  hash: string
  publicURL: string
  status: string
}

/**
 * High-level function to automatically pay an invoice, using a Babbage SDK
 * `createAction` call, or a clientPrivateKey when in a server environment.
 *
 * @public
 * @param obj All parameters are given in an object.
 * @param obj.config config object, see config section.
 * @param obj.file - the File to upload given as File or custom object with the necessary data params (see above spec)
 * @param obj.retentionPeriod - how long the file should be retained
 * @param obj.progressTracker - function to provide updates on upload progress
 *
 * @returns The upload object, contains the `hash` and the `publicURL` and the `status`'.
 */
export async function publishFile({
  config = CONFIG,
  file,
  retentionPeriod,
  progressTracker = () => {}
}: PublishFileParams = {} as PublishFileParams): Promise<UploadResult | undefined> {
  try {
    // Validate required params
    if (!file) {
      const e: Error & { code?: string } = new Error('Choose a file to upload!')
      e.code = 'ERR_UI_FILE_MISSING'
      throw e
    }
    if (!retentionPeriod) {
      const e: Error & { code?: string } = new Error('Specify how long to host the file!')
      e.code = 'ERR_UI_HOST_DURATION_MISSING'
      throw e
    }

    // Get a payment invoice for the file to upload
    const invoiceResult = await invoice({
      config,
      fileSize: file.size,
      retentionPeriod
    })

    // Make a payment
    const payResult = await pay({
      config,
      description: 'Upload with NanoStore UI',
      orderID: invoiceResult.ORDER_ID,
      recipientPublicKey: invoiceResult.identityKey,
      amount: invoiceResult.amount
    })

    // Upload the file after payment as completed
    const uploadResult = await upload({
      config: {
        nanostoreURL: config.nanostoreURL
      },
      uploadURL: payResult.uploadURL,
      publicURL: invoiceResult.publicURL,
      file,
      serverURL: config.nanostoreURL,
      onUploadProgress: progressTracker
    })

    // Add status to the upload result
    return { ...uploadResult, status: 'success' }
  } catch (e) {
    console.error(e)
    return undefined
  }
}
