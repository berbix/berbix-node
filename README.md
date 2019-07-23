# Berbix Node SDK

This Berbix Node library provides simple interfaces to interact with the Berbix API.

## Installation

If you are using NPM for package management

    npm install berbix

If you are using Yarn for package management

    yarn add berbix

## Usage

### Constructing a client

    // Import the Berbix Node library
    var berbix = require('berbix');

    // Construct the client, providing at least clientId and clientSecret
    var client = new berbix.Client({
      clientId: 'your_client_id_here',
      clientSecret: 'your_client_secret_here',
      environment: 'production',
    })

### Create a transaction

    var transactionTokens = client.createTransaction({
      customerUid: "interal_customer_uid", // ID for the user in internal database
      templateKey: "your_template_key", // Template key for this transaction
    })

### Create tokens from refresh token

    // Load refresh token from database
    var transactionTokens = berbix.Tokens.fromRefresh(refreshToken)

### Fetch transaction data

    var transactionData = await client.fetchTransaction(transactionTokens)
 
## Reference

### `Client`

#### Methods

##### `constructor(options)`

Supported options:

 * `clientId` (required) - The client ID that can be found in your Berbix Dashboard.
 * `clientSecret` (required) - The client secret that can be found in your Berbix Dashboard.
 * `environment` - Which environment the client uses, defaults to production.
 * `httpClient` - An optional override for the default Node HTTP client.

##### `createTransaction(options): Tokens`

Creates a transaction within Berbix to initialize the client SDK. Typically after creating
a transaction, you will want to store the refresh token in your database associated with the
currently active user session.

Supported options:

 * `email` - Previously verified email address for a user.
 * `phone` - Previously verified phone number for a user.
 * `customerUid` - An ID or identifier for the user in your system.
 * `templateKey` - The template key for this transaction.

##### `fetchTransaction(tokens: Tokens): object`

Fetches all of the information associated with the transaction. If the user has already completed the steps of the transaction, then this will include all of the elements of the transaction payload as described on the [Berbix developer docs](https://developers.berbix.com).

##### `refreshTokens(tokens: Tokens): void`

This is typically not needed to be called explicitly as it will be called by the higher-level
SDK methods, but can be used to get fresh client or access tokens.

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

##### `expiry: Date`

The time at which the access and client tokens will expire.

#### Static methods

##### `fromRefresh(refreshToken: string): Tokens`

Creates a tokens object from a refresh token, which can be passed to higher-level SDK methods. The SDK will handle refreshing the tokens for accessing relevant data.

## Publishing

    npm publish
