var qs = require('qs');

function http_logger(http_client) {
    var self = {};
    self.logging = http_client.logging;
    self.protocol_and_host = http_client.protocol + '://' + http_client.host + ':' + http_client.port;

    if (self.logging) {
        self.logging.events = self.logging.events || ['response', 'request'];
        self.logging.level = self.logging.level || 'debug';
        self.logging.formatters = http_client.logging.formatters || {};
        self.logging.formatters.request = self.logging.formatters.request || 'plain';
    }

    var request_formatters = {
        plain: function (args, request) {
            var msg = '';

            if (request && request.method && request.path) {
                msg += 'Elasticsearch request: ' + request.method + ' ' +
                    self.protocol_and_host + request.path;
                if (args.body) {
                    msg += ' body: ' + args.body;
                }
            }

            return msg;
        },

        curl: function (args, request) {
            var msg = '';

            if (request && request.method && request.path) {
                var full_url = self.protocol_and_host + request.path;
                var method = request.method;
                msg += '\n\ncurl';

                if (method === 'HEAD') {
                    msg += ' -i ';
                } else {
                    msg += ' -X' + method;
                }

                msg += ' "' + full_url + '"';

                if (request._headers) {
                    msg += ' ';
                    var headers = [];
                    Object.keys(request._headers).forEach(function (key) {
                        if (key !== 'host') {
                            headers.push('-H "' + key + ': ' + request._headers[key] + '"');
                        }
                    });
                    msg += headers.join(' ');
                }

                if (args.body) {
                    if (typeof args.body === 'object') {
                        msg += ' -d "' + qs.stringify(args.body) + '"';
                    } else {
                        msg += " -d '" + args.body + "'";
                    }
                }
            }

            return msg;
        }
    };

    function get_request_message(args, request) {
        return request_formatters[self.logging.formatters.request](args, request);
    }

    function get_response_message(response, response_body) {
        var msg = '';

        if (response && response_body) {
            msg += 'Elasticsearch response: ' + response.statusCode + ' ' + response_body;
        }

        return msg;
    }
    
    self.log_request = function (args, request) {
        if (self.logging && self.logging.events.indexOf('request') !== -1) {
            var msg = get_request_message(args, request);
            self.logging.logger[self.logging.level](msg);
        }
    };

    self.log_response = function (args, response) {
        if (self.logging && self.logging.events.indexOf('response') !== -1) {
            var msg = get_response_message(args, response);
            self.logging.logger[self.logging.level](msg);
        }
    };

    return self;
}

module.exports = http_logger;
