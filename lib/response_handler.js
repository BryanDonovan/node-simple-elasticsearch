var util = require('util');

var response_handler = {
    parse_json: function (str) {
        try {
            var parsed = JSON.parse(str);
            return parsed;
        } catch (e) {
            return new Error('Elasticsearch: Error parsing response' + util.inspect(e) + ': ' + str);
        }
    },

    handle: function (err, response, cb) {
        if (err) { return cb(err); }

        var parsed = this.parse_json(response);

        if (parsed instanceof Error) {
            return cb(parsed, null, response);
        }

        cb(null, parsed, response);
    }
};

module.exports = response_handler;
