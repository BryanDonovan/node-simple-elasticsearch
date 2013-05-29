var path = require('path');
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

var http_client = function (args) {
    var self = {};
    args = args || {};
    self.host = args.host || 'localhost';
    self.port = args.port || 80;
    self.protocol = args.protocol || 'http';
    self.auth = args.auth;
    self.timeout = args.timeout;
    self.logging = args.logging;
    if (self.logging) {
        self.logging.events = self.logging.events || ['response', 'request', 'args'];
        self.logging.level = self.logging.level || 'debug';
    }

    var client = null;
    if (self.protocol === 'http') {
        client = http;
    } else {
        client = https;
    }

    // To avoid multiple callbacks, wrap the original callback in a new one
    // that tracks whether the callback has already been called.
    function protected_callback(cb) {
        var called_back = false;
        var _cb = cb;
        cb = function () {
            if (!called_back) {
                called_back = true;
                _cb.apply(this, arguments);
            }
        };

        return cb;
    }

    function get_request_log_message(args, request) {
        var msg = '';

        if (request && request.method && request.path) {
            msg += 'Elasticsearch request: ' + request.method + ' ' +
                self.protocol + '://' +
                self.host + ':' + self.port +
                request.path;
            if (args.body) {
                msg += ' body: ' + args.body;
            }
        }

        return msg;
    }

    function get_response_log_message(response, response_body) {
        var msg = '';

        if (response && response_body) {
            msg += 'Elasticsearch response: ' + response.statusCode + ' ' + response_body;
        }

        return msg;
    }
    
    function get_args_log_message(args) {
        var msg = '';

        if (args) {
            msg += 'Elasticsearch args: ' + JSON.stringify(args);
        }

        return msg;
    }

    self.log_request = function (args, request) {
        if (self.logging && self.logging.events.indexOf('request') !== -1) {
            var msg = get_request_log_message(args, request);
            self.logging.logger[self.logging.level](msg);
        }
    };

    self.log_response = function (args, response) {
        if (self.logging && self.logging.events.indexOf('response') !== -1) {
            var msg = get_response_log_message(args, response);
            self.logging.logger[self.logging.level](msg);
        }
    };

    self.log_args = function (args) {
        if (self.logging && self.logging.events.indexOf('args') !== -1) {
            var msg = get_args_log_message(args);
            self.logging.logger[self.logging.level](msg);
        }
    };

    self.request = function (args, cb) {
        self.log_args(args);
        cb = protected_callback(cb);

        if (!args) {
            return cb(new Error('Elasticsearch error: args required in http client'));
        }

        var req_options = {
            path: path.join('/', append_params(args.path, args.params)),
            method: args.method || 'GET',
            host: self.host,
            port: self.port
        };

        var request = client.request(req_options);

        if (self.timeout) {
            request.setTimeout(self.timeout, function () {
                return cb(new Error('Elasticsearch request timed out (' + self.timeout + 'ms)'));
            });
        }

        request.on('error', function (error) {
            return cb(error);
        });

        request.on('response', function (response) {
            var body = '';

            response.on('data', function (chunk) {
                body += chunk;
            });

            response.on('end', function () {
                self.log_response(response, body);
                return cb(null, body);
            });

            response.on('error', function (error) {
                return cb(error);
            });
        });

        if (self.auth) {
            request.setHeader("Authorization", "Basic " + new Buffer(self.auth.username + ":" + self.auth.password).toString('base64'));
        }

        if (args.body || args.method === 'POST' || args.method === 'PUT' || args.method === 'DELETE') {
            if (typeof args.body !== 'string') {
                args.body = JSON.stringify(args.body);
            }

            args.body = args.body || '';

            request.setHeader('Content-Type', 'application/json');
            request.setHeader('Content-Length', Buffer.byteLength(args.body, 'utf8'));
            request.end(args.body);
            self.log_request(args, request);
        } else {
            request.end('');
            self.log_request(args, request);
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
