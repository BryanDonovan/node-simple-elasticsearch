var http = require('http');
var https = require('https');
var qs = require('qs');

function append_params(path, params) {
    if (path && params && Object.keys(params).length > 0) {
        if (!path.match(/\?/)) {
            path += "?";
        } else {
            path += "&";
        }
        path += qs.stringify(params);
    }
    return path;
}

//
// TODO: handle timeouts.
//

var http_client = function (args) {
    var self = {};
    args = args || {};
    self.host = args.host || 'localhost';
    self.port = args.port || 80;
    self.protocol = args.protocol || 'http';
    self.auth = args.auth;

    var client = null;
    if (self.protocol === 'http') {
        client = http;
    } else {
        client = https;
    }

    self.request = function (args, cb) {
        var called_back = false;
        if (!args) {
            return cb(new Error('Elasticsearch error: args required in http client'));
        }

        var req_options = {
            path: append_params(args.path, args.params),
            method: args.method || 'GET',
            host: self.host,
            port: self.port
        };

        var request = client.request(req_options);

        request.on('error', function (error) {
            if (!called_back) {
                called_back = true;
                return cb(error);
            }
        });

        request.on('response', function (response) {
            var body = "";

            response.on('data', function (chunk) {
                body += chunk;
            });

            response.on('end', function () {
                if (!called_back) {
                    called_back = true;
                    return cb(null, body);
                }
            });

            response.on('error', function (error) {
                if (!called_back) {
                    called_back = true;
                    return cb(error);
                }
            });
        });

        // TODO: need to test that this works
        if (self.auth) {
            request.setHeader("Authorization", "Basic " + new Buffer(self.auth.username + ":" + self.auth.password).toString('base64'));
        }

        if (args.body) {
            if (typeof args.body !== 'string') {
                args.body = JSON.stringify(args.body);
            }
            request.setHeader('Content-Type', 'application/json');
            request.setHeader('Content-Length', Buffer.byteLength(args.body, 'utf8'));
            request.end(args.body);
        } else {
            request.end('');
        }
    };

    self.get = function (args, cb) {
        args.method = 'GET';
        self.request(args, cb);
    };

    self.post = function (args, cb) {
        args.method = 'POST';
        self.request(args, cb);
    };

    self.put = function (args, cb) {
        args.method = 'PUT';
        self.request(args, cb);
    };

    self.del = function (args, cb) {
        args.method = 'DELETE';
        self.request(args, cb);
    };

    return self;
};

module.exports = http_client;
