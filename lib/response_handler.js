var util = require('util');

/**
 * We don't want to return errors in many cases.  E.g., during an
 * index status check when the index doesn't exist, it returns IndexMissingException,
 * but we don't want to bubble up an error in that case. However, if a mapping is malformed
 * or a search query is malformed, we do want to respond with an error.
 * This is a bit hacky for sure, but the raw response is always returned as the third arg in
 * the callback if you need to do your own checking..
 */
var error_regexes = [
    /ElasticSearchException/,
    /ClassCastException/
];

function is_elasticsearch_error(parsed) {
    if (parsed && parsed.error) {
        for (var i = 0; i < error_regexes.length; i++) {
            if (error_regexes[i].test(parsed.error)) {
                return true;
            }
        }
    }
}

var response_handler = {
    parse_json: function (str) {
        try {
            var parsed = JSON.parse(str);
            return parsed;
        } catch (e) {
            return new Error('ElasticsearchError: Error parsing response' + util.inspect(e) + ': ' + str);
        }
    },

    handle: function (err, response, cb) {
        if (err) { return cb(err); }

        var parsed = this.parse_json(response);

        if (parsed instanceof Error) {
            return cb(parsed, null, response);
        }

        if (is_elasticsearch_error(parsed)) {
            return cb(new Error('ElasticsearchError: ' + parsed.error), null, response);
        }

        cb(null, parsed, response);
    }
};

module.exports = response_handler;
