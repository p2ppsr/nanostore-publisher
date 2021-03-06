# nanostore-publisher

Publish UHRP Content with NanoStore

## Overview

This package allows you to create Universal Hash Resolution Protocol (UHRP) content publications and hosting contracts for files and data. Since UHRP URLs are content-addressed, they are self-authenticating. Since any UHRP host can advertise the availability of content, discovery is no longer controlled by a trusted third party as is the case with HTTP.

## Usage

Check out [NanoStore UI](https://github.com/p2ppsr/nanostore-ui) to see a file upload example with React.

The below code relies on the  [Babbage SDK](https://projectbabbage.com/sdk) to pay for a file to be hosted:

```js
const Babbage = require('@babbage/sdk')

(async () => {
// Get a reference to a File element somehow, or create one if using Node
const file = document.getElementById('file_upload_form_input').files[0]
const serverURL = 'https://nanostore.babbage.systems'

// Send an invoice to the server to get transaction outputs
const inv = await invoice({
  fileSize: file.size,
  retentionPeriod: 525600, // Host for one year
  serverURL
})

// Create an Action with Babbage SDK to pay the invoice
const tx = await Babbage.createAction({
  outputs: inv.outputs.map(x => ({
    satoshis: x.amount,
    script: x.outputScript
  })),
  description: 'Upload with NanoStore'
})

// Upload the file and submit the payment of the invoice
const response = await upload({
  referenceNumber: inv.referenceNumber,
  transactionHex: tx.rawTransaction,
  mapiResponses: tx.mapiResponses,
  inputs: tx.inputs,
  file,
  serverURL
})

// The file is now published
console.log(response)
})()
```

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

*   [invoice](#invoice)
    *   [Parameters](#parameters)
*   [upload](#upload)
    *   [Parameters](#parameters-1)

### invoice

Creates an invoice for a NanoStore file hosting contract.

#### Parameters

*   `obj` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** All parameters are given in an object.

    *   `obj.fileSize` **[Number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** The size of the file you want to host in bytes.
    *   `obj.retentionPeriod` **[Number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** The whole number of minutes you want the file to be hosted.
    *   `obj.serverURL` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The URL of the NanoStore server to contract with. By default, the Babbage NanoStore server is used. (optional, default `https://nanostore.babbage.systems`)

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** The invoice object, containing `referenceNumber` and `outputs`, which is an array of BSV transaction output scripts to use when creating the transaction that you will provide to the `upload` function. Each element in the outputs array contains `outputScript` and `amount` (satoshis). The object also contains `publicURL`, which is the HTTP URL where the file will become available for the duration of the contract once uploaded.

### upload

Uploads a file to NanoStore and pays an invoice, thereby starting the file hosting contract.

#### Parameters

*   `obj` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** All parameters are given in an object.

    *   `obj.referenceNumber` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The reference number that was given to you when you called the `invoice` function.
    *   `obj.transactionHex` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** A Bitcoin SV transaction, in hex string format, which includes the outputs specified by the `invoice` function. It must be signed, and if not already broadcasted, it will be sent to miners by the NanoStore server.
    *   `obj.file` **File** The file to upload. This is usually obtained by querying for your HTML form's file upload `<input />` tag and referencing `tagElement.files[0]`.
    *   `obj.serverURL` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The URL of the NanoStore server to contract with. By default, the Babbage NanoStore server is used. (optional, default `https://nanostore.babbage.systems`)
    *   `obj.onUploadProgress` **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)?** A function called with periodic progress updates as the file uploads (optional, default `()=>{}`)
    *   `obj.inputs`  
    *   `obj.mapiResponses`  
    *   `obj.proof`  

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** The publication object. Fields are `published=true`, `hash` (the UHRP URL of the new file), and `publicURL`, the HTTP URL where the file is published.

## License

The license for the code in this repository is the Open BSV License.
