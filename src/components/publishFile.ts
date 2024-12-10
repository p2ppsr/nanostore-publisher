import { CONFIG } from './defaults'
import { invoice } from './invoice'
import { pay } from './pay'
import { upload } from './upload'
import { UploadResult } from '../types/types'
import { PublishFileParams } from '../types/publishFile'
import { NanoStorePublisherError, ErrorWithCode } from '../utils/errors'

const DEFAULT_UPLOAD_DESCRIPTION = 'Upload with NanoStore UI'

/**
 * Validates the configuration object.
 *
 * @param {object} config - The configuration object to validate.
 * @param {string} config.nanostoreURL - The URL of the NanoStore.
 * @param {string} [config.clientPrivateKey] - The private key used for client authentication (optional).
 * @throws {ErrorWithCode} If the configuration is invalid.
 */
const validateConfig = (config: typeof CONFIG): void => {
  if (!config.nanostoreURL || typeof config.nanostoreURL !== 'string') {
    throw new ErrorWithCode(
      'Invalid NanoStore URL in config',
      'ERR_INVALID_CONFIG'
    )
  }
}

/**
 * Validates the file object.
 *
 * @param {File} file - The file to validate.
 * @param {number} file.size - The size of the file in bytes.
 * @throws {NanoStorePublisherError} If the file is invalid or its size is less than or equal to 0.
 */
const validateFile = (file: File): void => {
  if (!file || typeof file.size !== 'number' || file.size <= 0) {
    throw new NanoStorePublisherError(
      'Invalid file: size must be greater than 0.',
      'ERR_INVALID_FILE_SIZE'
    )
  }
}

/**
 * Publishes a file to the NanoStore by creating an invoice, making a payment,
 * and uploading the file.
 *
 * @async
 * @public
 * @param {object} obj - The parameters for the function.
 * @param {object} obj.config - The configuration object.
 * @param {string} obj.config.nanostoreURL - The URL of the NanoStore.
 * @param {string} [obj.config.clientPrivateKey] - The private key used for client authentication (optional).
 * @param {File} obj.file - The file to be uploaded.
 * @param {number} obj.retentionPeriod - The number of minutes the file should be retained.
 * @param {function} [obj.progressTracker] - A callback function to track upload progress (optional).
 * @returns {Promise<UploadResult>} The upload result object containing the file hash, public URL, and status.
 * @throws {NanoStorePublisherError|ErrorWithCode} If validation or any step of the process fails.
 */
export async function publishFile(
  {
    config = CONFIG,
    file,
    retentionPeriod,
    progressTracker = () => {}
  }: PublishFileParams = {} as PublishFileParams
): Promise<UploadResult> {
  try {
    // Validate inputs
    validateConfig(config)
    validateFile(file)

    if (typeof progressTracker !== 'function') {
      throw new NanoStorePublisherError(
        'Progress tracker must be a function.',
        'ERR_INVALID_PROGRESS_TRACKER'
      )
    }

    if (!retentionPeriod || retentionPeriod <= 0) {
      throw new NanoStorePublisherError(
        'Retention period must be specified and greater than 0.',
        'ERR_INVALID_RETENTION_PERIOD'
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
      description: DEFAULT_UPLOAD_DESCRIPTION,
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

    return { ...uploadResult, status: 'success' }
  } catch (e: unknown) {
    if (
      e instanceof NanoStorePublisherError &&
      (e.code === 'ERR_UI_FILE_MISSING' ||
        e.code === 'ERR_UI_HOST_DURATION_MISSING')
    ) {
      throw e
    }

    if (e instanceof Error) {
      throw new ErrorWithCode(
        `Failed to publish file "${file?.name || 'unknown'}": ${e.message}`,
        'ERR_PUBLISH_FILE_FAILED'
      )
    } else {
      throw new ErrorWithCode(
        'An unknown error occurred while publishing the file',
        'ERR_PUBLISH_FILE_FAILED'
      )
    }
  }
}
