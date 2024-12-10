import { Config } from '../types/types'
import { sdk } from '@babbage/sdk-ts'

/**
 * Global configuration for the application.
 * This configuration includes the URL of the nanostore service
 * and the optional private key for the client in hexadecimal format.
 */
export const CONFIG: Readonly<Config> = Object.freeze({
  nanostoreURL: 'https://nanostore.babbage.systems', // URL for nanostore service
  clientPrivateKey: undefined as sdk.HexString | undefined // Private key for the client, if configured
})
