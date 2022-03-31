const berbix = require("../lib/berbix");
const fs = require('fs');
const {EncodedImage} = require("../lib/berbix");

async function uploadBarcodeWithSupplement() {
  const client = createClient();
  try {
    const tokens = await client.createApiOnlyTransaction({
      customerUid: "example barcode UID",
      templateKey: process.env.BERBIX_BARCODE_SCAN_TEMPLATE_KEY,
      apiOnlyOpts: {idType: "DL"},
    });

    const driverLicenseFilePath = process.env.BERBIX_EXAMPLE_DL_PATH;
    const supplementaryData = {
      extractedBarcode: {
        barcodeType: 'pdf417',
        extractedData: process.env.BERBIX_EXAMPLE_BARCODE_PAYLOAD
      }
    }
    const dlData = fs.readFileSync(driverLicenseFilePath, {encoding: "base64"})
    await upload(client, tokens, "document_barcode", dlData, supplementaryData)
  } catch(e) {
    console.log(e);
  }
}

async function uploadPassportAndSelfie() {
  const client = createClient();
  try {
    const tokens = await client.createApiOnlyTransaction({
      customerUid: "example upload UID",
      templateKey: process.env.BERBIX_TEMPLATE_KEY,
      apiOnlyOpts: {idType: "P"},
      // Requires using a template that has been configured to allow biometric consent to be
      // sent via API.
      consentsToAutomatedFacialRecognition: true,
    });

    const passportFilePath = process.env.BERBIX_EXAMPLE_PASSPORT_PATH;
    const selfiePath = process.env.BERBIX_EXAMPLE_SELFIE_PATH;
    const passportData = fs.readFileSync(passportFilePath, {encoding: "base64"})
    const selfieData = fs.readFileSync(selfiePath, {encoding: "base64"})
    await upload(client, tokens, "document_front", passportData)
    await upload(client, tokens, "selfie_front", selfieData)
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

async function upload(client, tokens, subject, data, supplementaryData) {
  try {
    const resp = await client.uploadImages(tokens, {
      images: [
        new EncodedImage(data, subject, "image/jpeg", supplementaryData)
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
}

async function createTransactions() {
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
  uploadBarcodeWithSupplement();
} catch (e) {
  console.log("error thrown", e);
}
