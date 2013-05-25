var util = require('util');
require('../../index');

module.exports = {
    random: require('./random'),
    walk_dir: require('./walk_dir'),

    shallow_clone: function (object) {
        var ret = {};
        if (object) {
            Object.keys(object).forEach(function (val) {
                ret[val] = object[val];
            });
        }
        return ret;
    },

    check_err: function (err) {
        if (err) {
            var msg;

            if (err instanceof Error) {
                msg = err;
            } else if (err.msg) {
                msg = err.msg;
            } else {
                msg = util.inspect(err);
            }

            throw new Error(msg);
        }
    }
};
