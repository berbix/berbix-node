"use strict";

const https = require("https");
const url = require("url");
const crypto = require("crypto");

const SDK_VERSION = "2.0.0-rc3";
const CLOCK_DRIFT = 300;
const TRANSACTIONS_ENDPOINT = "/v0/transactions"

function now() {
  return new Date().getTime() / 1000;
}

function optionsToPayloadObject(opts) {
  var payload = {};
  if (opts.email != null) {
    payload.email = opts.email;
  }
  if (opts.phone != null) {
    payload.phone = opts.phone;
  }
  if (opts.customerUid != null) {
    payload.customer_uid = "" + opts.customerUid;
  }
  if (opts.templateKey != null) {
    payload.template_key = opts.templateKey;
  }
  if (opts.consentsToAutomatedFacialRecognition) {
    payload.consents_to_automated_facial_recognition = true
  }

  if (opts.hostedOptions != null) {
    var hostedOptions = {};
    if (opts.hostedOptions.completionEmail != null) {
      hostedOptions.completion_email = opts.hostedOptions.completionEmail;
    }
    if (opts.hostedOptions.redirectUrl != null) {
      hostedOptions.redirect_url = opts.hostedOptions.redirectUrl;
    }
    payload.hosted_options = hostedOptions;
  }

  return payload;
}

function HTTPClient(httpClientOpts) {
  // Intentionally use != over !== to handle undefined
  if (httpClientOpts && httpClientOpts.timeoutMs != null) {
    this.timeoutMs = httpClientOpts.timeoutMs;
  }
}

// Returns a promise that resolves to a ParsedHttpResponse
HTTPClient.prototype.request = function (host, method, path, headers, data) {
  const base = url.parse(host);
  const client = this;

  let promises = [
    new Promise(function (resolve, reject) {
      let options = {
        method: method,
        protocol: base.protocol,
        host: base.hostname,
        port: base.port,
        path: path,
        headers: headers,
        ciphers: "DEFAULT:!aNULL:!eNULL:!LOW:!EXPORT:!SSLv2:!MD5:!DES:!RC4",
      };

      var request = https.request(
        options,
        function (res) {
          var body = "";

          res.on("data", function (chunk) {
            body += chunk;
          });

          res.on("end", function () {
            if (res.statusCode === 204) {
              resolve(new ParsedHttpResponse(res.statusCode, {}));
            } else {
              try {
                const parsedBody = JSON.parse(body);
                resolve(new ParsedHttpResponse(res.statusCode, parsedBody));
              } catch (e) {
                console.log(body);
                reject({status: res.statusCode, error: "could not parse response"});
              }
            }
          });
        }
      );

      if (data != null) {
        request.write(data);
      }

      request.end();
    }),
  ];
  let timeoutRef;
  if (client.timeoutMs != null) {
    promises.push(
      new Promise((resolve, reject) => {
        timeoutRef = setTimeout(() => {
            console.log(`timed out after ${client.timeoutMs} millis`);
            reject({status: null, error: "call timed out", timedOut: true});
          },
          client.timeoutMs);
      })
    )
  }

  return Promise.race(
    promises
  ).then((result) => {
    if (timeoutRef) {
      clearTimeout(timeoutRef);
    }
    return result;
  });
};

// statusCode is the HTTP status code.
function ParsedHttpResponse(statusCode, parsedBody) {
  this.statusCode = statusCode;
  this.parsedBody = parsedBody;
}

function Tokens(
  refreshToken,
  accessToken,
  clientToken,
  expiry,
  transactionId,
  response
) {
  this.refreshToken = refreshToken;
  this.accessToken = accessToken;
  this.clientToken = clientToken;
  this.expiry = expiry;
  this.transactionId = transactionId;
  this.response = response;
}

Tokens.prototype.refresh = function (
  accessToken,
  clientToken,
  expiry,
  transactionId
) {
  this.accessToken = accessToken;
  this.clientToken = clientToken;
  this.expiry = expiry;
  this.transactionId = transactionId;
};

Tokens.prototype.needsRefresh = function () {
  return this.accessToken == null || this.expiry == null || this.expiry < now();
};

Tokens.fromRefresh = function (refreshToken) {
  return new Tokens(refreshToken);
};

function TransactionResponse(tokens, hostedProperties) {
  this.tokens = tokens;
  this.hostedProperties = hostedProperties;
}

function Client(opts) {
  opts = opts || {};

  this.apiSecret = opts.apiSecret || opts.clientSecret;
  this.apiHost = opts.apiHost || "https://api.berbix.com";
  this.httpClient = opts.httpClient || new HTTPClient(opts.httpClientOpts);
}

Client.prototype._request = async function (method, path, headers, payload = null) {
  let body = null;
  if (method === "POST" || method === "PATCH") {
    if (payload != null) {
      body = JSON.stringify(payload);
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(body);
    }
  }
  let parsedHttpResponse = await this.httpClient.request(this.apiHost, method, path, headers, body);
  if (parsedHttpResponse.statusCode < 200 || parsedHttpResponse.statusCode >= 300) {
    throw {
      status: parsedHttpResponse.statusCode,
      error: "non-2XX response code",
      response: parsedHttpResponse.parsedBody
    };
  }

  return parsedHttpResponse.parsedBody;
}

Client.prototype._fetchTokens = async function (path, payload) {
  var headers = {
    Authorization:
      "Basic " + new Buffer.from(`${this.apiSecret}:`).toString("base64"),
    "User-Agent": "BerbixNode/" + SDK_VERSION,
  };
  var result = await this._request("POST", path, headers, payload);
  return new Tokens(
    result.refresh_token,
    result.access_token,
    result.client_token,
    now() + result.expires_in,
    result.transaction_id,
    result
  );
};

Client.prototype._createTransaction = async function (path, payload) {
  var headers = {
    Authorization:
      "Basic " + new Buffer.from(`${this.apiSecret}:`).toString("base64"),
    "User-Agent": "BerbixNode/" + SDK_VERSION,
  };
  var result = await this._request("POST", path, headers, payload);
  var tokens = new Tokens(
    result.refresh_token,
    result.access_token,
    result.client_token,
    now() + result.expires_in,
    result.transaction_id,
    result
  );
  return new TransactionResponse(tokens, {
    hosted_url: result["hosted_url"],
  });
};

Client.prototype.createTransaction = function (opts) {
  var payload = optionsToPayloadObject(opts);
  var txnPromise = this._createTransaction(TRANSACTIONS_ENDPOINT, payload);

  async function respTokens() {
    var txnRes = await txnPromise;
    return txnRes.tokens;
  }

  return respTokens();
};

Client.prototype.createApiOnlyTransaction = function (opts) {
  var payload = optionsToPayloadObject(opts);
  var apiOnlyPayloadOpts = {};
  if (opts.apiOnlyOpts) {
    if (opts.apiOnlyOpts.idCountry) {
      apiOnlyPayloadOpts.id_country = opts.apiOnlyOpts.idCountry;
    }
    if (opts.apiOnlyOpts.idType) {
      apiOnlyPayloadOpts.id_type = opts.apiOnlyOpts.idType;
    }
  }
  payload.api_only_options = apiOnlyPayloadOpts;
  var txnPromise = this._createTransaction(TRANSACTIONS_ENDPOINT, payload);

  async function apiOnlyResp() {
    var txnRes = await txnPromise;
    return txnRes.tokens;
  }

  return apiOnlyResp();
}

Client.prototype.createHostedTransaction = function (opts) {
  var payload = optionsToPayloadObject(opts);
  var txnPromise = this._createTransaction(TRANSACTIONS_ENDPOINT, payload);

  async function hostedResp() {
    var txnRes = await txnPromise
    return {tokens: txnRes.tokens, hostedUrl: txnRes.hostedProperties["hosted_url"]}
  }

  return hostedResp();
};

Client.prototype.refreshTokens = function (tokens) {
  return this._fetchTokens("/v0/tokens", {
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
  });
};

Client.prototype._refreshIfNecessary = async function (tokens) {
  if (tokens.needsRefresh()) {
    var refreshed = await this.refreshTokens(tokens);
    tokens.refresh(
      refreshed.accessToken,
      refreshed.clientToken,
      refreshed.expiry,
      refreshed.transactionId
    );
  }
};

// returns a ParsedHttpRequest, or throws an object with 'status', 'response', and 'error' properties
Client.prototype._tokenAuthRequest = async function (
  method,
  tokens,
  useClientToken,
  path,
  payload = null) {
  const headers = await this._getTokenHeaders(tokens, useClientToken);
  return this._request(method, path, headers, payload);
};

Client.prototype._getTokenHeaders = async function (tokens, useClientToken = false) {
  await this._refreshIfNecessary(tokens);
  const tokenForHeader = useClientToken ? tokens.clientToken : tokens.accessToken;
  return {
    Authorization: `Bearer ${tokenForHeader}`,
    "User-Agent": "BerbixNode/" + SDK_VERSION,
  };
}

Client.prototype.fetchTransaction = function (tokens) {
  return this._tokenAuthRequest("GET", tokens, false, TRANSACTIONS_ENDPOINT, null);
};

Client.prototype.deleteTransaction = function (tokens) {
  return this._tokenAuthRequest("DELETE", tokens, false, TRANSACTIONS_ENDPOINT, null);
};

Client.prototype.updateTransaction = function (tokens, params) {
  const payload = {};
  if (params.action != null) {
    payload.action = params.action;
  }
  if (params.note != null) {
    payload.note = params.note;
  }

  return this._tokenAuthRequest("PATCH", tokens, false, TRANSACTIONS_ENDPOINT, payload);
};

Client.prototype.overrideTransaction = function (tokens, params) {
  const payload = {};
  if (params.responsePayload != null) {
    payload.response_payload = params.responsePayload;
  }
  if (params.flags != null) {
    payload.flags = params.flags;
  }
  if (params.overrideFields != null) {
    payload.override_fields = params.overrideFields;
  }

  return this._tokenAuthRequest("PATCH", tokens, false, "/v0/transactions/override", payload);
};

Client.prototype.validateSignature = function (secret, body, header) {
  var hmac = crypto.createHmac("sha256", secret);
  var parts = header.split(",");
  // Version is currently unused in parts[0]
  var timestamp = parts[1];
  var signature = parts[2];
  if (parseInt(timestamp, 10) < new Date() / 1000 - CLOCK_DRIFT) {
    return false;
  }
  hmac.update(timestamp);
  hmac.update(",");
  hmac.update(secret);
  hmac.update(",");
  hmac.update(body);
  var digest = hmac.digest("hex");
  return digest === signature;
};

function EncodedImage(
  base64Image, // string -- base64-encoded representation of the image file
  imageSubject, // string
  format, // string
  supplementaryData // {extractedBarcode: {barcodeType: string, extractedData: string} } | undefined
) {
  this.base64Image = base64Image;
  this.imageSubject = imageSubject;
  this.format = format;
  this.supplementaryData = supplementaryData;
}

function ImageUploadOpts(
  images // EncodedImage[]
) {
  this.images = images;
}

// Callers should check the "status" property of objects that are thrown, as some 4XX codes can indicate
Client.prototype._upload = async function (tokens, uploadEndpoint, payload) {
  try {
    const resp = await this._tokenAuthRequest("POST", tokens, true, uploadEndpoint, payload);
    return adaptUploadResponse(resp)
  } catch (e) {
    // Convert 409 properties to camelcase
    // Other 4xx responses use properties that only have a single word as the name, so don't need conversion.
    switch (e.status) {
      case 409:
        throw {
          ...e,
          // Assume the API has a more useful message than the default "non-2XX" message
          error: e.response.message,
          nextStep: e.response.next_step,
        }
      default:
        throw e
    }
  }
}

// different types of invalid input.
Client.prototype.uploadImages = async function (tokens, uploadImageOpts) {
  if (!tokens) {
    throw new Error("must provide tokens to uploadImages()")
  }
  if (!uploadImageOpts || !uploadImageOpts.images || !Array.isArray(uploadImageOpts.images)) {
    throw new Error("must provide uploadImageOpts, with the images property set, to uploadImages()")
  }

  const imageDatas = uploadImageOpts.images.map((img) => {
    const imageData = {
      data: img.base64Image,
      image_subject: img.imageSubject,
      format: img.format
    }

    if (img.supplementaryData) {
      let supData = {};
      if (img.supplementaryData.extractedBarcode) {
        supData.extracted_barcode = {
          barcode_type: img.supplementaryData.extractedBarcode.barcodeType,
          extracted_data: img.supplementaryData.extractedBarcode.extractedData,
        };
      }

      imageData.supplementary_data = supData;
    }

    return imageData;
  });

  const payload = {
    images: imageDatas,
  }
  const uploadEndpoint = "/v0/images/upload";
  return await this._upload(tokens, uploadEndpoint, payload);
}

Client.prototype.uploadIdScan = async function (tokens, idScanOpts) {
  if (!tokens) {
    throw new Error("must provide tokesn to scanId()");
  }

  if (!idScanOpts.idScans) {
    throw new Error("must provide idScans to scandId()");
  }

  const idScans = idScanOpts.idScans.map(is => (
    {
      scan_type: is.scanType,
      extracted_data: is.extractedData,
    }
  ));

  const payload = {
    id_scans: idScans
  };

  const uploadEndpoint = "/v0/idscans/upload"
  return await this._upload(tokens, uploadEndpoint, payload);
}

// Convert an ImageUploadResponse or IDScanUploadResponse from the API into an object with camel-cased
function adaptUploadResponse(uploadRes) {
  let result = {
    nextStep: uploadRes.next_step,
  }

  if (uploadRes.issues) {
    result.issues = uploadRes.issues;
  }

  if (uploadRes.issue_details) {
    result.issueDetails = new IssueDetails(uploadRes.issue_details);
  }

  return result;
}

function IssueDetails(issuesDetailsFromApi) {
  if (issuesDetailsFromApi.unsupported_id_type) {
    this.unsupportedIdType = {};
    if (issuesDetailsFromApi.unsupported_id_type.visa_page_of_passport !== undefined) {
      this.unsupportedIdType.visaPageOfPassport =
        issuesDetailsFromApi.unsupported_id_type.visa_page_of_passport;
    }
  }
}

module.exports = {
  Tokens: Tokens,
  Client: Client,
  EncodedImage: EncodedImage,
  ImageUploadOpts: ImageUploadOpts,
  IssueDetails: IssueDetails,
};
