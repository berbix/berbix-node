var berbix = require("../lib/berbix");

var run = async function () {
  console.log("starting...");
  var client = new berbix.Client({
    apiSecret: process.env.BERBIX_DEMO_CLIENT_SECRET,
    apiHost: process.env.BERBIX_DEMO_API_HOST,
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

  console.log(tokens);

  try {
    var hostedTransactionResponse = await client.createHostedTransaction({
      customerUid: "this is a customer uid",
      templateKey: "hi_6xP9A8y3Lzd2yoQFRRxlDZ_kqZAAP",
      hostedOptions: {
        completionEmail: "andrew@berbix.com",
      },
    });
  } catch (e) {
    console.log(e);
  }

  console.log(hostedTransactionResponse);

  try {
    var fetchResponse = await client.fetchTransaction(tokens);
  } catch (e) {
    console.log(e);
  }

  console.log(fetchResponse);

  try {
    console.log(await client.deleteTransaction(tokens));
    console.log(
      await client.deleteTransaction(hostedTransactionResponse.tokens)
    );
  } catch (e) {
    console.log(e);
  }
};

try {
  run();
} catch (e) {
  console.log("error thrown", e);
}
