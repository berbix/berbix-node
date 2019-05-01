# Berbix Node SDK

This Berbix Node library provides simple interfaces to interact with the Berbix API.

## Usage

### Constructing the client

    var berbix = require('berbix');

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
