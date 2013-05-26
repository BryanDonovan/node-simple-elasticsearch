var path = require('path');
var http_client = require('./http_client');
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

    var protocol = args.protocol || 'http';
    // TODO: handle defaults
    self.url = protocol + '://' + args.host + ':' + args.port + '/';


    self.request = function (args, cb) {
        var err = assert_valid_args(args);
        if (err) { return cb(err); }

        var method = (args.method || 'GET').toLowerCase();

        var req_args = {
            url: self.url + args.path,
            qs: args.qs,
            body: args.body ? JSON.stringify(args.body) : null
        };

        http_client[method](req_args, function (err, res, body) {
            response_handler.handle(err, body, cb);
        });
    };

    /**
     * Admin index methods
     */
    self.indices = {
        status: function (args, cb) {
            if (typeof args === 'function') {
                cb = args;
                args = {};
            }

            args = args || {};
            var _index = args.index;

            if (Array.isArray(args.indices)) {
                _index = args.indices.join(',');
            }
            var req_args = {
                path: path.join(_index, '_status')
            };

            self.request(req_args, cb);
        },

        create: function (args, cb) {
            var err = assert_valid_args(args, ['index']);
            if (err) { return cb(err); }

            var req_args = {
                method: 'put',
                path: args.index,
                body: args.options
            };

            self.request(req_args, cb);
        },

        del: function (args, cb) {
            var err = assert_valid_args(args, ['index']);
            if (err) { return cb(err); }

            var req_args = {
                method: 'del',
                path: args.index
            };

            self.request(req_args, cb);
        },

        refresh: function (args, cb) {
            if (typeof args === 'function') {
                cb = args;
                args = {};
            }

            args = args || {};
            var _index = args.index;

            if (Array.isArray(args.indices)) {
                _index = args.indices.join(',');
            }

            var req_args = {
                method: 'post',
                path: path.join(_index, '_refresh')
            };

            self.request(req_args, cb);
        }
    };

    /**
     * Core client methods
     */
    self.core = {
        index: function (args, cb) {
            var err = assert_valid_args(args, ['index', 'type', 'doc']);
            if (err) { return cb(err); }

            var req_args = {
                method: args.id ? 'put' : 'post',
                path: path.join(args.index, args.type),
                body: args.doc
            };

            if (args.id) {
                req_args.path += '/' + args.id;
            }

            self.request(req_args, cb);
        },

        get: function (args, cb) {
            var err = assert_valid_args(args, ['index', 'type', 'id']);
            if (err) { return cb(err); }

            var req_args = {
                path: path.join(args.index, args.type) + '/' + args.id,
            };

            self.request(req_args, function (err, obj, raw) {
                if (err) { return cb(err); }
                if (!obj._source) {
                    return cb(null, null, raw);
                }
                cb(null, obj._source, raw);
            });
        },

        search: function (args, cb) {
            var err = assert_valid_args(args);
            if (err) { return cb(err); }
            var req_args = {
                method: 'post',
                path: path.join(args.index, args.type, '_search'),
                body: args.query
            };

            self.request(req_args, cb);
        }
    };

    return self;
};

var client = {
    create: function (args) {
        return client_instance(args);
    }
};

module.exports = client;
