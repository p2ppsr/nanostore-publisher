# nanostore-publisher

Publish UHRP Content with NanoStore

## Overview

This package allows you to create Universal Hash Resolution Protocol (UHRP) content publications and hosting contracts for files and data. Since UHRP URLs are content-addressed, they are self-authenticating. Since any UHRP host can advertise the availability of content, discovery is no longer controlled by a trusted third party as is the case with HTTP.

Once you've uploaded, the content is available with [NanoSeek](https://github.com/p2ppsr/nanoseek), which automatically checks the integrity of the data.

## Example Usage

Check out [NanoStore UI](https://github.com/p2ppsr/nanostore-ui) to see a file upload example with React.

All the example code relies on the [Babbage SDK](https://projectbabbage.com/sdk) to pay for a file to be hosted:

```js
import { invoice, pay, upload } from 'nanostore-publisher'

// First, get "file" from an HTML file upload input.
// If you use React, get "file" from your form in the normal React-y way :)
const file = document.getElementById('upload').files[0]

// Decide how long the file is to be hosted on NanoStore.
// This is a number of minutes.
const hostingMinutes = 60 * 24 * 30 // For example, 30 days

// If not provided, the default nanostore URL is 'https://nanostore.babbage.systems'
const serverURL = 'https://nanostore.babbage.systems'

// Get an invoice for a file with this size and hosting duration
const invoice = await invoice({
  fileSize: file.size,
  retentionPeriod: hostingMinutes,
  config: {
    nanostoreURL: serverURL
  }
})

// Automatically pay the invoice with the Babbage SDK
const pay = await pay({
  config: {
    nanostoreURL: serverURL
  },
  description: 'NanoStore Publisher Example', // Shown to the Babbage user
  orderID: invoice.ORDER_ID,
  recipientPublicKey: invoice.identityKey,
  amount: invoice.amount // This is the cost in satoshis
})

// After the payment, the file can be uploaded to NanoStore
const upload = await upload({
  config: {
    nanostoreURL: serverURL
  },
  uploadURL: pay.uploadURL,
  publicURL: invoice.publicURL,
  file,
  serverURL,
  onUploadProgress: prog => { // You can get progress updates
    console.log(
      'Progress:',
      parseInt((prog.loaded / prog.total) * 100)
    )
  }
})

// You'll get the UHRP hash and the public URL after upload
console.log({
  hash: upload.hash,
  publicURL: upload.publicURL
})
```

### Invoice, Pay and Upload

As you can see in the above code, there are three phases to the publication of content with this library. First, an invoice is created where you specify the file size and the retention period of the content you are uploading. Then, you pay for the content, and finally, the content is uploaded to NanoStore.

Here's a more customized example. We've separated the "pay" phase into its `derivePaymentInfo` and `submitPayment` component parts, allowing for a custom transaction to be constructed. This is useful if, for example, there is a need for multiple outputs going to different places:

```js
import [ invoice, derivePaymentInfo, submitPayment, upload ] from 'nanostore-publisher'
import { createAction } from '@babbage/sdk-ts'

// Create an invoice, like normal
const invoice = await invoice({
  fileSize: file.size,
  retentionPeriod: 86400
})

// Get the information needed for making the payment
const paymentInfo = await derivePaymentInfo({
  recipientPublicKey: invoice.identityKey,
  amount: invoice.amount // This is the cost in satoshis
})

// Create a custom transaction, potentially with other outputs
const payment = await createAction({
  description: 'Custom payment',
  outputs: [
    { script: '016a', satoshis: 1 }, // ...custom outputs
    paymentInfo.output               // payment output
  ]
})

// Submit the payment after the transaction is complete
const payment = await submitPayment({
  orderID: invoice.ORDER_ID,
  amount: invoice.amount,
  payment,
  derivationPrefix: paymentInfo.derivationPrefix,
  derivationSuffix: paymentInfo.derivationSuffix,
  vout: 1 // The payment output was at index 1 in the outputs array
})

// Upload the file as normal
const upload = await upload({
  uploadURL: pay.uploadURL,
  publicURL: invoice.publicURL,
  file
})
```

Note, in the above example, that the two low-level payment functions **replace** the high-level `pay` function.

### Simplified File Publishing

If you simply want to publish a single file with default behavior, you can make use of the `publishFile` function.

**Example Usage in a React UI**

```javascript
 // Publish the uploaded file
const uploadResult = await publishFile({
  file,
  retentionPeriod,
  progressTracker: prog => {
    setUploadProgress(
      parseInt((prog.loaded / prog.total) * 100)
    )
  }
})

// Show the results in the UI
setResults({
  hash: uploadResult.hash,
  publicURL: uploadResult.publicURL
})
```

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

*   [invoice](#invoice)
    *   [Parameters](#parameters)
*   [derivePaymentInfo](#derivepaymentinfo)
    *   [Parameters](#parameters-1)
*   [submitPayment](#submitpayment)
    *   [Parameters](#parameters-2)
*   [pay](#pay)
    *   [Parameters](#parameters-3)
*   [upload](#upload)
    *   [Parameters](#parameters-4)
*   [publishFile](#publishfile)
    *   [Parameters](#parameters-5)

### invoice

Creates an invoice for a NanoStore file hosting contract.

#### Parameters

*   `obj` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** All parameters are given in an object. (optional, default `{}`)

    *   `obj.config` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** config object, see config section. (optional, default `CONFIG`)
    *   `obj.fileSize` **[Number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** The size of the file you want to host in bytes.
    *   `obj.retentionPeriod` **[Number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** The whole number of minutes you want the file to be hosted for.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** The invoice object, containing `message` giving details, `identityKey` recipient's private key, `amount` (satoshis), `ORDER_ID`, for referencing this contract payment and passed to the `upload` function. The object also contains `publicURL`, which is the HTTP URL where the file will become available for the duration of the contract once uploaded and the `status`.

### derivePaymentInfo

Derives an output to pay for the NanoStore file hosting contract. After
payment, use `submitPayment` to complete the payment process and get an
upload URL.

#### Parameters

*   `obj` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** All parameters are given in an object. (optional, default `{}`)

    *   `obj.recipientPublicKey` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Public key of the host receiving the payment.
    *   `obj.amount` **[Number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** The number of satoshis being paid.
    *   `obj.config`   (optional, default `CONFIG`)

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** The output object, contains the `script` and the amount of `satoshis`'.

### submitPayment

Submit a manually-created payment for NanoStore hosting. Obtain an output
that must be included in the transaction by using `derivePaymentInfo`, and
then provide the Everett envelope for the transaction here. Also use the
`vout` parameter to specify which output in your transaction has paid the
invoice.

#### Parameters

*   `obj` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** All parameters are given in an object. (optional, default `{}`)

    *   `obj.config` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** config object, see config section. (optional, default `CONFIG`)
    *   `obj.orderID` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The hosting invoice reference.
    *   `obj.amount` **[Number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** The number of satoshis being paid.
    *   `obj.payment` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** The result of calling createAction which incorporates the payment output for the NanoStore hosting. Object that includes `inputs`, `mapiResponses`, `rawTx`.
    *   `obj.vout` **[Number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** The output from the Action which corresponds to the payment for NanoStore hosting
    *   `obj.derivationPrefix` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The value returned from `derivePaymentInfo`
    *   `obj.derivationSuffix` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The value returned from `derivePaymentInfo`

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** The paymentResult object, contains the `uploadURL` and the `publicURL` and the `status`'.

### pay

High-level function to automatically pay an invoice, using a Babbage SDK
`createAction` call.

#### Parameters

*   `obj` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** All parameters are given in an object. (optional, default `{}`)

    *   `obj.config` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** config object, see config section. (optional, default `CONFIG`)
    *   `obj.description` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The description to be used for the payment.
    *   `obj.orderID` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The hosting invoice reference.
    *   `obj.recipientPublicKey` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Public key of the host receiving the payment.
    *   `obj.amount` **[Number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** The number of satoshis being paid.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** The pay object, contains the `uploadURL` and the `publicURL` and the `status`'.

### upload

Uploads a file to NanoStore and pays an invoice, thereby starting the file hosting contract.

#### Parameters

*   `obj` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)?** All parameters are given in an object. (optional, default `{}`)

    *   `obj.uploadURL` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** The external URL where the file is uploaded to host it.
    *   `obj.publicURL` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)?** The public URL where the file can be downloaded from.
    *   `obj.file` **(File | [object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))?** The file to upload. This is usually obtained by querying for your HTML form's file upload `<input />` tag and referencing `tagElement.files[0]`. Or using custom object as defined in publishFile.js
    *   `obj.serverURL` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The URL of the NanoStore server to contract with. By default, the Babbage NanoStore server is used. (optional, default `https://nanostore.babbage.systems`)
    *   `obj.onUploadProgress` **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)?** A function called with periodic progress updates as the file uploads (optional, default `()=>{}`)
    *   `obj.config`   (optional, default `CONFIG`)

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** The publication object. Fields are `published=true`, `hash` (the UHRP URL of the new file), and `publicURL`, the HTTP URL where the file is published.

### publishFile

High-level function to automatically pay an invoice, using a Babbage SDK
`createAction` call, or a clientPrivateKey when in a server environment.

#### Parameters

*   `obj` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** All parameters are given in an object. (optional, default `{}`)

    *   `obj.config` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** config object, see config section. (optional, default `CONFIG`)
    *   `obj.file` **(File | [object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))** the File to upload given as File or custom object with the necessary data params (see below)
    *   `obj.retentionPeriod` **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)** how long the file should be retained
    *   `obj.progressTracker` **[function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)** function to provide updates on upload progress (optional, default `()=>{}`)

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** The upload object, contains the `hash` and the `publicURL` and the `status`'.

```javascript
// Example compatible File object for publishing file data from a Buffer
const fileToUpload = {
  dataAsBuffer,
  size: dataAsBuffer.length,
  type: 'image/png' // use 'mime' to determine file type
}
```

## License

The license for the code in this repository is the Open BSV License.
