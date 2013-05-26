var path = require('path');
var request = require('request');
var response_handler = require('./response_handler');

function assert_valid_args(args, required_args) {
    if (!args) {
        return new Error('Elasticsearch error: args required');
    }

    if (Array.isArray(required_args)) {
        for (var i = 0; i < required_args.length; i++) {
            var arg = required_args[i];
            if (!args.hasOwnProperty(arg)) {
                return new Error('Elasticsearch error - missing arg: ' + arg);
            }
        }
    }
}

var client_instance = function (args) {
    args = args || {};
    var self = {};
    self.indices = {};

    var protocol = args.protocol || 'http';
    self.url = protocol + '://' + args.host + ':' + args.port + '/';

    /**
     * Admin index methods
     */
    self.indices.status = function (args, cb) {
        if (typeof args === 'function') {
            cb = args;
            args = {};
        }

        args = args || {};
        var _path = path.join(args.index, '_status');

        var req_args = {
            url: self.url + _path
        };

        request.get(req_args, function (err, res, body) {
            response_handler.handle(err, body, cb);
        });
    };

    self.indices.create = function (args, cb) {
        var err = assert_valid_args(args, ['index']);
        if (err) { return cb(err); }

        var req_args = {
            url: self.url + args.index
        };

        request.put(req_args, function (err, res, body) {
            response_handler.handle(err, body, cb);
        });
    };

    self.indices.del = function (args, cb) {
        var err = assert_valid_args(args, ['index']);
        if (err) { return cb(err); }

        var req_args = {
            url: self.url + args.index
        };

        request.del(req_args, function (err, res, body) {
            response_handler.handle(err, body, cb);
        });
    };

    /**
     * Main client methods
     */
    self.index = function (args, cb) {
        var err = assert_valid_args(args, ['doc']);
        if (err) { return cb(err); }

        var method = args.id ? 'put' : 'post';

        var req_args = {
            url: self.url + path.join(args.index, args.type),
            body: JSON.stringify(args.doc)
        };

        if (args.id) {
            req_args.url += '/' + args.id;
        }

        request[method](req_args, function (err, res, body) {
            response_handler.handle(err, body, cb);
        });
    };

    self.get = function (args, cb) {
        var err = assert_valid_args(args, ['id']);
        if (err) { return cb(err); }

        var req_args = {
            url: self.url + path.join(args.index, args.type) + '/' + args.id,
        };

        request.get(req_args, function (err, res, body) {
            response_handler.handle(err, body, function (err, obj, raw) {
                if (err) { return cb(err); }
                if (!obj._source) {
                    return cb(null, null, raw);
                }
                cb(null, obj._source, raw);
            });
        });
    };

    return self;
};

var client = {
    create: function (args) {
        return client_instance(args);
    }
};

module.exports = client;
