import { CONFIG } from '../components/defaults'
import { Config } from '../types/types'

describe('defaults', () => {
  it('should export a CONFIG object', () => {
    expect(CONFIG).toBeDefined()
    expect(typeof CONFIG).toBe('object')
  })

  it('should have the correct shape', () => {
    const expectedKeys: (keyof Config)[] = ['nanostoreURL']
    expectedKeys.forEach(key => {
      expect(CONFIG).toHaveProperty(key)
    })
  })

  it('should have a valid nanostoreURL', () => {
    expect(typeof CONFIG.nanostoreURL).toBe('string')
    expect(CONFIG.nanostoreURL).toBe('https://nanostore.babbage.systems')

    // Check if it's a valid URL
    expect(() => new URL(CONFIG.nanostoreURL)).not.toThrow()
  })

  it('should not have any additional properties', () => {
    const configKeys = Object.keys(CONFIG)
    expect(configKeys).toHaveLength(2)
    expect(configKeys).toEqual(['nanostoreURL', 'clientPrivateKey'])
  })

  it('should be a read-only object', () => {
    expect(Object.isFrozen(CONFIG)).toBe(true)

    // Ensure attempting modification throws an error
    expect(() => {
      ;(CONFIG as any).nanostoreURL = 'https://example.com'
    }).toThrow(TypeError)
  })
})
