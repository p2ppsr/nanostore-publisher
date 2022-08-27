module.exports = {
  CONFIG: {
    nanostoreURL: window.location.host.startsWith('localhost')
      ? 'http://localhost:3104'
      : process.env.REACT_APP_IS_STAGING
        ? 'https://staging-nanostore.babbage.systems'
        : 'https://nanostore.babbage.systems'
  }
}
