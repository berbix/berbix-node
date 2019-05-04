var berbix = require('../lib/berbix');

var run = async function() {
  var client = new berbix.Client({
    clientId: process.env.BERBIX_DEMO_CLIENT_ID,
    clientSecret: process.env.BERBIX_DEMO_CLIENT_SECRET,
    apiHost: process.env.BERBIX_DEMO_API_HOST
  });

  var tokens = await client.createUser({ customerUid: 'this is a customer uid' });

  console.log(tokens);

  try {
    var continuation = await client.createContinuation(tokens);
    console.log(continuation);
  } catch (e) {
    console.log(e);
  }

  var fetchedTokens = await client.exchangeCode(process.env.BERBIX_DEMO_CODE);

  var toRefresh = new berbix.UserTokens(fetchedTokens.refreshToken);

  try {
    var user = await client.fetchUser(toRefresh);
  } catch (e) {
    console.log(e);
  }

  console.log(user);
}

run();
