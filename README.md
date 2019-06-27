# Berbix Node SDK

This Berbix Node library provides simple interfaces to interact with the Berbix API.

## Usage

### Typical workflow

#### Prior to user interaction

In your backend server, you will create a transaction for a given user session. This will
enable Berbix to associate the transaction with a given user for future reference.

    // Import the Berbix Node library
    var berbix = require('berbix');

    // Construct the client, providing at least clientId and clientSecret
    var client = new berbix.Client({
      clientId: 'your_client_id_here',
      clientSecret: 'your_client_secret_here',
      environment: 'production',
    });

    // Create a transaction
    var transactionTokens = client.createTransaction({
      customerUid: "interal_customer_uid", // ID for the user in internal database
    })

    // Save the refresh token in your database row associated with the user session
    // saveRefreshToken(transactionTokens.refreshToken);

    // Send the client token to the client to start the Berbix flow
    // sendToClient(transactionTokens.clientToken);

At this point, you instantiate one of the Berbix clients with the `clientToken`. Once
that user has completed the Berbix flow, a completion callback handler will fire, letting
you know that the user has finished the flow.

#### After user interaction

Once the callback handler is fired, you can trigger a request to your backend to fetch the
transaction data. This data is available immediately upon completion of the Berbix flow.

    // Load refresh token from the database for this user session
    // var refreshToken = loadRefreshToken();

    // Construct tokens from the refresh token
    var transactionTokens = new Tokens(refreshToken);

    // Once user has completed the flow, fetch the transaction data
    var transactionData = await client.fetchTransaction(transactionTokens)

    // Process transaction data

## Publishing

    npm publish
