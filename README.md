# Berbix Node SDK

This Berbix Node library provides simple interfaces to interact with the Berbix API.

## Usage

### Constructing the client

    var berbix = require('berbix')

    var client = new berbix.Client({
      clientId: 'your_client_id_here',
      clientSecret: 'your_client_secret_here',
    })

### Fetching user tokens

    var userTokens = await client.exchangeCode(code)

### Fetching user data

    var user = await client.fetchUser(userTokens)

### User tokens from storage

    var refreshToken = '' // fetched from database
    var userTokens = new UserTokens(refreshToken)

### Extract refresh token for storage

    var refreshToken = userTokens.refreshToken
    // store the token to your database

### Create a continuation

    var continuation = await client.createContinuation(userTokens)
    // pass to the client to be provided to the Berbix JS SDK

### Creating a user

    var userTokens = client.createUser({
      email: "email@example.com", // previously verified email, if applicable
      phone: "+14155555555", // previously verified phone number, if applicable
      customerUid: "interal_customer_uid", // ID for the user in internal database
    })
