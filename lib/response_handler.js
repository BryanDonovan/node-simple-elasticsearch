var util = require('util');

var response_handler = {
    parse_json: function (str) {
        try {
            var parsed = JSON.parse(str);
            return parsed;
        } catch (e) {
            return new Error('ElasticSearch: Error parsing response' + util.inspect(e));
        }
    },

    handle: function (err, response, cb) {
        if (err) { return cb(err); }

        response = this.parse_json(response);

        if (response instanceof Error) {
            return cb(response);
        }

        cb(null, response);
    }
};

module.exports = response_handler;
