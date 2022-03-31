const berbix = require("../lib/berbix");
const fs = require('fs');
const {EncodedImage} = require("../lib/berbix");

async function uploadPassport() {
  const client = createClient();
  try {
    const tokens = await client.createApiOnlyTransaction({
      customerUid: "example upload UID",
      templateKey: process.env.BERBIX_TEMPLATE_KEY,
      apiOnlyOpts: {idType: "P"}
    });

    const passportFilePath = process.env.BERBIX_EXAMPLE_PASSPORT_PATH;
    fs.readFile(passportFilePath, {encoding: "base64"}, async (err, data) => {
      if (err) {
        throw err;
      }

      try {
        const resp = await client.uploadImages(tokens, {
          images: [
            new EncodedImage(data, "document_front", "image/jpeg")
          ]
        });

        console.log("got response", resp)
        if (resp.nextStep === "done") {
          console.log("no more images expected, we're done")
        } else {
          console.log(`got nextStep === ${resp.nextStep}`)
        }
      } catch (e) {
        switch (e.status) {
          case 409:
            console.log("go a conflict error response", e)
            console.log(`unexpected state, nextStep: ${e.nextStep}`);
            break;
          default:
            console.log("got an error response", e)
        }
      }
    })
  } catch (e) {
    console.log(e);
  }
}

function createClient() {
  const client = new berbix.Client({
    apiSecret: process.env.BERBIX_DEMO_CLIENT_SECRET,
    apiHost: process.env.BERBIX_DEMO_API_HOST,
  });

  console.log("created client");
  return client;

}

async function createTranasctions() {
  console.log("starting...");
  const client = createClient()
  const templateKey = process.env.BERBIX_NON_API_ONLY_TEMPLATE_KEY;
  console.log("templateKey", templateKey);
  try {
    var tokens = await client.createTransaction({
      customerUid: "this is a customer uid",
      templateKey: templateKey,
    });
  } catch (e) {
    console.log(e);
    return;
  }

  console.log(tokens);
  try {
    var hostedTransactionResponse = await client.createHostedTransaction({
      customerUid: "this is a customer uid",
      templateKey: templateKey,
      hostedOptions: {},
    });
  } catch (e) {
    console.log(e);
    return;
  }

  console.log(hostedTransactionResponse);

  try {
    var fetchResponse = await client.fetchTransaction(tokens);
  } catch (e) {
    console.log(e);
    return;
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
}

try {
  console.log("starting example")
  uploadPassport();
} catch (e) {
  console.log("error thrown", e);
}
