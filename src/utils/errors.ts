export class NanoStorePublisherError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'NanoStorePublisherError'
  }
}
