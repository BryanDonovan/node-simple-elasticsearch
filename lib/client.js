var path = require('path');
var request = require('request');
var response_handler = require('./response_handler');

var client_instance = function (args) {
    args = args || {};
    var self = {};
    self.indices = {};

    var protocol = args.protocol || 'http';
    self.url = protocol + '://' + args.host + ':' + args.port + '/';

    self.indices.status = function (args, cb) {
        args = args || {};
        var _path = path.join(args.index, '_status');

        var req_args = {
            url: self.url + _path
        };

        request.get(req_args, function (err, res, body) {
            response_handler.handle(err, body, cb);
        });
    };

    self.index = function (args, cb) {
        args = args || {};

        if (!args.doc) {
            return cb(new Error('Elasticsearch: error: index() requires a doc param'));
        }

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
        args = args || {};

        if (!args.id) {
            return cb(new Error('Elasticsearch error: get() requires an id param'));
        }

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
