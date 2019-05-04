'use strict';

var https = require('https');
var url = require('url');


function now() {
  return new Date().getTime() / 1000;
}


function HTTPClient() {}

HTTPClient.prototype.request = function(host, method, path, headers, data) {
  var base = url.parse(host);

  return new Promise(function(resolve, reject) {
    var request = https.request({
      method: method,
      protocol: base.protocol,
      host: base.hostname,
      port: base.port,
      path: path,
      headers: headers,
      ciphers: 'DEFAULT:!aNULL:!eNULL:!LOW:!EXPORT:!SSLv2:!MD5:!DES:!RC4',
    }, function(res) {
      var body = '';

      res.on('data', function(chunk) {
        body += chunk;
      });

      res.on('end', function() {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          try {
            reject(JSON.parse(body));
          } catch (e) {
            reject({ status: res.statusCode, error: 'could not parse error response' });
          }
        } else {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject({ status: 200, error: 'could not parse response' });
          }
        }
      });
    });

    if (data != null) {
      request.write(data);
    }

    request.end();
  });
}


function UserTokens(refreshToken, accessToken, expiry) {
  this.refreshToken = refreshToken;
  this.accessToken = accessToken;
  this.expiry = expiry;
};

UserTokens.prototype.refresh = function(accessToken, expiry) {
  this.accessToken = accessToken;
  this.expiry = expiry;
};

UserTokens.prototype.needsRefresh = function() {
  return this.accessToken == null || this.expiry == null || this.expiry < now();
};


function Client(opts) {
  opts = opts || {};

  this.clientId = opts.clientId;
  this.clientSecret = opts.clientSecret;
  this.apiHost = opts.apiHost || 'https://api.berbix.com';
  this.httpClient = opts.httpClient || new HTTPClient();
};

Client.prototype._request = function(method, path, headers, data) {
  return this.httpClient.request(this.apiHost, method, path, headers, data);
};

Client.prototype.post = function(path, headers, payload) {
  var data = null;
  if (payload != null) {
    data = JSON.stringify(payload);
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(data);
  }

  return this._request('POST', path, headers, data);
}

Client.prototype._fetchTokens = async function(path, payload) {
  var headers = {
    Authorization: 'Basic ' + new Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64'),
  };
  var result = await this.post(path, headers, payload);
  return new UserTokens(result.refresh_token, result.access_token, now() + result.expires_in);
};

Client.prototype.createUser = function(opts) {
  var payload = {};
  if (opts.email != null) {
    payload.email = opts.email;
  }
  if (opts.phone != null) {
    payload.phone = opts.phone;
  }
  if (opts.customerUid != null) {
    payload.customer_uid = opts.customerUid;
  }
  return this._fetchTokens('/v0/users', payload);
};

Client.prototype.refreshTokens = function(userTokens) {
  return this._fetchTokens('/v0/tokens', {
    grant_type: 'refresh_token',
    refresh_token: userTokens.refreshToken,
  });
};

Client.prototype.exchangeCode = function(code) {
  return this._fetchTokens('/v0/tokens', {
    grant_type: 'authorization_code',
    code: code,
  });
};

Client.prototype._refreshIfNecessary = async function(userTokens) {
  if (userTokens.needsRefresh()) {
    var refreshed = await this.refreshTokens(userTokens);
    userTokens.refresh(refreshed.accessToken, refreshed.expiry);
  }
};

Client.prototype._tokenAuthRequest =  async function(method, userTokens, path) {
  await this._refreshIfNecessary(userTokens);
  var headers = {
    Authorization: `Bearer ${userTokens.accessToken}`,
  }; 
  return this._request(method, path, headers, null);
};

Client.prototype.fetchUser = function(userTokens) {
  return this._tokenAuthRequest('GET', userTokens, '/v0/users');
};

Client.prototype.createContinuation = async function(userTokens) {
  var result = await this._tokenAuthRequest('POST', userTokens, '/v0/continuations');
  return result.value;
};


module.exports = {
  UserTokens: UserTokens,
  Client: Client,
};
