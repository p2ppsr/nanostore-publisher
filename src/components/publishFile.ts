import { CONFIG } from './defaults'
import { invoice } from './invoice'
import { pay } from './pay'
import { upload } from './upload'
import { UploadResult } from '../types/types'
import { PublishFileParams } from '../types/publishFile'
import { NanoStorePublisherError, ErrorWithCode } from '../utils/errors'

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
 * @returns The upload object, contains the `hash` and the `publicURL` and the `status`.
 */
export async function publishFile(
  {
    config = CONFIG,
    file,
    retentionPeriod,
    progressTracker = () => {}
  }: PublishFileParams = {} as PublishFileParams
): Promise<UploadResult | undefined> {
  try {
    // Validate required params
    if (!file) {
      throw new NanoStorePublisherError(
        'File is required for upload.',
        'ERR_UI_FILE_MISSING'
      )
    }
    if (!retentionPeriod) {
      throw new NanoStorePublisherError(
        'Retention period must be specified.',
        'ERR_UI_HOST_DURATION_MISSING'
      )
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

    // Upload the file after payment is completed
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
  } catch (e: unknown) {
    if (
      e instanceof NanoStorePublisherError &&
      (e.code === 'ERR_UI_FILE_MISSING' ||
        e.code === 'ERR_UI_HOST_DURATION_MISSING')
    ) {
      throw e
    }

    // Wrap any other error in ErrorWithCode for consistent handling
    if (e instanceof Error) {
      throw new ErrorWithCode(
        `Failed to publish file: ${e.message}`,
        'ERR_PUBLISH_FILE_FAILED'
      )
    } else {
      // Handle unknown errors that may not be instances of Error
      throw new ErrorWithCode(
        'An unknown error occurred while publishing the file',
        'ERR_PUBLISH_FILE_FAILED'
      )
    }
  }
}
