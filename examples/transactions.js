var berbix = require("../lib/berbix");

var run = async function () {
  console.log("starting...");
  var client = new berbix.Client({
    apiSecret: process.env.BERBIX_DEMO_CLIENT_SECRET,
    apiHost: process.env.BERBIX_DEMO_API_HOST,
    //environment: 'sandbox',
  });

  console.log("created client");

  try {
    var tokens = await client.createTransaction({
      customerUid: "this is a customer uid",
      templateKey: "hi_6xP9A8y3Lzd2yoQFRRxlDZ_kqZAAP",
    });
  } catch (e) {
    console.log(e);
  }

  try {
    var tokens = await client.createTransaction({
      customerUid: "this is a customer uid",
      templateKey: "hi_6xP9A8y3Lzd2yoQFRRxlDZ_kqZAAP",
      hostedOptions: {
        completion_email: "eric@berbix.com",
      },
    });
  } catch (e) {
    console.log(e);
  }

  console.log(tokens);

  try {
    var continuation = await client.createContinuation(tokens);
    console.log(continuation);
  } catch (e) {
    console.log(e);
  }

  var fetchedTokens = await client.exchangeCode(process.env.BERBIX_DEMO_CODE);

  console.log(fetchedTokens);

  var toRefresh = new berbix.Tokens.fromRefresh(fetchedTokens.refreshToken);

  try {
    var transaction = await client.fetchTransaction(toRefresh);
  } catch (e) {
    console.log(e);
  }

  console.log(transaction);

  try {
    console.log(await client.deleteTransaction(tokens));
  } catch (e) {
    console.log(e);
  }
};

try {
  run();
} catch (e) {
  console.log("error thrown", e);
}
