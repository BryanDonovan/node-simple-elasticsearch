var path = require('path');
var request = require('request');
var response_handler = require('./response_handler');

var client_instance = function (args) {
    args = args || {};
    var self = {};
    var protocol = args.protocol || 'http';

    self.url = protocol + '://' + args.host + ':' + args.port + '/';

    self.index = function (args, cb) {
        args = args || {};

        var method = args.id ? 'PUT' : 'POST';

        var req_args = {
            method: method,
            url: self.url + path.join(args.index, args.type),
            body: JSON.stringify(args.doc)
        };

        if (args.id) {
            req_args.url += '/' + args.id;
        }

        request(req_args, function (err, res, body) {
            response_handler.handle(err, body, cb);
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
