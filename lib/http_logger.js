function http_logger(http_client) {
    var self = {};
    self.logging = http_client.logging;

    if (self.logging) {
        self.logging.events = self.logging.events || ['response', 'request', 'args'];
        self.logging.level = self.logging.level || 'debug';
    }

    function get_request_message(args, request) {
        var msg = '';

        if (request && request.method && request.path) {
            msg += 'Elasticsearch request: ' + request.method + ' ' +
                http_client.protocol + '://' +
                http_client.host + ':' + http_client.port +
                request.path;
            if (args.body) {
                msg += ' body: ' + args.body;
            }
        }

        return msg;
    }

    function get_response_message(response, response_body) {
        var msg = '';

        if (response && response_body) {
            msg += 'Elasticsearch response: ' + response.statusCode + ' ' + response_body;
        }

        return msg;
    }
    
    function get_args_message(args) {
        var msg = '';

        if (args) {
            msg += 'Elasticsearch args: ' + JSON.stringify(args);
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

    self.log_args = function (args) {
        if (self.logging && self.logging.events.indexOf('args') !== -1) {
            var msg = get_args_message(args);
            self.logging.logger[self.logging.level](msg);
        }
    };

    return self;
}

module.exports = http_logger;
