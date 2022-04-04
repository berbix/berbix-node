# Berbix Node SDK

This Berbix Node library provides simple interfaces to interact with the Berbix API.

## Installation

This SDK requires Node version 7.10.1 or greater.

If you are using NPM for package management
```shell
npm install berbix
```

If you are using Yarn for package management
```shell
yarn add berbix
```
## Usage

### Constructing a client
```js
// Import the Berbix Node library
var berbix = require('berbix');

// Construct the client, providing your API secret
var client = new berbix.Client({
  apiSecret: 'your_api_secret_here',
})
```

### Create a transaction
```js
var transactionTokens = await client.createTransaction({
  customerUid: "internal_customer_uid", // ID for the user in internal database
  templateKey: "your_template_key", // Template key for this transaction
})
```

### Create tokens from refresh token
```js
// Load refresh token from database
var transactionTokens = berbix.Tokens.fromRefresh(refreshToken)
```

### Fetch transaction data
```js
var transactionData = await client.fetchTransaction(transactionTokens)
```

## Reference

### `Client`

#### Methods

##### `constructor(options: object)`

Supported `options` properties:

- `apiSecret` (required) - The API secret that can be found in your Berbix Dashboard.
- `httpClient` - An optional override for the default HTTP client. The client should have a `request` method with the following
  signature:
  ```
  request(host: string, method: string, path: string, headers: object, data: object): Promise<{statusCode: number, parsedBody: object}>
  ```

##### `createTransaction(options: object): Tokens`

Creates a transaction within Berbix to initialize the client SDK. Typically, after creating
a transaction, you will want to store the refresh token in your database associated with the
currently active user session.

Supported options:

- `email` - Previously verified email address for a user.
- `phone` - Previously verified phone number for a user.
- `customerUid` - An ID or identifier for the user in your system.
- `templateKey` - The template key for this transaction.
- `consentsToAutomatedFacialRecognition` - Indicates that the end user has already consented to the use of automated
  facial recognition. Reach out to Berbix if you need to pass user consent through the API, as the use of this option
  is disallowed by default.
- Deprecated: `hostedOptions` - Optional configuration object for creating hosted transactions. The `hostedOptions` object can optionally include the following fields:
  - `completionEmail` - Email address to which completion alerts will be sent for this transaction.
  - `redirectUrl` - URL to redirect the user to after they complete the transaction. If not specified, the URL specified in the Berbix dashboard will be used instead.

##### `createHostedTransaction(options : object): {tokens: Tokens, hostedUrl: string}`

Creates a hosted transaction within Berbix to initialize the client SDK. This works the same as `createTransaction()` except that the object returned includes an explicit `hostedUrl` property for hosted transactions.

##### `createApiOnlyTransaction(options: object): Tokens`
Similar to `createTransaction()`, but used to create a transaction to be used as part of an API-only transaction.

Supported options:
- `customerUid` - An ID or identifier for the user in your system.
- `templateKey` - The template key for this transaction.
- `consentsToAutomatedFacialRecognition` - Indicates that the user has already consented to the use of automated
  facial recognition. Berbix cannot determine if a selfie matches and ID for selfies uploaded through the API if this
  option is not set to `true`. Reach out to Berbix if you need to pass user consent through the API, as the use of this option
  is disallowed by default.
- `apiOnlyOpts` - Object with the following properties
  - `idType` - (Optional) the type of ID that will be uploaded for this transaction. You can see the supported values in [API documentation](https://docs.berbix.com/reference/createtransaction) for the `api_only_options` under the body params for creating a transaction.
  - `idCountry` - (Optional) the two-letter country code (ISO 3166-1 alpha-2) for the country that issued the ID that will be uploaded.

##### `fetchTransaction(tokens: Tokens): object`

Fetches all of the information associated with the transaction. If the user has already completed the steps of the transaction, then this will include all of the elements of the transaction payload as described on the [Berbix developer docs](https://developers.berbix.com).

##### `refreshTokens(tokens: Tokens): void`

This is typically not needed to be called explicitly as it will be called by the higher-level
SDK methods, but can be used to get fresh client or access tokens.

##### `validateSignature(secret: string, body: string, header: string): boolean`

This method validates that the content of the webhook has not been forged. This should be called for every endpoint that is configured to receive a webhook from Berbix.

Parameters:

- `secret` - This is the secret associated with that webhook. NOTE: This is distinct from the API secret and can be found on the webhook configuration page of the dashboard.
- `body` - The full request body from the webhook. This should take the raw request body prior to parsing.
- `header` - The value in the 'X-Berbix-Signature' header.

##### `deleteTransaction(tokens: Tokens): void`

Permanently deletes all submitted data associated with the transaction corresponding to the tokens provided.

##### `updateTransaction(tokens: Tokens, parameters: object): object`

Changes a transaction's "action", for example upon review in your systems. Returns the updated transaction upon success.

Parameters:

- `action: string` - A string describing the action taken on the transaction. Typically this will either be "accept" or "reject".
- `note: string` - A string containing an optional note explaining the action taken.

##### `overrideTransaction(tokens: Tokens, parameters: object): void`

Completes a previously created transaction, and overrides its return payload and flags to match the provided parameters.

Parameters:

- `responsePayload: string` - A string describing the payload type to return when fetching transaction metadata, e.g. "us-dl". See [our testing guide](https://docs.berbix.com/docs/testing) for possible options.
- `flags: string[]` - An optional list of flags to associate with the transaction (independent of the payload's contents), e.g. ["id_under_18", "id_under_21"]. See [our flags documentation][flags-docs] for a list of flags.
- `overrideFields: { string: string }` - An optional mapping from a [transaction field](https://docs.berbix.com/reference#gettransactionmetadata) to the desired override value, e.g. `params.overrideFields = { "date_of_birth": "2000-12-09" } `

#### `uploadImage(tokens: Tokens, imageUploadOpts: ImageUploadOpts): { nextStep: string, previewFlags: string[] }`

Upload an image for a transaction as part of an [API integration](https://docs.berbix.com/docs/api-only-integration-guide).
The `images` property of the `imageUploadOpts` is required.

The returned object will have the following properties if the image could be processed by the API and the API returns a 200 status code:
 - `nextStep: string` -  A string indicating what the next upload expected by the API is. See the [API documentation for uploads][upload-docs].
 - `issues: string[]` - A list of issues detected with the image. This can be used to understand why an image was not accepted
    and potentially coach end users on taking another photo if the `nextStep` indicates that another photo of the same subject
    should be uploaded again. See the [API Integration Guide](https://docs.berbix.com/docs/api-only-integration-guide#issues)
    for a list of potential issues.
 - `issueDetails: IssueDetails` - Extra details on the issue(s) detected. See [IssueDetails](#issuedetails) below.

This method may throw an object containing the following properties if there was an error uploading the image:
 - `status: number` - The HTTP status code returned by the API. As documented in [documentation for uploads endpoint][upload-docs],
   different 4XX status codes can indicate different problems with the upload, so thrown objects should be caught and
   the `status` property inspected by the caller to determine how to proceed.
 - `error: string` - An error message.
 - `nextStep: string | undefined` - Only present for 409 ("Conflict") responses. Indicates the next expected step. See the [API documentation for uploads][upload-docs].
 - `response: object` - The parsed JSON response body from the API, as [described in the documentation for the endpoint][upload-docs].

#### `uploadIdScan(tokens: string, idScanOpts: {idScans: []{scanType: string, extractedData: string}})`

Upload barcode payload(s) for a transaction as part of an [API integration](https://docs.berbix.com/docs/api-only-integration-guide).

While not as capable at catching fraud as `uploadImage()`, this endpoint can be used for cases where only the payload
from a PDF417 barcode is available -- for example, if a barcode scanner is being used.

The `scanType` property in the `idScanOpts` passed describes the type of barcode being processed. As of writing, `'pdf417'`
is the only supported value.

The `extractedData` should have the base 64 encoded bytes extracted from the barcode.

The types of objects returned and thrown by `uploadIdScan()` are the same as for `uploadImage()`.

### `Tokens`

#### Properties

##### `accessToken: string`

This is the short-lived bearer token that the backend SDK uses to identify requests associated with a given transaction. This is not typically needed when using the higher-level SDK methods.

##### `clientToken: string`

This is the short-lived token that the frontend SDK uses to identify requests associated with a given transaction. After transaction creation, this will typically be sent to a frontend SDK.

##### `refreshToken: string`

This is the long-lived token that allows you to create new tokens after the short-lived tokens have expired. This is typically stored in the database associated with the given user session.

##### `transactionId: number`

The internal Berbix ID number associated with the transaction.

##### `expiry: number`

The Unix timestamp in seconds at which the access and client tokens will expire.

#### Static methods

##### `fromRefresh(refreshToken: string): Tokens`

Creates a tokens object from a refresh token, which can be passed to higher-level SDK methods. The SDK will handle refreshing the tokens for accessing relevant data.

### `ImageUploadOpts`

#### Properties

##### `images: EncodedImage[]`

Required. An array of `EncodedImage` objects representing images to upload.

### `EncodedImage`

#### Properties

##### `base64Image: string`

Required. The base64-encoded representation of the bytes representing the image. The image should be in one of the supported formats, such as JPEG or PNG.

##### `imageSubject: string`

Required. The subject of the image, such as `document_front`, `document_back`. See the [API documentation](https://docs.berbix.com/reference/uploadimages) for other supported values.

##### `format: string`

Optional. The format of the image. Acceptable values at time of writing are `"image/jpeg"` or `"image/jpg"` or `"image/png"`.
Reach out to success@berbix.com if you need support for another image format.

##### `supplementaryData:  {extractedBarcode: {barcodeType: string, extractedData: string}} | undefined`

Optional. If data has already been extracted from a barcode in the image, this property may be provided.
The only supported value for `barcodeType` as of writing is `pdf417`.
The `extractedData` property should hold the base64-encoded data that's been extracted from the barcode.

### `IssueDetails`

#### Properties

Some properties may not be present, even if the corresponding issue appears in `issues`.

##### `unsupportedIdType: {visaPageOfPassport: boolean | undefined} | undefined`

May be present if the `unsupported_id_type` issue appears in the `issues` array in the API response.
The `visaPageOfPassport` property will be present and set to `true` if Berbix believes that the image uploaded is of the
visa page of the passport, rather than the photo ID page Berbix expects.

## Publishing
```shell
npm publish
```

[flags-docs]: https://docs.berbix.com/docs/id-flags
[upload-docs]: https://docs.berbix.com/reference/uploadimages
