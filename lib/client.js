var path = require('path');
var response_handler = require('./response_handler');
var validator = require('./validator');

function shallow_clone(object) {
    var ret = {};
    if (object) {
        Object.keys(object).forEach(function (val) {
            ret[val] = object[val];
        });
    }
    return ret;
}

var client_instance = function (args) {
    args = args || {};
    var self = {};

    self.protocol = args.protocol || 'http';
    self.host = args.host || 'localhost';
    self.port = args.port || 9200;
    self.url = self.protocol + '://' + self.host + ':' + self.port + '/';
    self.auth = args.auth;
    self.index = args.index;
    self.logging = args.logging;

    self.http_client = require('./http_client')({
        host: self.host,
        port: self.port,
        protocol: self.protocol,
        auth: self.auth,
        logging: self.logging
    });

    /**
     * @private
     */

    function merge_defaults(_args) {
        var merged_args = shallow_clone(_args);
        if (self.index) {
            merged_args.index = self.index;
        }

        return merged_args;
    }

    /**
     * @public
     */

    self.request = function (args, cb) {
        var err = validator.validate_args(args);
        if (err) { return cb(err); }

        var method = (args.method || 'GET').toLowerCase();

        var req_args = {
            path: args.path,
            params: args.params,
            body: args.body,
            auth: self.auth
        };

        self.http_client[method](req_args, function (err, body) {
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
            var err = validator.validate_args(args, ['index']);
            if (err) { return cb(err); }

            var req_args = {
                method: 'put',
                path: args.index,
                body: args.options
            };

            self.request(req_args, cb);
        },

        del: function (args, cb) {
            var err = validator.validate_args(args, ['index']);
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
        },

        mappings: {
            update: function (args, cb) {
                var err = validator.validate_args(args, ['index', 'type', 'mapping']);
                if (err) { return cb(err); }

                var req_args = {
                    method: 'put',
                    path: path.join(args.index, args.type, '_mapping'),
                    body: args.mapping
                };

                self.request(req_args, cb);
            },

            get: function (args, cb) {
                var err = validator.validate_args(args, ['index', 'type']);
                if (err) { return cb(err); }

                var req_args = {
                    method: 'get',
                    path: path.join(args.index, args.type, '_mapping')
                };

                self.request(req_args, cb);
            },

            del: function (args, cb) {
                var err = validator.validate_args(args, ['index', 'type']);
                if (err) { return cb(err); }

                var req_args = {
                    method: 'del',
                    path: path.join(args.index, args.type, '_mapping')
                };

                self.request(req_args, cb);
            }
        }
    };

    /**
     * Core client methods
     */
    self.core = {
        index: function (args, cb) {
            args = merge_defaults(args);
            var err = validator.validate_args(args, ['index', 'type', 'doc']);
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
            args = merge_defaults(args);
            var err = validator.validate_args(args, ['index', 'type', 'id']);
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

        del: function (args, cb) {
            args = merge_defaults(args);
            var err = validator.validate_args(args, ['index', 'type', 'id']);
            if (err) { return cb(err); }

            var req_args = {
                method: 'del',
                path: path.join(args.index, args.type) + '/' + args.id,
            };

            self.request(req_args, cb);
        },

        search: function (args, cb) {
            args = merge_defaults(args);

            var req_args = {
                method: 'post',
                path: path.join(args.index, args.type, '_search'),
                body: args.search
            };

            self.request(req_args, function (err, obj, raw) {
                if (err) { return cb(err); }
                if (obj.hits && obj.hits.total >= 1) {
                    var result = {};
                    result.ids = obj.hits.hits.map(function (row) { return row._id; });
                    result.objects = obj.hits.hits.map(function (row) { return row._source; });
                    result.total = obj.hits.total;
                    result.max_score = obj.hits.max_score;
                    cb(null, result, raw);
                } else {
                    if (raw) {
                        var error;

                        try {
                            var parsed = JSON.parse(raw);
                            if (parsed.error) {
                                var msg = 'ElasticsearchError: ' + parsed.error;
                                error = new Error(msg);
                            }
                        } catch (e) {
                            error = new Error('Elasticsearch: failed to parse JSON response');
                        }

                        if (error) {
                            return cb(error, [], raw);
                        }
                    }

                    cb(null, [], raw);
                }
            });
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
