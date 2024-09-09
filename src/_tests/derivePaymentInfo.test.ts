import { derivePaymentInfo } from '../derivePaymentInfo';
import { getPublicKey } from '@babbage/sdk-ts';
import { invoice3241645161d8 } from 'ninja-base';
import { CONFIG } from '../defaults';
import crypto from 'crypto';

jest.mock('@babbage/sdk-ts');
jest.mock('ninja-base');
jest.mock('crypto');

// Mock sendover
jest.mock('sendover', () => ({
  getPaymentAddress: jest.fn()
}));

// Mock babbage-bsv
jest.mock('babbage-bsv', () => {
    const mockScriptFromAddress = jest.fn().mockReturnValue({
      toHex: jest.fn().mockReturnValue('mockScriptHex')
    });
  
    const mockScript = jest.fn().mockImplementation(() => ({
      toHex: jest.fn().mockReturnValue('mockScriptHex')
    }));
  
    return {
      Script: Object.assign(mockScript, { fromAddress: mockScriptFromAddress }),
      Address: {
        fromPublicKey: jest.fn().mockReturnValue({
          toString: jest.fn().mockReturnValue('mockAddress')
        })
      },
      PublicKey: {
        fromString: jest.fn().mockReturnValue({
          toAddress: jest.fn().mockReturnValue('mockAddress')
        })
      },
      BN: jest.fn().mockImplementation((value) => ({ toString: () => value.toString() }))
    };
  });

// Import the mocked modules after mocking
import { getPaymentAddress } from 'sendover';
import * as bsv from 'babbage-bsv';

describe('derivePaymentInfo function', () => {
  const mockConfig = {
    ...CONFIG,
    clientPrivateKey: 'mockPrivateKey'
  };

  const mockRecipientPublicKey = 'mockRecipientPublicKey';
  const mockAmount = 1000;
  const mockValidPublicKey = '0250863ad64a87ae8a2fe83c1af1a8403cb53f53e486d8511dad8a04887e5b2352';

  beforeEach(() => {
    jest.clearAllMocks();
    (crypto.randomBytes as jest.Mock).mockReturnValue(Buffer.from('mockRandomBytes'));
    (invoice3241645161d8 as jest.Mock).mockReturnValue('mockInvoiceNumber');
    (getPaymentAddress as jest.Mock).mockReturnValue(mockValidPublicKey);
    (getPublicKey as jest.Mock).mockResolvedValue(mockValidPublicKey);
  });

  it('should derive payment info with clientPrivateKey', async () => {
    const result = await derivePaymentInfo({
      config: mockConfig,
      recipientPublicKey: mockRecipientPublicKey,
      amount: mockAmount
    });

    expect(getPaymentAddress).toHaveBeenCalledWith({
      senderPrivateKey: mockConfig.clientPrivateKey,
      recipientPublicKey: mockRecipientPublicKey,
      invoiceNumber: 'mockInvoiceNumber',
      returnType: 'publicKey'
    });

    expect(result).toEqual({
      derivationPrefix: 'bW9ja1JhbmRvbUJ5dGVz',
      derivationSuffix: 'bW9ja1JhbmRvbUJ5dGVz',
      derivedPublicKey: mockValidPublicKey,
      output: {
        script: 'mockScriptHex',
        satoshis: mockAmount,
        basket: 'nanostore',
        description: 'Payment for file hosting'
      }
    });
  });

  it('should derive payment info without clientPrivateKey', async () => {
    const result = await derivePaymentInfo({
      recipientPublicKey: mockRecipientPublicKey,
      amount: mockAmount
    });

    expect(getPublicKey).toHaveBeenCalled();

    expect(result).toEqual({
      derivationPrefix: 'bW9ja1JhbmRvbUJ5dGVz',
      derivationSuffix: 'bW9ja1JhbmRvbUJ5dGVz',
      derivedPublicKey: mockValidPublicKey,
      output: {
        script: 'mockScriptHex',
        satoshis: mockAmount,
        basket: 'nanostore',
        description: 'Payment for file hosting'
      }
    });
  });

  it('should use default CONFIG if no config is provided', async () => {
    await derivePaymentInfo({
      recipientPublicKey: mockRecipientPublicKey,
      amount: mockAmount
    });
  
    expect(getPublicKey).toHaveBeenCalledWith({
      protocolID: [2, '3241645161d8'],
      keyID: expect.any(String),
      counterparty: mockRecipientPublicKey
    });
  });

  it('should handle errors from getPaymentAddress', async () => {
    (getPaymentAddress as jest.Mock).mockImplementation(() => {
      throw new Error('Mock getPaymentAddress error');
    });

    await expect(derivePaymentInfo({
      config: mockConfig,
      recipientPublicKey: mockRecipientPublicKey,
      amount: mockAmount
    })).rejects.toThrow('Mock getPaymentAddress error');
  });

  it('should handle errors from getPublicKey', async () => {
    (getPublicKey as jest.Mock).mockRejectedValue(new Error('Mock getPublicKey error'));

    await expect(derivePaymentInfo({
      recipientPublicKey: mockRecipientPublicKey,
      amount: mockAmount
    })).rejects.toThrow('Mock getPublicKey error');
  });

  it('should generate unique derivation prefix and suffix', async () => {
    const result1 = await derivePaymentInfo({
      recipientPublicKey: mockRecipientPublicKey,
      amount: mockAmount
    });

    (crypto.randomBytes as jest.Mock).mockReturnValue(Buffer.from('differentRandomBytes'));

    const result2 = await derivePaymentInfo({
      recipientPublicKey: mockRecipientPublicKey,
      amount: mockAmount
    });

    expect(result1.derivationPrefix).not.toBe(result2.derivationPrefix);
    expect(result1.derivationSuffix).not.toBe(result2.derivationSuffix);
  });

  it('should handle invalid input', async () => {
    await expect(derivePaymentInfo({
      recipientPublicKey: '',
      amount: -1
    })).rejects.toThrow('Invalid recipient public key');

    await expect(derivePaymentInfo({
      recipientPublicKey: 'validKey',
      amount: -1
    })).rejects.toThrow('Invalid amount');
  });

  it('should create a valid bsv script', async () => {
    const result = await derivePaymentInfo({
      recipientPublicKey: mockRecipientPublicKey,
      amount: mockAmount
    });

    expect(bsv.Script).toHaveBeenCalled();
    expect(bsv.Script.fromAddress).toHaveBeenCalled();
    expect(bsv.Address.fromPublicKey).toHaveBeenCalled();
    expect(bsv.PublicKey.fromString).toHaveBeenCalled();
    expect(result.output.script).toBe('mockScriptHex');
  });
  it('should create a valid bsv script', async () => {
    const result = await derivePaymentInfo({
      recipientPublicKey: mockRecipientPublicKey,
      amount: mockAmount
    });
  
    expect(bsv.Script).toHaveBeenCalled();
    expect(bsv.Script.fromAddress).toHaveBeenCalled();
    expect(bsv.Address.fromPublicKey).toHaveBeenCalled();
    expect(bsv.PublicKey.fromString).toHaveBeenCalled();
    expect(result.output.script).toBe('mockScriptHex');
  });
});