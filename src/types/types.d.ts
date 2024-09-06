interface Config {
    nanostoreURL: string;
    clientPrivateKey?: string;
    dojoURL?: string;
} 

interface PaymentInfo {
    derivationPrefix: string;
    derivationSuffix: string;
    derivedPublicKey: string;
    output: {
      script: string;
      satoshis: number;
      basket: string;
      description: string;
    };
}

export interface File {
    type: string;
    dataAsBuffer?: Buffer;
    arrayBuffer(): Promise<ArrayBuffer>;
}
    
export interface UploadResult {
    published: boolean;
    publicURL: string;
    hash: string;
    status: string;
}