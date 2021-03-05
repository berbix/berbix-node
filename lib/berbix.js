"use strict";

var https = require("https");
var url = require("url");
var crypto = require("crypto");

var SDK_VERSION = "0.0.14";
var CLOCK_DRIFT = 300;

function now() {
  return new Date().getTime() / 1000;
}

function HTTPClient() {}

HTTPClient.prototype.request = function (host, method, path, headers, data) {
  var base = url.parse(host);

  return new Promise(function (resolve, reject) {
    var request = https.request(
      {
        method: method,
        protocol: base.protocol,
        host: base.hostname,
        port: base.port,
        path: path,
        headers: headers,
        ciphers: "DEFAULT:!aNULL:!eNULL:!LOW:!EXPORT:!SSLv2:!MD5:!DES:!RC4",
      },
      function (res) {
        var body = "";

        res.on("data", function (chunk) {
          body += chunk;
        });

        res.on("end", function () {
          if (res.statusCode === 204) {
            resolve();
          } else if (res.statusCode < 200 || res.statusCode >= 300) {
            try {
              reject(JSON.parse(body));
            } catch (e) {
              reject({
                status: res.statusCode,
                error: "could not parse error response",
              });
            }
          } else {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject({ status: 200, error: "could not parse response" });
            }
          }
        });
      }
    );

    if (data != null) {
      request.write(data);
    }

    request.end();
  });
};

function HostedTransactionResponse(tokens, hosted_url) {
  this.tokens = tokens
  this.hosted_url = hosted_url
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

function Client(opts) {
  opts = opts || {};

  this.apiSecret = opts.apiSecret || opts.clientSecret;
  this.apiHost = opts.apiHost || 'https://api.berbix.com';
  this.httpClient = opts.httpClient || new HTTPClient();
}

Client.prototype._request = function (method, path, headers, payload = null) {
  var body = null;
  if (method == "POST" || method == "PATCH") {
    if (payload != null) {
      body = JSON.stringify(payload);
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(body);
    }
  }
  return this.httpClient.request(this.apiHost, method, path, headers, body);
};

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

Client.prototype.createTransaction = function (opts) {
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
  return this._fetchTokens("/v0/transactions", payload);
};

Client.prototype.createHostedTransaction = function(opts) {
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
  const tokens = this._fetchTokens("/v0/transactions", payload)
  return HostedTransactionResponse(tokens, tokens.response['hosted_url'])
}

// createUser is deprecated, please use createTransaction
Client.prototype.createUser = Client.prototype.createTransaction;

Client.prototype.refreshTokens = function (tokens) {
  return this._fetchTokens("/v0/tokens", {
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
  });
};

// exchangeCode is deprecated, please createTransaction prior to invoking client instead
Client.prototype.exchangeCode = function (code) {
  return this._fetchTokens("/v0/tokens", {
    grant_type: "authorization_code",
    code: code,
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

Client.prototype._tokenAuthRequest = async function (
  method,
  tokens,
  path,
  payload = null
) {
  await this._refreshIfNecessary(tokens);
  var headers = {
    Authorization: `Bearer ${tokens.accessToken}`,
    "User-Agent": "BerbixNode/" + SDK_VERSION,
  };
  return this._request(method, path, headers, payload);
};

Client.prototype.fetchTransaction = function (tokens) {
  return this._tokenAuthRequest("GET", tokens, "/v0/transactions");
};

Client.prototype.deleteTransaction = function (tokens) {
  return this._tokenAuthRequest("DELETE", tokens, "/v0/transactions");
};

Client.prototype.updateTransaction = function (tokens, params) {
  const payload = {};
  if (params.action != null) {
    payload.action = params.action;
  }
  if (params.note != null) {
    payload.note = params.note;
  }

  return this._tokenAuthRequest("PATCH", tokens, "/v0/transactions", payload);
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

  return this._tokenAuthRequest(
    "PATCH",
    tokens,
    "/v0/transactions/override",
    payload
  );
};

// fetchUser is deprecated, please use fetchTransaction
Client.prototype.fetchUser = Client.prototype.fetchTransaction;

// createContinuation is deprecated, please use clientToken from Tokens instead
Client.prototype.createContinuation = async function (tokens) {
  var result = await this._tokenAuthRequest(
    "POST",
    tokens,
    "/v0/continuations"
  );
  return result.value;
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

module.exports = {
  Tokens: Tokens,
  Client: Client,
  HostedTransactionResponse: HostedTransactionResponse
};
